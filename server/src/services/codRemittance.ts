import { and, asc, desc, eq, gte, lte, ilike, or, sql, inArray, count } from "drizzle-orm";
import { db } from "../config/db.js";
import { codRemittances, wallets, users, walletTransactions } from "../db/schema.js";
import { createWalletTransaction, TransactionType } from "./wallet.js";
import type { Pagination } from "../types/index.js";
import { AppError } from "../utils/AppError.js";
import logger from "../config/logger.js";

const TAG = "[CodRemittance]";

// COD remittance status (inlined from old model).
// NOTE: schema enum is ["pending","in_transit","remitted","on_hold","failed"].
// Old code used "credited" — we map "credited" → "remitted" in the DB enum.
export enum CodRemittanceStatus {
  PENDING = "pending",
  CREDITED = "remitted",
}
export const COD_REMITTANCE_STATUSES = Object.values(CodRemittanceStatus);

export type ICodRemittance = typeof codRemittances.$inferSelect;

function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : Number(v);
}

// ── Create COD remittance (called when order is delivered) ──

export interface CreateCodRemittanceInput {
  userId: string;
  orderId: string;
  orderType: "B2B" | "B2C";
  orderNumber: string;
  awbNumber: string;
  courierPartner: string;
  codAmount: number;
}

export async function createCodRemittance(input: CreateCodRemittanceInput): Promise<ICodRemittance> {
  const existing = await db.query.codRemittances.findFirst({
    where: eq(codRemittances.awbNumber, input.awbNumber),
  });
  if (existing) {
    logger.info(`${TAG} Remittance already exists for AWB=${input.awbNumber}, skipping`);
    return existing;
  }

  // No deductions — shipping is already paid from wallet at order creation
  const remittableAmount = input.codAmount;

  const [remittance] = await db
    .insert(codRemittances)
    .values({
      userId: input.userId,
      orderId: input.orderId,
      orderType: input.orderType,
      orderNumber: input.orderNumber,
      awbNumber: input.awbNumber,
      courierPartner: input.courierPartner,
      codAmount: String(input.codAmount),
      remittableAmount: String(remittableAmount),
      status: CodRemittanceStatus.PENDING,
      collectedAt: new Date(),
    })
    .returning();

  logger.info(
    `${TAG} Created remittance for AWB=${input.awbNumber} codAmount=₹${input.codAmount} remittable=₹${remittableAmount}`,
  );

  return remittance;
}

// ── Credit a single remittance to seller's wallet ──

export interface CreditRemittanceInput {
  remittanceId: string;
  adminId: string;
  utrNumber?: string;
  creditDate?: string;
  amount?: number;
  notes?: string;
}

export async function creditCodRemittanceToWallet(
  input: CreditRemittanceInput,
): Promise<ICodRemittance> {
  const remittance = await db.query.codRemittances.findFirst({
    where: eq(codRemittances.id, input.remittanceId),
  });
  if (!remittance) throw new AppError(404, "Remittance not found");
  if (remittance.status === CodRemittanceStatus.CREDITED) {
    throw new AppError(400, "Remittance already credited");
  }

  const creditAmount = input.amount ?? toNum(remittance.remittableAmount);
  const wallet = await db.query.wallets.findFirst({ where: eq(wallets.userId, remittance.userId) });
  if (!wallet) throw new AppError(404, "Wallet not found for seller");

  // db.transaction wraps wallet credit + remittance status update atomically.
  // The createWalletTransaction helper uses the top-level `db` — for the COD
  // flow we accept that small split since the wallet helper writes are
  // already idempotent via the `ref` column and the broader atomicity story
  // is the remittance status flip, which we do inside the tx.
  const result = await db.transaction(async (tx) => {
    const txn = await createWalletTransaction({
      walletId: wallet.id,
      amount: creditAmount,
      type: TransactionType.CREDIT,
      reason: "COD Remittance",
      ref: remittance.id,
      meta: {
        awb: remittance.awbNumber,
        orderId: remittance.orderNumber,
        courierPartner: remittance.courierPartner,
        utrNumber: input.utrNumber,
        creditedBy: input.adminId,
      },
    });

    const [updated] = await tx
      .update(codRemittances)
      .set({
        status: CodRemittanceStatus.CREDITED,
        creditedAt: input.creditDate ? new Date(input.creditDate) : new Date(),
        walletTransactionId: txn.id,
        ...(input.utrNumber ? { utrNumber: input.utrNumber } : {}),
        ...(input.notes ? { notes: input.notes } : {}),
        updatedAt: new Date(),
      })
      .where(eq(codRemittances.id, remittance.id))
      .returning();

    return updated;
  });

  logger.info(
    `${TAG} Credited ₹${creditAmount} to wallet for AWB=${remittance.awbNumber} userId=${remittance.userId}`,
  );

  return result;
}

