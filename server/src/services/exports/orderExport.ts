import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "../../config/db.js";
import { couriers, orders, users } from "../../db/schema.js";
import { buildAdminOrderWhere, type AdminOrderFilters } from "../orderQuery.js";
import logger from "../../config/logger.js";
import type { CsvColumn } from "./csv.js";

const TAG = "[Exports]";

/** A single batch should take a second or two — anything near this is wedged. */
const BATCH_TIMEOUT_MS = Number(process.env.EXPORT_BATCH_TIMEOUT_MS) || 120_000;

/**
 * Fail loudly instead of hanging forever. A dropped connection to Postgres can
 * leave a query pending indefinitely, which used to pin the job (and the
 * panel's progress bar) in "Building" with nothing to show for it.
 */
function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: NodeJS.Timeout;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Timed out after ${BATCH_TIMEOUT_MS / 1000}s waiting for ${label}`)),
        BATCH_TIMEOUT_MS,
      );
    }),
  ]).finally(() => clearTimeout(timer)) as Promise<T>;
}

/** One flattened spreadsheet row. */
export interface OrderExportRow {
  orderId: string;
  seller: string;
  sellerPhone: string;
  status: string;
  orderType: string;
  paymentType: string;
  courier: string;
  provider: string;
  awb: string;
  customer: string;
  phone: string;
  city: string;
  state: string;
  pincode: string;
  weightKg: string;
  chargeableWeightKg: string;
  orderAmount: string;
  codAmount: string;
  freightCharge: string;
  totalCharge: string;
  createdAt: string;
}

/**
 * Column set — identical to what the admin panel used to build in the browser,
 * so the file an admin gets today looks like the one they got yesterday.
 */
export const ORDER_EXPORT_COLUMNS: CsvColumn<OrderExportRow>[] = [
  { label: "Order ID", value: (r) => r.orderId },
  { label: "Seller", value: (r) => r.seller },
  { label: "Seller Phone", value: (r) => r.sellerPhone },
  { label: "Status", value: (r) => r.status },
  { label: "Type", value: (r) => r.orderType },
  { label: "Payment", value: (r) => r.paymentType },
  { label: "Courier", value: (r) => r.courier },
  { label: "Provider", value: (r) => r.provider },
  { label: "AWB", value: (r) => r.awb },
  { label: "Customer", value: (r) => r.customer },
  { label: "Customer Phone", value: (r) => r.phone },
  { label: "City", value: (r) => r.city },
  { label: "State", value: (r) => r.state },
  { label: "Pincode", value: (r) => r.pincode },
  { label: "Weight (kg)", value: (r) => r.weightKg },
  { label: "Chargeable Weight (kg)", value: (r) => r.chargeableWeightKg },
  { label: "Order Amount", value: (r) => r.orderAmount },
  { label: "COD Amount", value: (r) => r.codAmount },
  { label: "Freight Charge", value: (r) => r.freightCharge },
  { label: "Total Charge", value: (r) => r.totalCharge },
  { label: "Created At", value: (r) => r.createdAt },
];

/** How many rows the filter set matches — drives the progress bar. */
export async function countOrderExportRows(filters: AdminOrderFilters): Promise<number> {
  const [row] = await db.select({ value: count() }).from(orders).where(buildAdminOrderWhere(filters));
  return Number(row?.value ?? 0);
}

type Address = { contactName?: string; phone?: string; city?: string; state?: string; pincode?: string } | null;
type Rate = { freightCharge?: number | string; totalCharge?: number | string } | null;

function toKg(grams: unknown): string {
  const n = typeof grams === "number" ? grams : Number(grams);
  return grams == null || Number.isNaN(n) ? "" : (n / 1000).toFixed(3);
}

function money(value: unknown): string {
  if (value == null || value === "") return "";
  const n = Number(value);
  return Number.isNaN(n) ? "" : String(n);
}

/**
 * Walk every matching order newest-first, in batches.
 *
 * Keyset (`(created_at, id) < cursor`) rather than OFFSET: page 400 of an
 * OFFSET scan costs the database everything it already threw away, which is
 * what made the old browser-side export time out. Couriers and sellers are
 * joined in the same query so there is no per-page follow-up lookup.
 */
export async function* streamOrderExportRows(
  filters: AdminOrderFilters,
  opts: { batchSize?: number; maxRows?: number } = {},
): AsyncGenerator<OrderExportRow[]> {
  const batchSize = opts.batchSize ?? 1000;
  const maxRows = opts.maxRows ?? Number.POSITIVE_INFINITY;
  const where = buildAdminOrderWhere(filters);

  let cursor: { createdAt: Date; id: string } | null = null;
  let emitted = 0;

  for (;;) {
    const remaining = maxRows - emitted;
    if (remaining <= 0) return;

    const keyset = cursor
      ? sql`(${orders.createdAt}, ${orders.id}) < (${cursor.createdAt.toISOString()}::timestamptz, ${cursor.id}::uuid)`
      : undefined;
    const scopedWhere = where && keyset ? and(where, keyset) : (keyset ?? where);

    const take = Math.min(batchSize, remaining);
    const batchStart = Date.now();
    const rows = await withTimeout(
      db
        .select({
          id: orders.id,
          orderId: orders.orderId,
          status: orders.status,
          orderType: orders.orderType,
          paymentMode: orders.paymentMode,
          serviceProvider: orders.serviceProvider,
          awb: orders.awb,
          weight: orders.weight,
          deliveryAddress: orders.deliveryAddress,
          declaredValue: orders.declaredValue,
          codAmount: orders.codAmount,
          rateSnapshot: orders.rateSnapshot,
          metadata: orders.metadata,
          createdAt: orders.createdAt,
          courierName: couriers.name,
          userName: users.name,
          userBusinessName: users.businessName,
          userEmail: users.email,
          userPhone: users.phone,
        })
        .from(orders)
        .leftJoin(users, eq(users.id, orders.userId))
        .leftJoin(couriers, eq(couriers.id, orders.courierId))
        .where(scopedWhere)
        .orderBy(desc(orders.createdAt), desc(orders.id))
        .limit(take),
      `order batch (cursor=${cursor ? cursor.createdAt.toISOString() : "start"})`,
    );

    logger.info(
      `${TAG} batch fetched — ${rows.length} row(s) in ${Date.now() - batchStart}ms (cursor=${cursor ? cursor.createdAt.toISOString() : "start"})`,
    );

    if (rows.length === 0) return;

    const last = rows[rows.length - 1];
    cursor = { createdAt: last.createdAt, id: last.id };
    emitted += rows.length;

    yield rows.map((r): OrderExportRow => {
      const address = (r.deliveryAddress ?? null) as Address;
      const rate = (r.rateSnapshot ?? null) as Rate;
      const meta = (r.metadata ?? {}) as Record<string, unknown>;
      return {
        orderId: r.orderId,
        seller: r.userBusinessName || r.userName || r.userEmail || "",
        sellerPhone: r.userPhone || "",
        status: r.status,
        orderType: r.orderType,
        paymentType: r.paymentMode || "",
        // Sellers and admins both read the renamable courier name; the raw
        // provider slug is only a fallback for manually-created orders.
        courier: r.courierName || r.serviceProvider || "",
        provider: r.serviceProvider || "",
        awb: r.awb || "",
        customer: address?.contactName || "",
        phone: address?.phone || "",
        city: address?.city || "",
        state: address?.state || "",
        pincode: address?.pincode || "",
        // Weights are stored in grams — convert so the "(kg)" headers are honest.
        weightKg: toKg(r.weight),
        chargeableWeightKg: toKg(meta.chargeableWeight),
        orderAmount: money(r.declaredValue),
        codAmount: money(r.codAmount),
        freightCharge: money(rate?.freightCharge),
        totalCharge: money(rate?.totalCharge),
        createdAt: r.createdAt
          ? new Date(r.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
          : "",
      };
    });

    // A short batch means we've hit the end — skip the extra round-trip that
    // would only come back empty.
    if (rows.length < take) return;
  }
}
