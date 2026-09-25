import type { Response } from "express";
import { once } from "events";
import { and, asc, desc, eq, gte, lte, inArray, ilike, sql, count, type SQL } from "drizzle-orm";
import { db } from "../config/db.js";
import { orders } from "../db/schema.js";
import logger from "../config/logger.js";

// Order status / payment-type values (inlined from old model).
// NOTE: schema's `orders.status` is a varchar (free-form) and there is no
// `paymentType` column — `paymentMode` is the closest equivalent. These lists
// are still useful for input validation in the report validator.
export const ORDER_STATUSES = [
  "draft",
  "created",
  "processing",
  "booked",
  "pickup_initiated",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "ndr",
  "rto_initiated",
  "rto_in_transit",
  "rto_delivered",
  "cancelled",
  "lost",
] as const;
export const PAYMENT_TYPES = ["prepaid", "cod"] as const;

// ── Constants ──

/** Maximum date range allowed for a single report (6 months) */
export const MAX_DATE_RANGE_DAYS = 186;

/** Hard cap on rows per export to protect the server */
export const MAX_EXPORT_ROWS = 50_000;

/** Cursor batch size for streaming */
const CURSOR_BATCH_SIZE = 1_000;

/**
 * Business timezone offset for report date boundaries (Asia/Kolkata).
 *
 * `from`/`to` arrive as bare `YYYY-MM-DD` calendar days, which `new Date()`
 * parses as UTC midnight. Anchoring the day boundaries to the server process TZ
 * instead (the container has no TZ set, so UTC) shifted the whole window by
 * 5h30m: the `from` day lost its 00:00–05:30 IST orders and the `to` day leaked
 * in the next morning's — which read as "the to-date filter does nothing".
 * Both ends are pinned to IST here so the range means the same calendar days
 * the user picked, regardless of where the process runs.
 */
const BUSINESS_UTC_OFFSET = "+05:30";

/** Start of `date` (YYYY-MM-DD) in the business timezone. */
export function startOfBusinessDay(date: string): Date {
  return new Date(`${date.slice(0, 10)}T00:00:00.000${BUSINESS_UTC_OFFSET}`);
}

/** End of `date` (YYYY-MM-DD) in the business timezone — inclusive. */
export function endOfBusinessDay(date: string): Date {
  return new Date(`${date.slice(0, 10)}T23:59:59.999${BUSINESS_UTC_OFFSET}`);
}

// ── Field definitions ──

export interface FieldDef {
  key: string;
  label: string;
  /** Dot-path to extract from a lean order row */
  path: string;
  /** Optional formatter */
  format?: (val: unknown) => string;
}

const fmtDateTime = (val: unknown) =>
  val ? new Date(val as string).toISOString().replace("T", " ").replace(/\.\d+Z$/, "") : "";
const fmtCurrency = (val: unknown) => {
  const n = typeof val === "string" ? Number(val) : val;
  return typeof n === "number" && !Number.isNaN(n) ? n.toFixed(2) : "0.00";
};
const fmtBool = (val: unknown) => (val ? "Yes" : "No");

