import type { Request, Response } from "express";
import { and, count, desc, eq, gte, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "../config/db.js";
import { users, webhooks, webhookDeliveries } from "../db/schema.js";
import { WEBHOOK_EVENT_CATALOGUE, WEBHOOK_PING_EVENT } from "../services/webhookEvents.js";
import { scheduleRedelivery, WebhookConfigError } from "../services/webhook.js";
import { parseQuery, QType } from "../utils/parseQuery.js";
import logger from "../config/logger.js";

/**
 * Admin-side visibility into outbound webhooks.
 *
 * Support answers three questions here, in this order: is delivery healthy
 * right now, which sellers are affected, and what exactly did we send and get
 * back. Each endpoint below maps to one of those.
 */

const TAG = "[AdminWebhookAPI]";

const DELIVERY_STATUSES = ["pending", "retrying", "success", "failed"] as const;
const KNOWN_EVENTS = [...WEBHOOK_EVENT_CATALOGUE.map((e) => e.event), WEBHOOK_PING_EVENT] as string[];

/** Columns of the seller behind an endpoint or a delivery. */
const sellerColumns = {
  sellerId: users.id,
  sellerName: users.name,
  sellerBusinessName: users.businessName,
  sellerEmail: users.email,
};

interface SellerFields {
  sellerId: string | null;
  sellerName: string | null;
  sellerBusinessName: string | null;
  sellerEmail: string | null;
}

/** Fold the flat seller columns into a nested object the UI can render directly. */
function withSeller<T extends SellerFields>(row: T) {
  const { sellerId, sellerName, sellerBusinessName, sellerEmail, ...rest } = row;
  return {
    ...rest,
    seller: sellerId
      ? {
          id: sellerId,
          // Business name is what support recognises; fall back to the personal
          // name, then the email, so a row is never labelled "—".
          name: sellerBusinessName || sellerName || sellerEmail || "Unknown seller",
          email: sellerEmail,
        }
      : null,
  };
}

function fail(res: Response, status: number, error: string): void {
  res.status(status).json({ success: false, error });
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

/* ────────────────────────────── Health ─────────────────────────────────── */

/**
 * GET /admin/webhooks/health?hours=24
 *
 * The at-a-glance answer to "is anything broken". Everything here is scoped to
 * a rolling window so a burst of failures last week doesn't hide a healthy today.
 */
export async function handleWebhookHealth(req: Request, res: Response) {
  const { hours } = parseQuery(req, { hours: QType.NUMBER });
  const windowHours = Math.min(720, Math.max(1, hours ?? 24));
  const since = hoursAgo(windowHours);

  const [statusRows, endpointRows, errorRows, failingRows] = await Promise.all([
    db
      .select({ status: webhookDeliveries.status, value: count() })
      .from(webhookDeliveries)
      .where(gte(webhookDeliveries.createdAt, since))
      .groupBy(webhookDeliveries.status),

    db
      .select({ isActive: webhooks.isActive, value: count() })
      .from(webhooks)
      .groupBy(webhooks.isActive),

    // Most common failure reasons — what to fix first.
    db
      .select({ error: webhookDeliveries.error, value: count() })
      .from(webhookDeliveries)
      .where(
        and(
          gte(webhookDeliveries.createdAt, since),
          inArray(webhookDeliveries.status, ["failed", "pending"]),
          sql`${webhookDeliveries.error} IS NOT NULL`,
        ),
      )
      .groupBy(webhookDeliveries.error)
      .orderBy(desc(count()))
      .limit(5),

    // Endpoints with at least one non-delivered attempt in the window.
    db
      .select({
        webhookId: webhookDeliveries.webhookId,
        url: webhookDeliveries.url,
        failed: count(),
        lastFailedAt: sql<string>`max(${webhookDeliveries.updatedAt})`,
        lastError: sql<string | null>`(array_agg(${webhookDeliveries.error} ORDER BY ${webhookDeliveries.updatedAt} DESC))[1]`,
        lastResponseStatus: sql<number | null>`(array_agg(${webhookDeliveries.responseStatus} ORDER BY ${webhookDeliveries.updatedAt} DESC))[1]`,
        ...sellerColumns,
      })
      .from(webhookDeliveries)
      .innerJoin(users, eq(users.id, webhookDeliveries.userId))
      .where(
        and(
          gte(webhookDeliveries.createdAt, since),
          inArray(webhookDeliveries.status, ["failed", "pending"]),
        ),
      )
      .groupBy(webhookDeliveries.webhookId, webhookDeliveries.url, users.id)
      .orderBy(desc(count()))
      .limit(20),
  ]);

  const byStatus: Record<string, number> = {};
  for (const row of statusRows) byStatus[row.status] = Number(row.value);

  const delivered = byStatus.success ?? 0;
  const failed = byStatus.failed ?? 0;
  const pending = (byStatus.pending ?? 0) + (byStatus.retrying ?? 0);
  const total = delivered + failed + pending;

  const active = Number(endpointRows.find((r) => r.isActive)?.value ?? 0);
  const paused = Number(endpointRows.find((r) => !r.isActive)?.value ?? 0);

  res.json({
    success: true,
    windowHours,
    totals: {
      total,
      delivered,
      failed,
      pending,
      // Retries mean a delivery can be counted before it settles, so the rate
      // is over settled deliveries only — otherwise a healthy system with a
      // full retry queue looks like it is failing.
      successRate: delivered + failed > 0 ? Math.round((delivered / (delivered + failed)) * 1000) / 10 : null,
    },
    endpoints: {
      total: active + paused,
      active,
      paused,
      failing: failingRows.length,
    },
    topErrors: errorRows.map((r) => ({ error: r.error, count: Number(r.value) })),
    failingEndpoints: failingRows.map((r) =>
      withSeller({ ...r, failed: Number(r.failed) }),
    ),
  });
}

/* ───────────────────────────── Endpoints ───────────────────────────────── */

/**
 * GET /admin/webhooks/endpoints
 * Query: search, userId, isActive, page, limit
 *
 * The registry, annotated with each endpoint's recent delivery record so an
 * admin can spot a broken integration without opening every row.
 */
export async function handleAdminListEndpoints(req: Request, res: Response) {
  const { search, userId, isActive, page, limit, hours } = parseQuery(req, {
    search: QType.STRING,
    userId: QType.STRING,
    isActive: QType.BOOLEAN,
    page: QType.NUMBER,
    limit: QType.NUMBER,
    hours: QType.NUMBER,
  });

  const currentPage = Math.max(1, page ?? 1);
  const pageSize = Math.min(100, Math.max(1, limit ?? 20));
  const windowHours = Math.min(720, Math.max(1, hours ?? 24));
  const since = hoursAgo(windowHours);

  const conditions: SQL[] = [];
  if (userId) conditions.push(eq(webhooks.userId, userId));
  if (isActive !== undefined) conditions.push(eq(webhooks.isActive, isActive));
  if (search) {
    const q = `%${search.trim()}%`;
    const clause = or(
      sql`${webhooks.url} ILIKE ${q}`,
      sql`${users.name} ILIKE ${q}`,
      sql`${users.businessName} ILIKE ${q}`,
      sql`${users.email} ILIKE ${q}`,
    );
    if (clause) conditions.push(clause);
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [totalRow, rows] = await Promise.all([
    db.select({ value: count() }).from(webhooks).innerJoin(users, eq(users.id, webhooks.userId)).where(where),
    db
      .select({
        id: webhooks.id,
        url: webhooks.url,
        isActive: webhooks.isActive,
        description: webhooks.description,
        createdAt: webhooks.createdAt,
        updatedAt: webhooks.updatedAt,
        ...sellerColumns,
      })
      .from(webhooks)
      .innerJoin(users, eq(users.id, webhooks.userId))
      .where(where)
      .orderBy(desc(webhooks.createdAt))
      .offset((currentPage - 1) * pageSize)
      .limit(pageSize),
  ]);

  // One aggregate pass for the endpoints on this page only.
  const ids = rows.map((r) => r.id);
  const statsById = new Map<
    string,
    { delivered: number; failed: number; pending: number; lastDeliveryAt: string | null; lastStatus: string | null; lastError: string | null }
  >();

  if (ids.length > 0) {
    const statRows = await db
      .select({
        webhookId: webhookDeliveries.webhookId,
        delivered: sql<number>`count(*) FILTER (WHERE ${webhookDeliveries.status} = 'success')`,
        failed: sql<number>`count(*) FILTER (WHERE ${webhookDeliveries.status} = 'failed')`,
        pending: sql<number>`count(*) FILTER (WHERE ${webhookDeliveries.status} IN ('pending','retrying'))`,
        lastDeliveryAt: sql<string | null>`max(${webhookDeliveries.createdAt})`,
        lastStatus: sql<string | null>`(array_agg(${webhookDeliveries.status} ORDER BY ${webhookDeliveries.createdAt} DESC))[1]`,
        lastError: sql<string | null>`(array_agg(${webhookDeliveries.error} ORDER BY ${webhookDeliveries.createdAt} DESC))[1]`,
      })
      .from(webhookDeliveries)
      .where(and(inArray(webhookDeliveries.webhookId, ids), gte(webhookDeliveries.createdAt, since)))
      .groupBy(webhookDeliveries.webhookId);

    for (const s of statRows) {
      statsById.set(s.webhookId, {
        delivered: Number(s.delivered),
        failed: Number(s.failed),
        pending: Number(s.pending),
        lastDeliveryAt: s.lastDeliveryAt,
        lastStatus: s.lastStatus,
        lastError: s.lastError,
      });
    }
  }

  const total = totalRow[0]?.value ?? 0;

  res.json({
    success: true,
    windowHours,
    endpoints: rows.map((row) => ({
      ...withSeller(row),
      stats:
        statsById.get(row.id) ??
        { delivered: 0, failed: 0, pending: 0, lastDeliveryAt: null, lastStatus: null, lastError: null },
    })),
    pagination: { page: currentPage, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

/**
 * PATCH /admin/webhooks/endpoints/:id — pause or resume an endpoint.
 *
 * Support's escape hatch when a seller's endpoint is hard-down and every event
 * is burning five attempts. Pausing keeps the endpoint and its history.
 */
export async function handleAdminToggleEndpoint(req: Request, res: Response) {
  if (typeof req.body?.isActive !== "boolean") {
    return fail(res, 400, "isActive must be a boolean");
  }

  const [webhook] = await db
    .update(webhooks)
    .set({ isActive: req.body.isActive, updatedAt: new Date() })
    .where(eq(webhooks.id, req.params.id))
    .returning({ id: webhooks.id, url: webhooks.url, isActive: webhooks.isActive });

  if (!webhook) return fail(res, 404, "Webhook not found");

  logger.info(
    `${TAG} Endpoint ${webhook.isActive ? "resumed" : "paused"} by admin ${req.userId} — ${webhook.url}`,
  );
  res.json({ success: true, webhook });
}

/* ───────────────────────────── Deliveries ──────────────────────────────── */

function buildDeliveryConditions(req: Request): { where: SQL | undefined; error?: string } {
  const { userId, webhookId, status, event, search, from, to } = parseQuery(req, {
    userId: QType.STRING,
    webhookId: QType.STRING,
    status: QType.STRING,
    event: QType.STRING,
    search: QType.STRING,
    from: QType.STRING,
    to: QType.STRING,
  });

  const conditions: SQL[] = [];
  if (userId) conditions.push(eq(webhookDeliveries.userId, userId));
  if (webhookId) conditions.push(eq(webhookDeliveries.webhookId, webhookId));

  if (status) {
    if (!(DELIVERY_STATUSES as readonly string[]).includes(status)) {
      return { where: undefined, error: `status must be one of: ${DELIVERY_STATUSES.join(", ")}` };
    }
    conditions.push(eq(webhookDeliveries.status, status));
  }

  if (event) {
    if (!KNOWN_EVENTS.includes(event)) {
      return { where: undefined, error: `Unknown event "${event}"` };
    }
    conditions.push(eq(webhookDeliveries.event, event));
  }

  if (from) {
    const start = new Date(from);
    if (!Number.isNaN(start.getTime())) conditions.push(gte(webhookDeliveries.createdAt, start));
  }
  if (to) {
    const end = new Date(to);
    if (!Number.isNaN(end.getTime())) conditions.push(lte(webhookDeliveries.createdAt, end));
  }

  if (search) {
    const q = `%${search.trim()}%`;
    // Reaching into the stored envelope means support can search by the
    // seller's own order reference or the AWB, which is how a ticket arrives.
    const clause = or(
      sql`${webhookDeliveries.url} ILIKE ${q}`,
      sql`${webhookDeliveries.event} ILIKE ${q}`,
      sql`${webhookDeliveries.error} ILIKE ${q}`,
      sql`${webhookDeliveries.payload}->'data'->>'order_id' ILIKE ${q}`,
      sql`${webhookDeliveries.payload}->'data'->>'awb' ILIKE ${q}`,
      sql`${webhookDeliveries.payload}->>'id' ILIKE ${q}`,
    );
    if (clause) conditions.push(clause);
  }

  return { where: conditions.length ? and(...conditions) : undefined };
}

/**
 * GET /admin/webhooks/deliveries
 * Query: userId, webhookId, status, event, search, from, to, page, limit
 *
 * `stats` is computed over the same filters minus pagination, so the counts
 * describe the whole filtered set rather than the page on screen.
 */
export async function handleAdminListDeliveries(req: Request, res: Response) {
  const { where, error } = buildDeliveryConditions(req);
  if (error) return fail(res, 400, error);

  const { page, limit } = parseQuery(req, { page: QType.NUMBER, limit: QType.NUMBER });
  const currentPage = Math.max(1, page ?? 1);
  const pageSize = Math.min(100, Math.max(1, limit ?? 25));

  const [totalRow, statusRows, rows] = await Promise.all([
    db.select({ value: count() }).from(webhookDeliveries).where(where),
    db
      .select({ status: webhookDeliveries.status, value: count() })
      .from(webhookDeliveries)
      .where(where)
      .groupBy(webhookDeliveries.status),
    db
      .select({
        id: webhookDeliveries.id,
        webhookId: webhookDeliveries.webhookId,
        event: webhookDeliveries.event,
        url: webhookDeliveries.url,
        status: webhookDeliveries.status,
        attempts: webhookDeliveries.attempts,
        responseStatus: webhookDeliveries.responseStatus,
        error: webhookDeliveries.error,
        nextRetryAt: webhookDeliveries.nextRetryAt,
        createdAt: webhookDeliveries.createdAt,
        updatedAt: webhookDeliveries.updatedAt,
        // Enough of the payload to identify the shipment in the list, without
        // shipping every envelope over the wire.
        orderId: sql<string | null>`${webhookDeliveries.payload}->'data'->>'order_id'`,
        awb: sql<string | null>`${webhookDeliveries.payload}->'data'->>'awb'`,
        eventId: sql<string | null>`${webhookDeliveries.payload}->>'id'`,
        ...sellerColumns,
      })
      .from(webhookDeliveries)
      .innerJoin(users, eq(users.id, webhookDeliveries.userId))
      .where(where)
      .orderBy(desc(webhookDeliveries.createdAt))
      .offset((currentPage - 1) * pageSize)
      .limit(pageSize),
  ]);

  const byStatus: Record<string, number> = {};
  for (const row of statusRows) byStatus[row.status] = Number(row.value);
  const total = totalRow[0]?.value ?? 0;

  res.json({
    success: true,
    deliveries: rows.map(withSeller),
    stats: {
      delivered: byStatus.success ?? 0,
      failed: byStatus.failed ?? 0,
      pending: byStatus.pending ?? 0,
      retrying: byStatus.retrying ?? 0,
    },
    pagination: { page: currentPage, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

/**
 * GET /admin/webhooks/deliveries/:id — everything about one attempt.
 *
 * This is the screen support opens from a ticket: the exact body we POSTed,
 * the exact response we got, and which endpoint it belongs to.
 */
export async function handleAdminGetDelivery(req: Request, res: Response) {
  const [row] = await db
    .select({
      delivery: webhookDeliveries,
      endpoint: {
        id: webhooks.id,
        url: webhooks.url,
        isActive: webhooks.isActive,
        description: webhooks.description,
      },
      ...sellerColumns,
    })
    .from(webhookDeliveries)
    .innerJoin(users, eq(users.id, webhookDeliveries.userId))
    .leftJoin(webhooks, eq(webhooks.id, webhookDeliveries.webhookId))
    .where(eq(webhookDeliveries.id, req.params.id));

  if (!row) return fail(res, 404, "Delivery not found");

  const { delivery, endpoint, ...seller } = row;
  res.json({
    success: true,
    delivery: {
      ...delivery,
      // Signing secrets never leave the seller's own API surface.
      endpoint: endpoint?.id ? endpoint : null,
      ...withSeller({ ...seller }),
    },
  });
}

/**
 * POST /admin/webhooks/deliveries/:id/redeliver — replay on the seller's behalf.
 */
export async function handleAdminRedeliver(req: Request, res: Response) {
  const [row] = await db
    .select({ userId: webhookDeliveries.userId })
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.id, req.params.id));
  if (!row) return fail(res, 404, "Delivery not found");

  try {
    await scheduleRedelivery(req.params.id, row.userId);
  } catch (err) {
    if (err instanceof WebhookConfigError) return fail(res, err.status, err.message);
    throw err;
  }

  logger.info(`${TAG} Delivery ${req.params.id} queued for redelivery by admin ${req.userId}`);
  res.status(202).json({ success: true, message: "Redelivery queued — it will be attempted within a minute" });
}

/**
 * GET /admin/webhooks/events — catalogue, for populating filter dropdowns.
 */
export async function handleAdminListEvents(_req: Request, res: Response) {
  res.json({ success: true, events: WEBHOOK_EVENT_CATALOGUE });
}
