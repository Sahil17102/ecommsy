import crypto from "crypto";
import { and, asc, desc, eq, gte, lte, ilike, or, sql, inArray, count } from "drizzle-orm";
import { db } from "../config/db.js";
import { billingInvoices, billingPreferences, orders, users } from "../db/schema.js";
import { generateBillingInvoicePdf } from "./documents/billingInvoiceGenerator.js";
import { uploadDocument } from "./storage.js";
import { isStorageConfigured } from "../config/storage.js";
import type { Pagination } from "../types/index.js";
import { AppError } from "../utils/AppError.js";
import logger from "../config/logger.js";
import { notifyAsync } from "./notificationService.js";

const TAG = "[BillingInvoice]";

// Invoice statuses & types (inlined from old model).
// NOTE: schema enum is ["draft","issued","paid","void"]. Old code used "generated"
// — we map it to "issued" here.
export enum InvoiceStatus {
  GENERATED = "issued",
  VOID = "void",
}
export const INVOICE_STATUSES = Object.values(InvoiceStatus);

export enum InvoiceType {
  WEEKLY = "weekly",
  MONTHLY_SUMMARY = "monthly_summary",
  MANUAL = "manual",
}

// Billing frequency (inlined from old model).
// NOTE: schema enum is ["weekly","monthly","custom"] — "manual" maps to "custom"
// with no auto-generate, but the field name is preserved here for callers.
export enum BillingFrequency {
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  MANUAL = "custom",
  CUSTOM = "custom",
}

export type IBillingInvoice = typeof billingInvoices.$inferSelect;
type OrderRow = typeof orders.$inferSelect;

// ── Billable statuses — only orders past pickup_initiated are invoiced ──

const BILLABLE_STATUSES = [
  "pickup_initiated",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "ndr",
  "rto_initiated",
  "rto_in_transit",
  "rto_delivered",
] as const;

function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : Number(v);
}

// Read freight / cod / other charges out of the order's rateSnapshot jsonb.
// The old code accessed order.rate.freightCharge etc. directly — that lives in
// the rateSnapshot blob now.
function readRate(o: OrderRow): { freightCharge: number; codCharges: number; otherCharges: number } {
  const r = (o.rateSnapshot ?? {}) as Record<string, number | undefined>;
  return {
    freightCharge: Number(r.freightCharge ?? 0),
    codCharges: Number(r.codCharges ?? 0),
    otherCharges: Number(r.otherCharges ?? 0),
  };
}

// ── Invoice number generation ──

function generateInvoiceNumber(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 6);
  return `CC${yy}${mm}${dd}${suffix}`;
}

// ── List invoices (seller) ──

export interface ListInvoicesResult {
  invoices: IBillingInvoice[];
  pagination: Pagination;
}

