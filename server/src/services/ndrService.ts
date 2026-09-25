import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { orders, ndrEvents, trackingEvents } from "../db/schema.js";
import { serializeOrder } from "../utils/orderSerializer.js";
import { fetchCourierNames, fetchPickupAddresses, fetchSellers } from "../utils/orderRelations.js";
import { buildAdminOrderWhere, type AdminOrderFilters } from "./orderQuery.js";
import { dispatchWebhookEvent } from "./webhook.js";
import { buildOrderEventData } from "./webhookEvents.js";
import { createProvider, resolveAccountForOrder, providerOrderType } from "./providers/index.js";
import { AppError } from "../utils/AppError.js";
import logger from "../config/logger.js";
import type { AnyColumn, SQL } from "drizzle-orm";

const TAG = "[NdrService]";

// NDR actions inlined from old models/NdrEvent.ts.
export const NDR_ACTIONS = ["reattempt", "rto", "reschedule"] as const;
export type NdrAction = (typeof NDR_ACTIONS)[number];

export type Order = typeof orders.$inferSelect;

export class NdrError extends AppError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = "NdrError";
  }
}

// `ndrAttemptedAt` and `orderAmount` aren't columns on this schema — the first
// lives in the metadata bag, the second is `declared_value`. Map both to real
// SQL so the NDR table's sorters actually sort.
const ORDER_SORTABLE: Record<string, SQL | AnyColumn> = {
  createdAt: orders.createdAt,
  updatedAt: orders.updatedAt,
  orderAmount: orders.declaredValue,
  // The regex guard keeps a non-ISO value in the bag from erroring the cast.
  ndrAttemptedAt: sql`coalesce(
    case when ${orders.metadata}->>'ndrAttemptedAt' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
      then (${orders.metadata}->>'ndrAttemptedAt')::timestamptz end,
    ${orders.updatedAt}
  )`,
};

/**
 * Record an NDR event (from admin or webhook).
 */
export async function recordNdr(params: {
  orderId: string;
  userId: string;
  reason: string;
  remarks?: string;
  location?: string;
  attemptDate?: string;
  nextAction?: NdrAction;
  source?: "admin" | "webhook" | "system";
}): Promise<void> {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, params.orderId) });
  if (!order) throw new NdrError(404, "Order not found");

  const attempt = params.attemptDate ? new Date(params.attemptDate) : new Date();

  // Update order — stash ndrReason / ndrAttemptedAt / ndrNextAction in metadata
  // (top-level columns don't exist on the new schema).
  const mergedMetadata = {
    ...((order.metadata as Record<string, unknown> | null) ?? {}),
    ndrReason: params.reason,
    ndrAttemptedAt: attempt.toISOString(),
    ndrNextAction: params.nextAction,
  };

  await db
    .update(orders)
    .set({ status: "ndr", metadata: mergedMetadata, updatedAt: new Date() })
    .where(eq(orders.id, order.id));

  // Count previous NDR events
  const [{ value: prevCount }] = await db
    .select({ value: count() })
    .from(ndrEvents)
    .where(eq(ndrEvents.orderId, order.id));

  // Create NDR event
  await db.insert(ndrEvents).values({
    orderId: order.id,
    userId: order.userId,
    awb: order.awb,
    status: "ndr",
    reason: params.reason,
    remarks: params.remarks,
    nextAction: params.nextAction,
    location: params.location,
    attemptDate: attempt,
    attemptCount: prevCount + 1,
    source: params.source || "admin",
  });

  // Log tracking event
  await db.insert(trackingEvents).values({
    orderId: order.id,
    userId: order.userId,
    awb: order.awb,
    statusCode: "ndr",
    statusText: `NDR - ${params.reason}`,
    location: params.location,
    remarks: params.remarks,
    source: params.source || "admin",
  });

  // Dispatch webhook
  dispatchWebhookEvent(
    order.userId,
    "order.ndr",
    buildOrderEventData(order, {
      status: "ndr",
      previousStatus: order.status,
      location: params.location,
      remark: params.remarks,
      eventTimestamp: attempt,
      ndr: { reason: params.reason, attemptCount: prevCount + 1, nextAction: params.nextAction },
    }),
  );

  logger.info(`${TAG} NDR recorded for AWB=${order.awb}: ${params.reason}`);
}

