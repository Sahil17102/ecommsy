import type { Request, Response } from "express";
import { and, desc, eq, count } from "drizzle-orm";
import { db } from "../config/db.js";
import { webhooks, webhookDeliveries } from "../db/schema.js";
import {
  WEBHOOK_API_VERSION,
  WEBHOOK_EVENTS,
  WEBHOOK_EVENT_CATALOGUE,
  WebhookConfigError,
  allWebhookEvents,
  assertDeliverableUrl,
  generateSecret,
  scheduleRedelivery,
  sendTestWebhook,
} from "../services/webhook.js";
import logger from "../config/logger.js";

const TAG = "[WebhookAPI]";

/** A seller cannot register more endpoints than this. */
const MAX_ENDPOINTS_PER_USER = 5;

const DELIVERY_STATUSES = ["pending", "retrying", "success", "failed"] as const;

type WebhookRow = typeof webhooks.$inferSelect;

/** Postgres unique-violation — the (user_id, url) index on `webhooks`. */
function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === "23505";
}

function fail(res: Response, status: number, error: string): void {
  res.status(status).json({ success: false, error });
}

/**
 * Endpoint as returned to its owner. `secret` is only ever sent in full by
 * create and rotate-secret — everywhere else it is masked, so a leaked list
 * response can't be used to forge signatures.
 */
function present(webhook: WebhookRow, opts: { revealSecret?: boolean } = {}) {
  const secret = webhook.secret ?? "";
  return {
    id: webhook.id,
    url: webhook.url,
    isActive: webhook.isActive,
    description: webhook.description,
    secret: opts.revealSecret ? secret : maskSecret(secret),
    createdAt: webhook.createdAt,
    updatedAt: webhook.updatedAt,
  };
}

function maskSecret(secret: string): string {
  if (!secret) return "";
  return `whsec_${"•".repeat(8)}${secret.slice(-4)}`;
}

/**
 * GET /webhooks/events — reference list of the status changes that can arrive.
 *
 * Not a subscription menu: every endpoint receives all of these. It exists so
 * an integrator can enumerate the `event` values they need to handle.
 */
export async function handleListEvents(_req: Request, res: Response) {
  res.json({
    success: true,
    apiVersion: WEBHOOK_API_VERSION,
    events: WEBHOOK_EVENT_CATALOGUE,
  });
}

/**
 * GET /webhooks — List the caller's endpoints.
 */
export async function handleListWebhooks(req: Request, res: Response) {
  const list = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.userId, req.userId!))
    .orderBy(desc(webhooks.createdAt));

  res.json({ success: true, webhooks: list.map((w) => present(w)) });
}

/**
 * GET /webhooks/:id — One endpoint.
 */
export async function handleGetWebhook(req: Request, res: Response) {
  const webhook = await db.query.webhooks.findFirst({
    where: and(eq(webhooks.id, req.params.id), eq(webhooks.userId, req.userId!)),
  });
  if (!webhook) return fail(res, 404, "Webhook not found");
  res.json({ success: true, webhook: present(webhook) });
}

/**
 * POST /webhooks — Register an endpoint.
 * Body: { url, events[], description? }
 *
 * The signing secret is returned once here and never again in full; a seller
 * who loses it rotates rather than reads.
 */
export async function handleCreateWebhook(req: Request, res: Response) {
  let url: string;
  try {
    url = assertDeliverableUrl(req.body?.url);
  } catch (err) {
    if (err instanceof WebhookConfigError) return fail(res, err.status, err.message);
    throw err;
  }

  const [{ value: existing }] = await db
    .select({ value: count() })
    .from(webhooks)
    .where(eq(webhooks.userId, req.userId!));
  if (existing >= MAX_ENDPOINTS_PER_USER) {
    return fail(
      res,
      409,
      `Endpoint limit reached (${MAX_ENDPOINTS_PER_USER}). Delete an existing endpoint first.`,
    );
  }

  const description = typeof req.body?.description === "string" ? req.body.description.slice(0, 500) : null;

  try {
    const [webhook] = await db
      .insert(webhooks)
      .values({ userId: req.userId!, url, secret: generateSecret(), events: allWebhookEvents(), description })
      .returning();

    logger.info(`${TAG} Endpoint registered — ${url} (userId: ${req.userId})`);
    res.status(201).json({ success: true, webhook: present(webhook, { revealSecret: true }) });
  } catch (err) {
    if (isUniqueViolation(err)) return fail(res, 409, "An endpoint with this URL is already registered");
    throw err;
  }
}

/**
 * PATCH /webhooks/:id — Update url / events / isActive / description.
 */