export async function listInvoices(opts: {
  userId?: string;
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}): Promise<ListInvoicesResult> {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereClause = opts.userId ? eq(billingInvoices.userId, opts.userId) : undefined;

  const sortEntries = Object.entries(opts.sort ?? { createdAt: -1 });
  const [sortField, sortDir] = sortEntries[0] ?? ["createdAt", -1];
  // Use a loose record type — Drizzle column types are nominal so mixing
  // numeric+timestamp columns in one map widens awkwardly without `any`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortColMap: Record<string, any> = {
    createdAt: billingInvoices.createdAt,
    totalAmount: billingInvoices.totalAmount,
    netPayable: billingInvoices.totalAmount,
    periodStart: billingInvoices.periodStart,
  };
  const sortCol = sortColMap[sortField] ?? billingInvoices.createdAt;
  const sortOrderFn = sortDir === 1 ? asc : desc;

  const [totalRow, invoices] = await Promise.all([
    db.select({ value: count() }).from(billingInvoices).where(whereClause),
    db
      .select()
      .from(billingInvoices)
      .where(whereClause)
      .orderBy(sortOrderFn(sortCol))
      .offset(skip)
      .limit(limit),
  ]);

  const total = totalRow[0]?.value ?? 0;

  return {
    invoices,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ── Admin list with user info ──

export async function listInvoicesWithUsers(opts: {
  search?: string;
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}) {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const skip = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [];
  if (opts.search) {
    const like = `%${opts.search}%`;
    const searchClause = or(
      ilike(billingInvoices.invoiceNumber, like),
      ilike(users.email, like),
      ilike(users.businessName, like),
    );
    if (searchClause) conditions.push(searchClause as unknown as ReturnType<typeof eq>);
  }
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const sortEntries = Object.entries(opts.sort ?? { createdAt: -1 });
  const [sortField, sortDir] = sortEntries[0] ?? ["createdAt", -1];
  // Use a loose record type — Drizzle column types are nominal so mixing
  // numeric+timestamp columns in one map widens awkwardly without `any`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortColMap: Record<string, any> = {
    createdAt: billingInvoices.createdAt,
    totalAmount: billingInvoices.totalAmount,
    netPayable: billingInvoices.totalAmount,
    periodStart: billingInvoices.periodStart,
  };
  const sortCol = sortColMap[sortField] ?? billingInvoices.createdAt;
  const sortOrderFn = sortDir === 1 ? asc : desc;

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: billingInvoices.id,
        userId: billingInvoices.userId,
        invoiceNumber: billingInvoices.invoiceNumber,
        periodStart: billingInvoices.periodStart,
        periodEnd: billingInvoices.periodEnd,
        status: billingInvoices.status,
        type: billingInvoices.type,
        taxableValue: billingInvoices.taxableValue,
        cgst: billingInvoices.cgst,
        sgst: billingInvoices.sgst,
        igst: billingInvoices.igst,
        gstRate: billingInvoices.gstRate,
        totalAmount: billingInvoices.totalAmount,
        orderCount: billingInvoices.orderCount,
        orderNumbers: billingInvoices.orderNumbers,
        pdfUrl: billingInvoices.pdfUrl,
        csvUrl: billingInvoices.csvUrl,
        createdAt: billingInvoices.createdAt,
        user: {
          email: users.email,
          name: users.name,
          businessName: users.businessName,
        },
      })
      .from(billingInvoices)
      .innerJoin(users, eq(users.id, billingInvoices.userId))
      .where(whereClause)
      .orderBy(sortOrderFn(sortCol))
      .offset(skip)
      .limit(limit),
    db
      .select({ value: count() })
      .from(billingInvoices)
      .innerJoin(users, eq(users.id, billingInvoices.userId))
      .where(whereClause),
  ]);

  const total = totalRow[0]?.value ?? 0;

  return {
    invoices: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ── Get invoice with its orders ──

export async function getInvoiceOrders(invoiceId: string) {
  const invoice = await db.query.billingInvoices.findFirst({
    where: eq(billingInvoices.id, invoiceId),
  });
  if (!invoice) throw new AppError(404, "Invoice not found");

  let invoiceOrders: OrderRow[];

  if (invoice.orderNumbers && invoice.orderNumbers.length > 0) {
    invoiceOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.userId, invoice.userId),
          inArray(orders.orderId, invoice.orderNumbers),
        ),
      )
      .orderBy(desc(orders.createdAt));
  } else {
    invoiceOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.userId, invoice.userId),
          inArray(orders.status, BILLABLE_STATUSES as unknown as string[]),
          invoice.periodStart ? gte(orders.createdAt, invoice.periodStart) : undefined,
          invoice.periodEnd ? lte(orders.createdAt, invoice.periodEnd) : undefined,
        ),
      )
      .orderBy(desc(orders.createdAt));
  }

  return { invoice, orders: invoiceOrders };
}

// ── Generate invoice for a user (receipt of charges already paid via wallet) ──