// Many legacy paths now live inside jsonb columns. The path resolver knows
// nothing about that — we just point at the right top-level key.
export const ALL_FIELDS: FieldDef[] = [
  // Order details
  { key: "orderId", label: "Order ID", path: "orderId" },
  { key: "orderDate", label: "Order Date", path: "createdAt", format: fmtDateTime },
  { key: "orderType", label: "Order Type", path: "orderType" },
  { key: "paymentType", label: "Payment Type", path: "paymentMode" },
  { key: "status", label: "Status", path: "status" },
  { key: "awb", label: "AWB Number", path: "awb" },
  { key: "serviceProvider", label: "Courier Partner", path: "serviceProvider" },

  // Delivery address (jsonb)
  { key: "customerName", label: "Customer Name", path: "deliveryAddress.contactName" },
  { key: "customerPhone", label: "Customer Phone", path: "deliveryAddress.phone" },
  { key: "customerEmail", label: "Customer Email", path: "deliveryAddress.email" },
  { key: "deliveryCity", label: "Delivery City", path: "deliveryAddress.city" },
  { key: "deliveryState", label: "Delivery State", path: "deliveryAddress.state" },
  { key: "deliveryPincode", label: "Delivery Pincode", path: "deliveryAddress.pincode" },
  { key: "deliveryAddress1", label: "Address Line 1", path: "deliveryAddress.addressLine1" },
  { key: "deliveryAddress2", label: "Address Line 2", path: "deliveryAddress.addressLine2" },

  // Package
  { key: "weight", label: "Weight (g)", path: "weight" },
  { key: "length", label: "Length (cm)", path: "dimensions.length" },
  { key: "breadth", label: "Breadth (cm)", path: "dimensions.breadth" },
  { key: "height", label: "Height (cm)", path: "dimensions.height" },
  { key: "chargeableWeight", label: "Chargeable Weight (g)", path: "metadata.chargeableWeight" },

  // Financial (rateSnapshot jsonb)
  { key: "orderAmount", label: "Order Amount", path: "declaredValue", format: fmtCurrency },
  { key: "codAmount", label: "COD Amount", path: "codAmount", format: fmtCurrency },
  { key: "forwardCharge", label: "Forward Charge", path: "rateSnapshot.forward", format: fmtCurrency },
  { key: "rtoCharge", label: "RTO Charge", path: "rateSnapshot.rto", format: fmtCurrency },
  { key: "codCharges", label: "COD Charges", path: "rateSnapshot.codCharges", format: fmtCurrency },
  { key: "freightCharge", label: "Freight Charge", path: "rateSnapshot.freightCharge", format: fmtCurrency },
  { key: "otherCharges", label: "Other Charges", path: "rateSnapshot.otherCharges", format: fmtCurrency },
  { key: "totalCharge", label: "Total Charge", path: "rateSnapshot.totalCharge", format: fmtCurrency },
  { key: "zone", label: "Zone", path: "rateSnapshot.zone" },

  // COD tracking (metadata jsonb)
  { key: "codCollected", label: "COD Collected", path: "metadata.codCollected", format: fmtBool },
  { key: "codCollectedAmount", label: "COD Collected Amount", path: "metadata.codCollectedAmount", format: fmtCurrency },

  // RTO tracking (metadata jsonb)
  { key: "rtoStatus", label: "RTO Status", path: "metadata.rtoStatus" },
  { key: "rtoRemarks", label: "RTO Remarks", path: "metadata.rtoRemarks" },

  // NDR (metadata jsonb)
  { key: "ndrReason", label: "NDR Reason", path: "metadata.ndrReason" },

  // Dates
  { key: "createdAt", label: "Created At", path: "createdAt", format: fmtDateTime },
  { key: "shippedAt", label: "Shipped At", path: "metadata.shippedAt", format: fmtDateTime },
  { key: "deliveredAt", label: "Delivered At", path: "deliveredAt", format: fmtDateTime },
  { key: "cancelledAt", label: "Cancelled At", path: "cancelledAt", format: fmtDateTime },
  { key: "pickupRequestedAt", label: "Pickup Requested At", path: "metadata.pickupRequestedAt", format: fmtDateTime },

  // B2B (metadata jsonb)
  { key: "companyName", label: "Company Name", path: "metadata.companyName" },
  { key: "companyGst", label: "Company GST", path: "metadata.companyGst" },
];

export const FIELD_KEYS = new Set(ALL_FIELDS.map((f) => f.key));

// ── Filter shape ──

export interface ReportFilters {
  from: string; // required, ISO date
  to: string;   // required, ISO date
  status?: string[];
  paymentType?: string[];
  orderType?: string;
  courier?: string[];
  city?: string;
  state?: string;
  pincode?: string;
  weightMin?: number;
  weightMax?: number;
  amountMin?: number;
  amountMax?: number;
  /** Admin-only: scope to a specific merchant */
  userId?: string;
}

// ── Helpers ──

/** Resolve a dot-path like "deliveryAddress.city" from an object */
function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((acc: unknown, part) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[part];
    return undefined;
  }, obj);
}

function escapeCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

/**
 * Build the SQL where clause for the order query from filters.
 */