/**
 * Take action on an NDR (reattempt, RTO, reschedule).
 * Calls courier API if available.
 */
export async function takeNdrAction(params: {
  orderId: string;
  action: NdrAction;
  remarks?: string;
  rescheduledDate?: string;
  updatedPhone?: string;
  updatedAddress?: string;
}): Promise<void> {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, params.orderId) });
  if (!order) throw new NdrError(404, "Order not found");
  if (order.status !== "ndr") {
    throw new NdrError(400, `Cannot take NDR action on order in "${order.status}" status`);
  }

  // Call courier API via the account this order was shipped through
  const account = await resolveAccountForOrder(order);
  // Use the same B2B/B2C provider the order was booked through.
  const provider = account ? createProvider(account, providerOrderType(order.orderType)) : null;
  if (provider) {
    const result = await provider.ndrAction(order.awb ?? "", {
      action: params.action,
      rescheduledDate: params.rescheduledDate,
      updatedPhone: params.updatedPhone,
      updatedAddress: params.updatedAddress,
    });
    if (!result.success) {
      logger.warn(`${TAG} Courier NDR API failed for AWB=${order.awb} (${account?.name}): ${result.error}`);
    }
  } else {
    logger.info(`${TAG} No provider for order "${order.id}" (slug=${order.serviceProvider}) — skipping NDR API`);
  }

  // Update latest NDR event with action — pick the most recent NDR row for this order.
  const latestNdr = await db.query.ndrEvents.findFirst({
    where: eq(ndrEvents.orderId, order.id),
    orderBy: desc(ndrEvents.createdAt),
  });
  if (latestNdr) {
    await db
      .update(ndrEvents)
      .set({
        actionTaken: params.action,
        actionTakenAt: new Date(),
        actionResult: params.remarks || `Action: ${params.action}`,
      })
      .where(eq(ndrEvents.id, latestNdr.id));
  }

  // If RTO action, update order status
  const currentMetadata = (order.metadata as Record<string, unknown> | null) ?? {};
  if (params.action === "rto") {
    const rtoInitiatedAt = new Date();
    const [rtoOrder] = await db
      .update(orders)
      .set({
        status: "rto_initiated",
        metadata: { ...currentMetadata, rtoStatus: "initiated", ndrNextAction: "rto" },
        updatedAt: rtoInitiatedAt,
      })
      .where(eq(orders.id, order.id))
      .returning();

    // The status change is what the seller's system needs to see; before this
    // an NDR-driven RTO only ever showed up in the panel.
    await db.insert(trackingEvents).values({
      orderId: order.id,
      userId: order.userId,
      awb: order.awb,
      statusCode: "rto_initiated",
      statusText: "RTO Initiated",
      remarks: params.remarks || "RTO requested against NDR",
      source: "system",
    });

    dispatchWebhookEvent(
      order.userId,
      "order.rto_initiated",
      buildOrderEventData(rtoOrder ?? order, {
        status: "rto_initiated",
        previousStatus: "ndr",
        remark: params.remarks,
        eventTimestamp: rtoInitiatedAt,
        ndr: {
          reason: (currentMetadata.ndrReason as string | undefined) ?? null,
          nextAction: "rto",
        },
      }),
    );
  } else {
    await db
      .update(orders)
      .set({
        metadata: { ...currentMetadata, ndrNextAction: params.action },
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));
  }

  logger.info(`${TAG} NDR action "${params.action}" taken for AWB=${order.awb}`);
}

/**
 * List NDR orders for admin panel.
 *
 * Rows go through `serializeOrder` so the frontend gets `orderAmount`,
 * `ndrAttemptedAt` & friends — a raw `orders` row has none of them (they are
 * `declared_value` and the metadata bag), which is what rendered "₹NaN" and
 * "—" in the NDR table. The latest `ndr_events` row is merged in as the
 * fallback source for orders whose metadata never got the NDR stamp.
 */