export async function generateInvoiceForUser(
  userId: string,
  opts: {
    startDate: Date;
    endDate: Date;
    type?: InvoiceType;
    taxRate?: number;
  },
): Promise<IBillingInvoice> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new AppError(404, "User not found");

  // Fetch billable orders in the period
  const billableOrders = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.userId, userId),
        inArray(orders.status, BILLABLE_STATUSES as unknown as string[]),
        gte(orders.createdAt, opts.startDate),
        lte(orders.createdAt, opts.endDate),
      ),
    )
    .orderBy(asc(orders.createdAt));

  if (billableOrders.length === 0) {
    throw new AppError(400, "No billable orders found in the specified period");
  }

  // Calculate totals from order rate snapshots
  let totalFreight = 0;
  let totalCodCharges = 0;
  let totalOtherCharges = 0;
  const orderNumbers: string[] = [];

  for (const order of billableOrders) {
    const r = readRate(order);
    totalFreight += r.freightCharge;
    totalCodCharges += r.codCharges;
    totalOtherCharges += r.otherCharges;
    orderNumbers.push(order.orderId);
  }

  const taxableValue = +(totalFreight + totalCodCharges + totalOtherCharges).toFixed(2);

  // Tax calculation
  const taxRate = opts.taxRate ?? 0;
  const isInterState = false; // TODO: determine from seller state vs platform state
  const cgst = isInterState ? 0 : +(taxableValue * (taxRate / 2 / 100)).toFixed(2);
  const sgst = isInterState ? 0 : +(taxableValue * (taxRate / 2 / 100)).toFixed(2);
  const igst = isInterState ? +(taxableValue * (taxRate / 100)).toFixed(2) : 0;
  const totalAmount = +(taxableValue + cgst + sgst + igst).toFixed(2);

  // Generate unique invoice number
  let invoiceNumber = generateInvoiceNumber();
  while (
    await db.query.billingInvoices.findFirst({
      where: eq(billingInvoices.invoiceNumber, invoiceNumber),
      columns: { id: true },
    })
  ) {
    invoiceNumber = generateInvoiceNumber();
  }

  // Generate CSV
  const csvBuffer = generateInvoiceCsv(billableOrders);

  // Generate PDF — the helper still expects the legacy Mongoose-shaped IOrder
  // type, so cast through unknown until that helper is migrated too.
  const pdfBuffer = await generateBillingInvoicePdf({
    invoiceNumber,
    periodStart: opts.startDate,
    periodEnd: opts.endDate,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: user as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    orders: billableOrders as any,
    taxableValue,
    cgst,
    sgst,
    igst,
    gstRate: taxRate,
    netPayable: totalAmount,
    totalFreight,
    totalCodCharges,
  });

  // Upload to S3
  let pdfUrl: string | undefined;
  let csvUrl: string | undefined;

  if (isStorageConfigured()) {
    const pdfKey = `invoices/${invoiceNumber}.pdf`;
    const csvKey = `invoices/${invoiceNumber}.csv`;

    await Promise.all([
      uploadDocument(pdfKey, pdfBuffer, "application/pdf"),
      uploadDocument(csvKey, csvBuffer, "text/csv"),
    ]);

    pdfUrl = pdfKey;
    csvUrl = csvKey;
  }

  // Create invoice (this is a receipt — charges already deducted from wallet)
  const [invoice] = await db
    .insert(billingInvoices)
    .values({
      userId,
      invoiceNumber,
      periodStart: opts.startDate,
      periodEnd: opts.endDate,
      status: InvoiceStatus.GENERATED,
      type: opts.type ?? InvoiceType.MANUAL,
      taxableValue: String(taxableValue),
      cgst: String(cgst),
      sgst: String(sgst),
      igst: String(igst),
      gstRate: String(taxRate),
      totalAmount: String(totalAmount),
      orderCount: billableOrders.length,
      orderNumbers,
      pdfUrl,
      csvUrl,
    })
    .returning();

  logger.info(
    `${TAG} Generated invoice ${invoiceNumber} for userId=${userId} orders=${billableOrders.length} totalAmount=₹${totalAmount}`,
  );

  notifyAsync({
    userId,
    event: "invoice.generated",
    data: { invoiceNumber, amount: totalAmount },
  });

  return invoice;
}

// ── Void an invoice ──

export async function voidInvoice(invoiceId: string): Promise<IBillingInvoice> {
  const existing = await db.query.billingInvoices.findFirst({
    where: eq(billingInvoices.id, invoiceId),
  });
  if (!existing) throw new AppError(404, "Invoice not found");

  const [invoice] = await db
    .update(billingInvoices)
    .set({ status: InvoiceStatus.VOID, updatedAt: new Date() })
    .where(eq(billingInvoices.id, invoiceId))
    .returning();

  logger.info(`${TAG} Voided invoice ${invoice.invoiceNumber}`);
  return invoice;
}

// ── CSV generation ──

function generateInvoiceCsv(rows: OrderRow[]): Buffer {
  const headers = ["Order ID", "Order Type", "AWB", "Freight Charges", "COD Charges", "Other Charges", "Order Date"];
  const csvRows = rows.map((o) => {
    const r = readRate(o);
    return [
      o.orderId,
      o.orderType,
      o.awb ?? "",
      r.freightCharge.toFixed(2),
      r.codCharges.toFixed(2),
      r.otherCharges.toFixed(2),
      o.createdAt ? o.createdAt.toISOString() : "",
    ];
  });

  const csv = [headers.join(","), ...csvRows.map((r) => r.join(","))].join("\n");
  return Buffer.from(csv, "utf-8");
}