export function buildOrderWhere(
  userId: string | null,
  filters: ReportFilters,
): SQL | undefined {
  const conditions: SQL[] = [];
  if (userId) conditions.push(eq(orders.userId, userId));
  else if (filters.userId) conditions.push(eq(orders.userId, filters.userId));

  // Date range — required, inclusive of both calendar days in business time
  conditions.push(gte(orders.createdAt, startOfBusinessDay(filters.from)));
  conditions.push(lte(orders.createdAt, endOfBusinessDay(filters.to)));

  if (filters.status?.length) {
    const valid = filters.status.filter((s) => (ORDER_STATUSES as readonly string[]).includes(s));
    if (valid.length) conditions.push(inArray(orders.status, valid));
  }

  if (filters.paymentType?.length) {
    const valid = filters.paymentType.filter((p) => (PAYMENT_TYPES as readonly string[]).includes(p));
    // schema's column is `paymentMode`, not `paymentType` — mapped here.
    if (valid.length) conditions.push(inArray(orders.paymentMode, valid));
  }

  if (filters.orderType && ["B2B", "B2C"].includes(filters.orderType)) {
    // Old data stored "B2B"/"B2C"; schema is lowercase varchar default "b2c".
    conditions.push(eq(orders.orderType, filters.orderType.toLowerCase()));
  }

  if (filters.courier?.length) {
    conditions.push(inArray(orders.serviceProvider, filters.courier));
  }

  // Address fields live in the `deliveryAddress` jsonb — extract via ->>.
  if (filters.city) {
    conditions.push(
      sql`${orders.deliveryAddress}->>'city' ILIKE ${`${filters.city}%`}`,
    );
  }
  if (filters.state) {
    conditions.push(
      sql`${orders.deliveryAddress}->>'state' ILIKE ${`${filters.state}%`}`,
    );
  }
  if (filters.pincode) {
    conditions.push(sql`${orders.deliveryAddress}->>'pincode' = ${filters.pincode}`);
  }

  if (filters.weightMin !== undefined) conditions.push(gte(orders.weight, filters.weightMin));
  if (filters.weightMax !== undefined) conditions.push(lte(orders.weight, filters.weightMax));

  if (filters.amountMin !== undefined) {
    conditions.push(gte(orders.declaredValue, String(filters.amountMin)));
  }
  if (filters.amountMax !== undefined) {
    conditions.push(lte(orders.declaredValue, String(filters.amountMax)));
  }

  return conditions.length ? and(...conditions) : undefined;
}

/**
 * Back-compat wrapper that returns a {} object so older callers (if any) still
 * "build a query" — kept as a thin shim.
 */
export function buildOrderQuery(
  userId: string | null,
  filters: ReportFilters,
): Record<string, unknown> {
  // We no longer return a Mongo-style query object; callers should use
  // `buildOrderWhere`. Keep this around for any holdover imports.
  void buildOrderWhere(userId, filters);
  return {};
}

/**
 * Stream matching orders to the response as CSV.
 *
 * The Drizzle/pg driver doesn't expose a true cursor stream as cleanly as
 * Mongoose did, so we page in fixed-size batches of CURSOR_BATCH_SIZE ordered
 * by createdAt. Each batch is awaited + written, then we move on.
 */
export async function streamOrdersAsCsv(opts: {
  userId: string | null;
  fieldKeys: string[];
  filters: ReportFilters;
  res: Response;
}): Promise<void> {
  const { userId, fieldKeys, filters, res } = opts;

  const selectedFields = fieldKeys.map((key) => ALL_FIELDS.find((f) => f.key === key)!);
  const whereClause = buildOrderWhere(userId, filters);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="report_${Date.now()}.csv"`);

  // BOM for Excel compatibility
  await write(res, "﻿");
  await write(res, selectedFields.map((f) => escapeCsv(f.label)).join(",") + "\n");

  let exported = 0;
  let offset = 0;

  while (exported < MAX_EXPORT_ROWS) {
    const batch = await db
      .select()
      .from(orders)
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .offset(offset)
      .limit(CURSOR_BATCH_SIZE);

    if (batch.length === 0) break;

    for (const order of batch) {
      if (exported >= MAX_EXPORT_ROWS) {
        logger.warn(`[Reports] Hit MAX_EXPORT_ROWS cap (${MAX_EXPORT_ROWS}) — userId: ${userId ?? "admin"}`);
        break;
      }

      const row = selectedFields.map((f) => {
        const raw = resolvePath(order as unknown as Record<string, unknown>, f.path);
        if (raw === undefined || raw === null) return "";
        if (f.format) return escapeCsv(f.format(raw));
        return escapeCsv(String(raw));
      });

      await write(res, row.join(",") + "\n");
      exported++;
    }

    if (batch.length < CURSOR_BATCH_SIZE) break;
    offset += batch.length;
  }

  logger.info(`[Reports] CSV streamed — userId: ${userId ?? "admin"}, fields: ${fieldKeys.length}, rows: ${exported}`);
  res.end();
}

/**
 * Backpressure-aware write.
 */
async function write(res: Response, chunk: string): Promise<void> {
  if (!res.write(chunk)) {
    await once(res, "drain");
  }
}

/** Count matching orders for the preview endpoint */
export async function countMatchingOrders(
  userId: string | null,
  filters: ReportFilters,
): Promise<number> {
  const whereClause = buildOrderWhere(userId, filters);
  const [row] = await db.select({ value: count() }).from(orders).where(whereClause);
  return row?.value ?? 0;
}

// keep some imports referenced
void asc;
void ilike;