export async function handleUpdateWebhook(req: Request, res: Response) {
  const existing = await db.query.webhooks.findFirst({
    where: and(eq(webhooks.id, req.params.id), eq(webhooks.userId, req.userId!)),
  });
  if (!existing) return fail(res, 404, "Webhook not found");

  const patch: Record<string, unknown> = {};
  try {
    if (req.body?.url !== undefined) patch.url = assertDeliverableUrl(req.body.url);
  } catch (err) {
    if (err instanceof WebhookConfigError) return fail(res, err.status, err.message);
    throw err;
  }

  if (req.body?.description !== undefined) {
    patch.description =
      typeof req.body.description === "string" ? req.body.description.slice(0, 500) : null;
  }
  if (req.body?.isActive !== undefined) {
    if (typeof req.body.isActive !== "boolean") return fail(res, 400, "isActive must be a boolean");
    patch.isActive = req.body.isActive;
  }

  if (Object.keys(patch).length === 0) {
    return fail(res, 400, "Nothing to update — send url, isActive or description");
  }
  patch.updatedAt = new Date();

  try {
    const [webhook] = await db
      .update(webhooks)
      .set(patch)
      .where(and(eq(webhooks.id, req.params.id), eq(webhooks.userId, req.userId!)))
      .returning();
    res.json({ success: true, webhook: present(webhook) });
  } catch (err) {
    if (isUniqueViolation(err)) return fail(res, 409, "An endpoint with this URL is already registered");
    throw err;
  }
}

/**
 * POST /webhooks/:id/rotate-secret — Issue a new signing secret.
 */
export async function handleRotateSecret(req: Request, res: Response) {
  const [webhook] = await db
    .update(webhooks)
    .set({ secret: generateSecret(), updatedAt: new Date() })
    .where(and(eq(webhooks.id, req.params.id), eq(webhooks.userId, req.userId!)))
    .returning();
  if (!webhook) return fail(res, 404, "Webhook not found");

  logger.info(`${TAG} Secret rotated for ${webhook.url} (userId: ${req.userId})`);
  res.json({ success: true, webhook: present(webhook, { revealSecret: true }) });
}

/**
 * DELETE /webhooks/:id — Remove an endpoint (its delivery log cascades away).
 */
export async function handleDeleteWebhook(req: Request, res: Response) {
  const result = await db
    .delete(webhooks)
    .where(and(eq(webhooks.id, req.params.id), eq(webhooks.userId, req.userId!)))
    .returning({ id: webhooks.id });
  if (result.length === 0) return fail(res, 404, "Webhook not found");
  res.json({ success: true });
}

/**
 * POST /webhooks/:id/test — Send a `webhook.ping` and report the result.
 */
export async function handleTestWebhook(req: Request, res: Response) {
  const requestedEvent = typeof req.body?.event === "string" ? req.body.event : undefined;

  let deliveryId: string;
  try {
    deliveryId = await sendTestWebhook(req.params.id, req.userId!, requestedEvent);
  } catch (err) {
    if (err instanceof WebhookConfigError) return fail(res, err.status, err.message);
    throw err;
  }

  const delivery = await db.query.webhookDeliveries.findFirst({
    where: eq(webhookDeliveries.id, deliveryId),
  });

  res.json({
    success: true,
    delivered: delivery?.status === "success",
    delivery,
  });
}

/**
 * GET /webhooks/deliveries — Delivery log across every endpoint.
 * GET /webhooks/:id/deliveries — Delivery log for one endpoint.
 *
 * Query: page, limit (max 100), status, event
 */
export async function handleListDeliveries(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  const conditions = [eq(webhookDeliveries.userId, req.userId!)];
  if (req.params.id) conditions.push(eq(webhookDeliveries.webhookId, req.params.id));

  const status = req.query.status;
  if (typeof status === "string" && status !== "") {
    if (!(DELIVERY_STATUSES as readonly string[]).includes(status)) {
      return fail(res, 400, `status must be one of: ${DELIVERY_STATUSES.join(", ")}`);
    }
    conditions.push(eq(webhookDeliveries.status, status));
  }

  const event = req.query.event;
  if (typeof event === "string" && event !== "") {
    if (!(WEBHOOK_EVENTS as readonly string[]).includes(event) && event !== "webhook.ping") {
      return fail(res, 400, `Unknown event "${event}"`);
    }
    conditions.push(eq(webhookDeliveries.event, event));
  }

  const whereClause = and(...conditions);

  const [totalRow, deliveries] = await Promise.all([
    db.select({ value: count() }).from(webhookDeliveries).where(whereClause),
    db
      .select()
      .from(webhookDeliveries)
      .where(whereClause)
      .orderBy(desc(webhookDeliveries.createdAt))
      .offset((page - 1) * limit)
      .limit(limit),
  ]);

  const total = totalRow[0]?.value ?? 0;

  res.json({
    success: true,
    deliveries,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

/**
 * POST /webhooks/deliveries/:deliveryId/redeliver — Re-send a past delivery.
 *
 * The redelivery is queued rather than sent inline: the retry worker owns every
 * attempt after the first, so there is exactly one place that talks to the
 * merchant's endpoint on a retry path.
 */
export async function handleRedeliver(req: Request, res: Response) {
  try {
    await scheduleRedelivery(req.params.deliveryId, req.userId!);
  } catch (err) {
    if (err instanceof WebhookConfigError) return fail(res, err.status, err.message);
    throw err;
  }
  res.status(202).json({ success: true, message: "Redelivery queued — it will be attempted within a minute" });
}