export async function listNdrOrders(params: {
  page?: number;
  limit?: number;
  /** Forced on the seller-facing route so a user only ever sees their own. */
  userId?: string;
  filters?: AdminOrderFilters;
  sort?: Record<string, 1 | -1>;
}): Promise<{ orders: Record<string, unknown>[]; total: number }> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const skip = (page - 1) * limit;

  // The date range on this screen means "NDR date", not "order created" — so
  // it's applied to the attempt timestamp below rather than handed to the
  // shared order-where builder. `status` is fixed by the screen itself.
  const { startDate, endDate, status: _status, ...rest } = params.filters ?? {};
  const conditions = [eq(orders.status, "ndr")];

  const base = buildAdminOrderWhere(
    { ...rest, userId: params.userId ?? rest.userId },
    { extraSearch: (q) => [sql`(${orders.metadata}->>'ndrReason') ILIKE ${q}`] },
  );
  if (base) conditions.push(base);

  const attemptedAt = ORDER_SORTABLE.ndrAttemptedAt;
  if (startDate) conditions.push(sql`${attemptedAt} >= ${new Date(startDate)}`);
  if (endDate) conditions.push(sql`${attemptedAt} <= ${new Date(endDate)}`);

  const whereClause = and(...conditions);

  const sortEntries = params.sort ? Object.entries(params.sort) : [["ndrAttemptedAt", -1] as [string, 1 | -1]];
  const [sortField, sortDir] = sortEntries[0];
  const sortCol = ORDER_SORTABLE[sortField] ?? orders.updatedAt;
  // NULLS LAST so unpriced / unstamped orders sink instead of topping a desc sort.
  const orderByClause = sortDir === 1 ? sql`${sortCol} asc nulls last` : sql`${sortCol} desc nulls last`;

  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(whereClause)
      .orderBy(orderByClause)
      .offset(skip)
      .limit(limit),
    db
      .select({ value: count() })
      .from(orders)
      .where(whereClause)
      .then((r) => r[0]?.value ?? 0),
  ]);

  return { orders: await decorateNdrOrders(rows), total: totalRow };
}

/**
 * Serialize a page of NDR orders and fill in the columns the table needs:
 * the renamable courier name, the seller, the pickup (return) address, and the
 * NDR attempt/reason/location/count taken from the latest `ndr_events` row when
 * the order metadata doesn't carry them.
 */
async function decorateNdrOrders(rows: Order[]): Promise<Record<string, unknown>[]> {
  if (rows.length === 0) return [];

  const [courierNameById, pickupById, sellerById, eventRows] = await Promise.all([
    fetchCourierNames(rows),
    fetchPickupAddresses(rows),
    fetchSellers(rows),
    db
      .select({
        orderId: ndrEvents.orderId,
        reason: ndrEvents.reason,
        remarks: ndrEvents.remarks,
        location: ndrEvents.location,
        attemptDate: ndrEvents.attemptDate,
        attemptCount: ndrEvents.attemptCount,
      })
      .from(ndrEvents)
      .where(inArray(ndrEvents.orderId, rows.map((r) => r.id)))
      .orderBy(desc(ndrEvents.attemptDate), desc(ndrEvents.createdAt)),
  ]);

  const latestEventByOrder = new Map<string, (typeof eventRows)[number]>();
  const eventCountByOrder = new Map<string, number>();
  for (const ev of eventRows) {
    if (!latestEventByOrder.has(ev.orderId)) latestEventByOrder.set(ev.orderId, ev);
    eventCountByOrder.set(ev.orderId, (eventCountByOrder.get(ev.orderId) ?? 0) + 1);
  }

  return rows.map((row) => {
    const serialized = serializeOrder(row);
    const ev = latestEventByOrder.get(row.id);
    return {
      ...serialized,
      courierName: row.courierId ? courierNameById.get(row.courierId) ?? null : null,
      user: sellerById.get(row.userId) ?? null,
      pickupAddress: row.pickupAddressId ? pickupById.get(row.pickupAddressId) ?? null : null,
      ndrAttemptedAt:
        serialized.ndrAttemptedAt ?? ev?.attemptDate?.toISOString() ?? row.updatedAt.toISOString(),
      ndrReason: serialized.ndrReason ?? ev?.reason ?? null,
      ndrRemarks: ev?.remarks ?? null,
      ndrLocation: ev?.location ?? null,
      // Webhook-created NDR events don't stamp attemptCount, so count the rows.
      ndrAttemptCount: ev?.attemptCount ?? eventCountByOrder.get(row.id) ?? null,
    };
  });
}