// ── Bulk credit from CSV settlement ──

export interface SettlementPreviewItem {
  awbNumber: string;
  courierAmount: number;
  remittanceId?: string;
  ourAmount?: number;
  category: "matched" | "discrepancy" | "not_found" | "already_credited";
  difference?: number;
}

export async function previewSettlementCsv(
  rows: Array<{ awbNumber: string; amount: number }>,
): Promise<{
  items: SettlementPreviewItem[];
  summary: { matched: number; discrepancies: number; notFound: number; alreadyCredited: number };
}> {
  const items: SettlementPreviewItem[] = [];
  const summary = { matched: 0, discrepancies: 0, notFound: 0, alreadyCredited: 0 };

  for (const row of rows) {
    const remittance = await db.query.codRemittances.findFirst({
      where: eq(codRemittances.awbNumber, row.awbNumber),
    });

    if (!remittance) {
      items.push({ awbNumber: row.awbNumber, courierAmount: row.amount, category: "not_found" });
      summary.notFound++;
      continue;
    }

    const remittable = toNum(remittance.remittableAmount);

    if (remittance.status === CodRemittanceStatus.CREDITED) {
      items.push({
        awbNumber: row.awbNumber,
        courierAmount: row.amount,
        remittanceId: remittance.id,
        ourAmount: remittable,
        category: "already_credited",
      });
      summary.alreadyCredited++;
      continue;
    }

    const diff = Math.abs(row.amount - remittable);
    if (diff <= 1) {
      items.push({
        awbNumber: row.awbNumber,
        courierAmount: row.amount,
        remittanceId: remittance.id,
        ourAmount: remittable,
        category: "matched",
      });
      summary.matched++;
    } else {
      items.push({
        awbNumber: row.awbNumber,
        courierAmount: row.amount,
        remittanceId: remittance.id,
        ourAmount: remittable,
        category: "discrepancy",
        difference: row.amount - remittable,
      });
      summary.discrepancies++;
    }
  }

  return { items, summary };
}

export async function confirmSettlement(
  remittanceIds: string[],
  utrNumber: string,
  adminId: string,
): Promise<{ credited: number; failed: number; errors: string[] }> {
  let credited = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const id of remittanceIds) {
    try {
      await creditCodRemittanceToWallet({
        remittanceId: id,
        adminId,
        utrNumber,
      });
      credited++;
    } catch (err) {
      failed++;
      errors.push(`${id}: ${(err as Error).message}`);
      logger.error(`${TAG} Failed to credit remittance ${id}: ${(err as Error).message}`);
    }
  }

  return { credited, failed, errors };
}

// ── Stats ──

export async function getAdminStats(): Promise<{
  totalPending: number;
  todayCredited: number;
  totalCredited: number;
  usersWithPending: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [pendingResult, todayCreditedResult, totalCreditedResult, usersResult] = await Promise.all([
    db
      .select({
        total: sql<number>`coalesce(sum(${codRemittances.remittableAmount}::numeric), 0)`,
      })
      .from(codRemittances)
      .where(eq(codRemittances.status, CodRemittanceStatus.PENDING)),
    db
      .select({
        total: sql<number>`coalesce(sum(${codRemittances.remittableAmount}::numeric), 0)`,
      })
      .from(codRemittances)
      .where(
        and(
          eq(codRemittances.status, CodRemittanceStatus.CREDITED),
          gte(codRemittances.creditedAt, today),
        ),
      ),
    db
      .select({
        total: sql<number>`coalesce(sum(${codRemittances.remittableAmount}::numeric), 0)`,
      })
      .from(codRemittances)
      .where(eq(codRemittances.status, CodRemittanceStatus.CREDITED)),
    db
      .selectDistinct({ userId: codRemittances.userId })
      .from(codRemittances)
      .where(eq(codRemittances.status, CodRemittanceStatus.PENDING)),
  ]);

  return {
    totalPending: Number(pendingResult[0]?.total ?? 0),
    todayCredited: Number(todayCreditedResult[0]?.total ?? 0),
    totalCredited: Number(totalCreditedResult[0]?.total ?? 0),
    usersWithPending: usersResult.length,
  };
}