// ── Billing preferences CRUD ──

export async function getOrCreateBillingPreference(userId: string) {
  const existing = await db.query.billingPreferences.findFirst({
    where: eq(billingPreferences.userId, userId),
  });
  if (existing) return existing;

  const [pref] = await db
    .insert(billingPreferences)
    .values({
      userId,
      frequency: BillingFrequency.WEEKLY,
      autoGenerate: true,
    })
    .returning();
  return pref;
}

export async function updateBillingPreference(
  userId: string,
  updates: { frequency?: string; autoGenerate?: boolean; customFrequencyDays?: number },
) {
  // Map "manual" → "custom" since the schema's plan_frequency enum is
  // ["weekly","monthly","custom"].
  const normalizedFrequency =
    updates.frequency === "manual" ? "custom" : (updates.frequency as "weekly" | "monthly" | "custom" | undefined);

  const patch: Record<string, unknown> = {};
  if (normalizedFrequency) patch.frequency = normalizedFrequency;
  if (updates.autoGenerate !== undefined) patch.autoGenerate = updates.autoGenerate;
  if (updates.customFrequencyDays !== undefined) patch.customFrequencyDays = updates.customFrequencyDays;
  patch.updatedAt = new Date();

  // Upsert: try update first; if no rows match, insert.
  const [updated] = await db
    .update(billingPreferences)
    .set(patch)
    .where(eq(billingPreferences.userId, userId))
    .returning();
  if (updated) return updated;

  const [inserted] = await db
    .insert(billingPreferences)
    .values({
      userId,
      frequency:
        (normalizedFrequency as "weekly" | "monthly" | "custom" | undefined) ?? BillingFrequency.WEEKLY,
      autoGenerate: updates.autoGenerate ?? true,
      customFrequencyDays: updates.customFrequencyDays,
    })
    .returning();
  return inserted;
}

// ── Auto-generate invoices (called by cron) ──

export async function autoGenerateInvoices(): Promise<{
  generated: number;
  skipped: number;
  errors: string[];
}> {
  const prefs = await db
    .select()
    .from(billingPreferences)
    .where(eq(billingPreferences.autoGenerate, true));
  let generated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const pref of prefs) {
    try {
      if ((pref.frequency as string) === BillingFrequency.MANUAL && !pref.customFrequencyDays) {
        skipped++;
        continue;
      }

      let intervalDays = 7;
      if (pref.frequency === BillingFrequency.MONTHLY) intervalDays = 30;
      else if (pref.frequency === BillingFrequency.CUSTOM && pref.customFrequencyDays) {
        intervalDays = pref.customFrequencyDays;
      }

      const lastInvoice = await db.query.billingInvoices.findFirst({
        where: eq(billingInvoices.userId, pref.userId),
        orderBy: desc(billingInvoices.periodEnd),
      });

      let startDate: Date;
      let endDate: Date;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (lastInvoice && lastInvoice.periodEnd) {
        startDate = new Date(lastInvoice.periodEnd);
        startDate.setDate(startDate.getDate() + 1);
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + intervalDays - 1);
        endDate.setHours(23, 59, 59, 999);

        if (today < endDate) {
          skipped++;
          continue;
        }
      } else {
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - intervalDays);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
      }

      const orderCountRow = await db
        .select({ value: count() })
        .from(orders)
        .where(
          and(
            eq(orders.userId, pref.userId),
            inArray(orders.status, BILLABLE_STATUSES as unknown as string[]),
            gte(orders.createdAt, startDate),
            lte(orders.createdAt, endDate),
          ),
        );

      if ((orderCountRow[0]?.value ?? 0) === 0) {
        skipped++;
        continue;
      }

      const invoiceType =
        pref.frequency === BillingFrequency.MONTHLY
          ? InvoiceType.MONTHLY_SUMMARY
          : InvoiceType.WEEKLY;

      await generateInvoiceForUser(pref.userId, {
        startDate,
        endDate,
        type: invoiceType,
      });

      generated++;
    } catch (err) {
      const msg = `userId=${pref.userId}: ${(err as Error).message}`;
      errors.push(msg);
      logger.error(`${TAG} Auto-generate failed for ${msg}`);
    }
  }

  logger.info(`${TAG} Auto-generate complete: ${generated} generated, ${skipped} skipped, ${errors.length} errors`);
  return { generated, skipped, errors };
}

// keep utility references
void toNum;
void sql;
