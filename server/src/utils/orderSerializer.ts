import type { orders } from "../db/schema.js";

type OrderRow = typeof orders.$inferSelect;

/**
 * Convert a row from the `orders` table into the shape the existing frontend
 * (built against the old Mongo model) expects.
 *
 * The SQL schema reorganised several fields:
 *  - `rateSnapshot`     → `rate`
 *  - `paymentMode`      → `paymentType`
 *  - `declaredValue`    → `orderAmount` (Postgres numeric → JS number)
 *  - `codAmount`        → number (was a numeric string)
 *  - `items`            → `products`
 *  - `dimensions` JSONB → flat `length` / `breadth` / `height`
 *  - misc fields stashed in `metadata` (orderDate, chargeableWeight, rtoAddress,
 *    providerOrderId, preferredPickup*, B2B fields) → lifted to the top level
 *
 * `_id` is also exposed for frontends that haven't been switched to `id` yet.
 */
export function serializeOrder<T extends OrderRow & Record<string, unknown>>(row: T) {
  const {
    rateSnapshot,
    paymentMode,
    declaredValue,
    codAmount,
    items,
    dimensions,
    metadata,
    ...rest
  } = row;

  const dims = (dimensions ?? {}) as { length?: number; breadth?: number; height?: number };
  const meta = (metadata ?? {}) as Record<string, unknown>;

  return {
    ...rest,
    _id: row.id,
    rate: rateSnapshot ?? null,
    paymentType: paymentMode ?? null,
    orderAmount: declaredValue == null ? 0 : Number(declaredValue),
    codAmount: codAmount == null ? 0 : Number(codAmount),
    products: items ?? [],
    length: dims.length ?? null,
    breadth: dims.breadth ?? null,
    height: dims.height ?? null,
    // Lift commonly-read metadata fields so the old frontend doesn't need to
    // know about the metadata bag. The full bag is also exposed for anything
    // that wants the rest.
    orderDate: meta.orderDate ?? null,
    chargeableWeight: meta.chargeableWeight ?? null,
    providerOrderId: meta.providerOrderId ?? null,
    externalOrderId: meta.externalOrderId ?? null,
    source: meta.source ?? null,
    preferredPickupDate: meta.preferredPickupDate ?? null,
    preferredPickupTime: meta.preferredPickupTime ?? null,
    rtoAddress: meta.rtoAddress ?? null,
    shippedAt: meta.shippedAt ?? null,
    pickupRequestedAt: meta.pickupRequestedAt ?? null,
    // NDR / RTO live in the metadata bag too — the NDR and RTO screens read
    // them at the top level.
    ndrReason: meta.ndrReason ?? null,
    ndrAttemptedAt: meta.ndrAttemptedAt ?? null,
    ndrNextAction: meta.ndrNextAction ?? null,
    rtoStatus: meta.rtoStatus ?? null,
    rtoRemarks: meta.rtoRemarks ?? null,
    rtoReturnedAt: meta.rtoReturnedAt ?? null,
    codCollected: meta.codCollected ?? null,
    codCollectedAmount: meta.codCollectedAmount ?? null,
    companyName: meta.companyName ?? null,
    companyGst: meta.companyGst ?? null,
    packages: meta.packages ?? null,
    invoices: meta.invoices ?? null,
    chargesBreakdown: meta.chargesBreakdown ?? null,
    metadata: meta,
  };
}

export type SerializedOrder = ReturnType<typeof serializeOrder>;