export async function getSellerStats(userId: string): Promise<{
  remittedTillDate: number;
  remittedCount: number;
  lastRemittanceAmount: number;
  pendingAmount: number;
  pendingCount: number;
}> {
  const [credited, pending, lastRemittance] = await Promise.all([
    db
      .select({
        total: sql<number>`coalesce(sum(${codRemittances.remittableAmount}::numeric), 0)`,
        count: count(),
      })
      .from(codRemittances)
      .where(
        and(
          eq(codRemittances.userId, userId),
          eq(codRemittances.status, CodRemittanceStatus.CREDITED),
        ),
      ),
    db
      .select({
        total: sql<number>`coalesce(sum(${codRemittances.remittableAmount}::numeric), 0)`,
        count: count(),
      })
      .from(codRemittances)
      .where(
        and(
          eq(codRemittances.userId, userId),
          eq(codRemittances.status, CodRemittanceStatus.PENDING),
        ),
      ),
    db.query.codRemittances.findFirst({
      where: and(
        eq(codRemittances.userId, userId),
        eq(codRemittances.status, CodRemittanceStatus.CREDITED),
      ),
      orderBy: desc(codRemittances.creditedAt),
    }),
  ]);

  return {
    remittedTillDate: Number(credited[0]?.total ?? 0),
    remittedCount: Number(credited[0]?.count ?? 0),
    lastRemittanceAmount: lastRemittance ? toNum(lastRemittance.remittableAmount) : 0,
    pendingAmount: Number(pending[0]?.total ?? 0),
    pendingCount: Number(pending[0]?.count ?? 0),
  };
}

// ── List remittances ──

export interface ListRemittancesResult {
  remittances: ICodRemittance[];
  pagination: Pagination;
}

