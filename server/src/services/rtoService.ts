import { and, desc, gte, inArray, lte, sql, count } from "drizzle-orm";
import type { AnyColumn, SQL } from "drizzle-orm";
import { db } from "../config/db.js";
import { orders, rtoEvents } from "../db/schema.js";
import { AppError } from "../utils/AppError.js";
import { serializeOrder } from "../utils/orderSerializer.js";
import { fetchCourierNames, fetchPickupAddresses, fetchSellers } from "../utils/orderRelations.js";
import { buildAdminOrderWhere, type AdminOrderFilters } from "./orderQuery.js";

// RTO phase enum (inlined from old models/RtoEvent.ts).
export const RTO_PHASES = ["initiated", "in_transit", "delivered"] as const;
export type RtoPhase = (typeof RTO_PHASES)[number];

export type Order = typeof orders.$inferSelect;

export class RtoError extends AppError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = "RtoError";
  }
}

// `orderAmount` is the `declared_value` column — without this mapping the
// Amount sorter silently fell back to updatedAt.
const ORDER_SORTABLE: Record<string, SQL | AnyColumn> = {
  createdAt: orders.createdAt,
  updatedAt: orders.updatedAt,
  orderAmount: orders.declaredValue,
};

/** Derive the RTO phase from the order status when metadata never recorded it. */
const PHASE_BY_STATUS: Record<string, RtoPhase> = {
  rto_initiated: "initiated",
  rto_in_transit: "in_transit",
  rto_delivered: "delivered",
};

/**
 * List RTO orders for admin panel.
 *
 * Rows are serialized so the frontend sees `orderAmount` / `rtoStatus` rather
 * than the raw `declared_value` + metadata bag.
 */
export async function listRtoOrders(params: {
  page?: number;
  limit?: number;
  rtoPhase?: RtoPhase;
  /** Forced on the seller-facing route so a user only ever sees their own. */
  userId?: string;
  filters?: AdminOrderFilters;
  sort?: Record<string, 1 | -1>;
}): Promise<{ orders: Record<string, unknown>[]; total: number }> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const skip = (page - 1) * limit;

  // The date range on this screen means "RTO updated", not "order created", so
  // it lands on updatedAt rather than going to the shared where-builder.
  const { startDate, endDate, status: _status, ...rest } = params.filters ?? {};

  const conditions = [
    inArray(orders.status, ["rto_initiated", "rto_in_transit", "rto_delivered"]),
  ];

  const base = buildAdminOrderWhere(
    { ...rest, userId: params.userId ?? rest.userId },
    { extraSearch: (q) => [sql`(${orders.metadata}->>'rtoRemarks') ILIKE ${q}`] },
  );
  if (base) conditions.push(base);

  // rtoStatus / rtoPhase isn't a top-level column on the new schema; it lives in
  // metadata. Orders that reached an RTO status without a metadata stamp fall
  // back to the phase implied by their status, so the filter can't hide them.
  if (params.rtoPhase) {
    conditions.push(sql`coalesce(
      ${orders.metadata}->>'rtoStatus',
      case ${orders.status}
        when 'rto_initiated' then 'initiated'
        when 'rto_in_transit' then 'in_transit'
        when 'rto_delivered' then 'delivered'
      end
    ) = ${params.rtoPhase}`);
  }

  if (startDate) conditions.push(gte(orders.updatedAt, new Date(startDate)));
  if (endDate) conditions.push(lte(orders.updatedAt, new Date(endDate)));

  const whereClause = and(...conditions);

  // Resolve sort
  const sortEntries = params.sort ? Object.entries(params.sort) : [["updatedAt", -1] as [string, 1 | -1]];
  const [sortField, sortDir] = sortEntries[0];
  const sortCol = ORDER_SORTABLE[sortField] ?? orders.updatedAt;
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

  if (rows.length === 0) return { orders: [], total: totalRow };

  const [courierNameById, pickupById, sellerById, eventRows] = await Promise.all([
    fetchCourierNames(rows),
    fetchPickupAddresses(rows),
    fetchSellers(rows),
    db
      .select({
        orderId: rtoEvents.orderId,
        phase: rtoEvents.phase,
        reason: rtoEvents.reason,
        remarks: rtoEvents.remarks,
        rtoCharges: rtoEvents.rtoCharges,
        createdAt: rtoEvents.createdAt,
      })
      .from(rtoEvents)
      .where(inArray(rtoEvents.orderId, rows.map((r) => r.id)))
      .orderBy(desc(rtoEvents.createdAt)),
  ]);

  const latestEventByOrder = new Map<string, (typeof eventRows)[number]>();
  for (const ev of eventRows) {
    if (!latestEventByOrder.has(ev.orderId)) latestEventByOrder.set(ev.orderId, ev);
  }

  const shaped = rows.map((row) => {
    const serialized = serializeOrder(row);
    const ev = latestEventByOrder.get(row.id);
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    return {
      ...serialized,
      courierName: row.courierId ? courierNameById.get(row.courierId) ?? null : null,
      user: sellerById.get(row.userId) ?? null,
      // Where the shipment is heading back to: the order's RTO address if it
      // carries one, else the pickup location it shipped from.
      pickupAddress: row.pickupAddressId ? pickupById.get(row.pickupAddressId) ?? null : null,
      rtoStatus: serialized.rtoStatus ?? ev?.phase ?? PHASE_BY_STATUS[row.status] ?? null,
      // The reason a parcel comes back is the NDR that preceded it, unless an
      // admin recorded something more specific on the RTO itself.
      rtoReason: ev?.reason ?? serialized.rtoRemarks ?? meta.ndrReason ?? null,
      rtoRemarks: serialized.rtoRemarks ?? ev?.remarks ?? null,
      rtoCharges: ev?.rtoCharges != null ? Number(ev.rtoCharges) : null,
      rtoUpdatedAt: ev?.createdAt?.toISOString() ?? row.updatedAt.toISOString(),
    };
  });

  return { orders: shaped, total: totalRow };
}