export async function listRemittances(opts: {
  userId?: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}): Promise<ListRemittancesResult> {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const skip = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [];

  if (opts.userId) conditions.push(eq(codRemittances.userId, opts.userId));
  if (opts.status) {
    conditions.push(
      eq(codRemittances.status, opts.status as (typeof COD_REMITTANCE_STATUSES)[number]),
    );
  }

  if (opts.search) {
    const like = `%${opts.search}%`;
    const searchClause = or(
      ilike(codRemittances.orderNumber, like),
      ilike(codRemittances.awbNumber, like),
    );
    if (searchClause) conditions.push(searchClause as unknown as ReturnType<typeof eq>);
  }

  if (opts.dateFrom) conditions.push(gte(codRemittances.collectedAt, new Date(opts.dateFrom)));
  if (opts.dateTo) conditions.push(lte(codRemittances.collectedAt, new Date(opts.dateTo)));

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const sortEntries = Object.entries(opts.sort ?? { createdAt: -1 });
  const [sortField, sortDir] = sortEntries[0] ?? ["createdAt", -1];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortColMap: Record<string, any> = {
    createdAt: codRemittances.createdAt,
    codAmount: codRemittances.codAmount,
    remittableAmount: codRemittances.remittableAmount,
    collectedAt: codRemittances.collectedAt,
    creditedAt: codRemittances.creditedAt,
  };
  const sortCol = sortColMap[sortField] ?? codRemittances.createdAt;
  const sortOrderFn = sortDir === 1 ? asc : desc;

  const [totalRow, remittances] = await Promise.all([
    db.select({ value: count() }).from(codRemittances).where(whereClause),
    db
      .select()
      .from(codRemittances)
      .where(whereClause)
      .orderBy(sortOrderFn(sortCol))
      .offset(skip)
      .limit(limit),
  ]);

  const total = totalRow[0]?.value ?? 0;

  return {
    remittances,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ── Admin list with user info (join) ──

export async function listRemittancesWithUsers(opts: {
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}) {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const skip = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [];
  if (opts.status) {
    conditions.push(
      eq(codRemittances.status, opts.status as (typeof COD_REMITTANCE_STATUSES)[number]),
    );
  }
  if (opts.dateFrom) conditions.push(gte(codRemittances.collectedAt, new Date(opts.dateFrom)));
  if (opts.dateTo) conditions.push(lte(codRemittances.collectedAt, new Date(opts.dateTo)));

  if (opts.search) {
    const like = `%${opts.search}%`;
    const searchClause = or(
      ilike(codRemittances.orderNumber, like),
      ilike(codRemittances.awbNumber, like),
      ilike(users.email, like),
    );
    if (searchClause) conditions.push(searchClause as unknown as ReturnType<typeof eq>);
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const sortEntries = Object.entries(opts.sort ?? { createdAt: -1 });
  const [sortField, sortDir] = sortEntries[0] ?? ["createdAt", -1];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortColMap: Record<string, any> = {
    createdAt: codRemittances.createdAt,
    codAmount: codRemittances.codAmount,
    remittableAmount: codRemittances.remittableAmount,
    collectedAt: codRemittances.collectedAt,
    creditedAt: codRemittances.creditedAt,
  };
  const sortCol = sortColMap[sortField] ?? codRemittances.createdAt;
  const sortOrderFn = sortDir === 1 ? asc : desc;

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: codRemittances.id,
        userId: codRemittances.userId,
        orderId: codRemittances.orderId,
        orderType: codRemittances.orderType,
        orderNumber: codRemittances.orderNumber,
        awbNumber: codRemittances.awbNumber,
        courierPartner: codRemittances.courierPartner,
        codAmount: codRemittances.codAmount,
        remittableAmount: codRemittances.remittableAmount,
        status: codRemittances.status,
        collectedAt: codRemittances.collectedAt,
        creditedAt: codRemittances.creditedAt,
        utrNumber: codRemittances.utrNumber,
        notes: codRemittances.notes,
        user: {
          email: users.email,
          name: users.name,
          businessName: users.businessName,
        },
      })
      .from(codRemittances)
      .innerJoin(users, eq(users.id, codRemittances.userId))
      .where(whereClause)
      .orderBy(sortOrderFn(sortCol))
      .offset(skip)
      .limit(limit),
    db
      .select({ value: count() })
      .from(codRemittances)
      .innerJoin(users, eq(users.id, codRemittances.userId))
      .where(whereClause),
  ]);

  const total = totalRow[0]?.value ?? 0;

  return {
    remittances: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ── Update notes ──

export async function updateRemittanceNotes(
  remittanceId: string,
  notes: string,
): Promise<ICodRemittance> {
  const [remittance] = await db
    .update(codRemittances)
    .set({ notes, updatedAt: new Date() })
    .where(eq(codRemittances.id, remittanceId))
    .returning();
  if (!remittance) throw new AppError(404, "Remittance not found");
  return remittance;
}

// ── Export data ──

export async function getRemittancesForExport(opts: {
  userId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<ICodRemittance[]> {
  const conditions: ReturnType<typeof eq>[] = [];
  if (opts.userId) conditions.push(eq(codRemittances.userId, opts.userId));
  if (opts.status) {
    conditions.push(
      eq(codRemittances.status, opts.status as (typeof COD_REMITTANCE_STATUSES)[number]),
    );
  }
  if (opts.dateFrom) conditions.push(gte(codRemittances.collectedAt, new Date(opts.dateFrom)));
  if (opts.dateTo) conditions.push(lte(codRemittances.collectedAt, new Date(opts.dateTo)));

  return db
    .select()
    .from(codRemittances)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(codRemittances.createdAt));
}

// keep imports used referenced
void inArray;
void walletTransactions;
