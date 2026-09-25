import { and, asc, desc, eq, gte, lte, sql, ilike, or, isNotNull, count } from "drizzle-orm";
import { db } from "../config/db.js";
import { wallets, walletTransactions, users } from "../db/schema.js";
import type { Pagination } from "../types/index.js";
import { AppError } from "../utils/AppError.js";
import logger from "../config/logger.js";

// Wallet transaction type enum (inlined from old model)
export enum TransactionType {
  CREDIT = "credit",
  DEBIT = "debit",
}
export const TRANSACTION_TYPES = Object.values(TransactionType);

export type IWallet = typeof wallets.$inferSelect;
export type IWalletTransaction = typeof walletTransactions.$inferSelect;

export class WalletError extends AppError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = "WalletError";
  }
}

// numeric columns come back as strings — helper to coerce
function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : Number(v);
}

// ── Wallet lifecycle ──

/**
 * Creates a wallet for a user. Idempotent — returns existing wallet if one exists.
 */
export async function createWallet(userId: string): Promise<IWallet> {
  const existing = await db.query.wallets.findFirst({ where: eq(wallets.userId, userId) });
  if (existing) return existing;

  const [wallet] = await db.insert(wallets).values({ userId }).returning();
  logger.info(`[Wallet] Created wallet for userId=${userId} walletId=${wallet.id}`);
  return wallet;
}

/**
 * Get wallet by userId. Throws if not found.
 */
export async function getWalletByUserId(userId: string): Promise<IWallet> {
  const wallet = await db.query.wallets.findFirst({ where: eq(wallets.userId, userId) });
  if (!wallet) throw new WalletError(404, "Wallet not found for this user");
  return wallet;
}

/**
 * Get wallet balance for a user.
 */
export async function getBalance(userId: string): Promise<{ balance: number; currency: string }> {
  const wallet = await getWalletByUserId(userId);
  return { balance: toNum(wallet.balance), currency: wallet.currency };
}

// ── Core mutation: single point of wallet balance change ──

export interface CreateTransactionInput {
  walletId: string;
  amount: number;
  type: TransactionType;
  reason: string;
  ref?: string;
  meta?: Record<string, unknown>;
}

/**
 * The single point of mutation for all wallet balance changes.
 *
 * Uses atomic SQL `balance + delta` to avoid read-then-write race conditions.
 * For debits, uses a `balance >= amount` condition to prevent negative balances atomically.
 *
 * Every call creates an immutable wallet_transaction record.
 */
export async function createWalletTransaction(
  input: CreateTransactionInput,
): Promise<IWalletTransaction> {
  const { walletId, amount, type, reason, ref, meta } = input;

  if (amount <= 0) {
    throw new WalletError(400, "Transaction amount must be positive");
  }

  const isDebit = type === TransactionType.DEBIT;
  const delta = isDebit ? -amount : amount;

  // Atomic balance update — for debits, only succeeds if balance >= amount
  const whereClause = isDebit
    ? and(eq(wallets.id, walletId), gte(wallets.balance, String(amount)))
    : eq(wallets.id, walletId);

  const [updated] = await db
    .update(wallets)
    .set({
      balance: sql`${wallets.balance} + ${delta}`,
      updatedAt: new Date(),
    })
    .where(whereClause)
    .returning();

  if (!updated) {
    if (isDebit) {
      throw new WalletError(400, "Insufficient wallet balance");
    }
    throw new WalletError(404, "Wallet not found");
  }

  // Append to immutable ledger
  const [txn] = await db
    .insert(walletTransactions)
    .values({
      walletId,
      amount: String(amount),
      currency: updated.currency,
      type,
      reason,
      ref,
      meta,
    })
    .returning();

  const newBalance = toNum(updated.balance);
  logger.info(
    `[Wallet] ${type} ₹${amount} walletId=${walletId} reason="${reason}" newBalance=${newBalance}`,
  );

  // Low-balance alert — fires once when the balance crosses the threshold downward.
  const LOW_BALANCE_THRESHOLD = Number(process.env.WALLET_LOW_BALANCE_THRESHOLD ?? 250);
  if (
    isDebit &&
    newBalance < LOW_BALANCE_THRESHOLD &&
    newBalance + amount >= LOW_BALANCE_THRESHOLD
  ) {
    (async () => {
      const { notifyAsync, notifyAdmins } = await import("./notificationService.js");
      const userId = updated.userId;
      notifyAsync({
        userId,
        event: "wallet.low_balance",
        data: { balance: newBalance },
      });
      const seller = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { name: true, firstName: true, email: true },
      });
      notifyAdmins("admin.low_wallet_alert", {
        balance: newBalance,
        sellerName: seller?.name ?? seller?.firstName ?? "A seller",
      });
    })().catch(() => {});
  }

  return txn;
}

// ── Transaction history ──

export interface TransactionStats {
  totalCredits: number;
  totalDebits: number;
}

export interface ListTransactionsResult {
  transactions: IWalletTransaction[];
  pagination: Pagination;
  stats: TransactionStats;
  courierOptions: string[];
}

export async function listTransactions(opts: {
  walletId: string;
  type?: TransactionType;
  serviceProvider?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}): Promise<ListTransactionsResult> {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const skip = (page - 1) * limit;

  const conditions = [eq(walletTransactions.walletId, opts.walletId)];

  if (opts.type) conditions.push(eq(walletTransactions.type, opts.type));

  if (opts.serviceProvider) {
    conditions.push(sql`${walletTransactions.meta}->>'service_provider' = ${opts.serviceProvider}`);
  }

  if (opts.dateFrom) conditions.push(gte(walletTransactions.createdAt, new Date(opts.dateFrom)));
  if (opts.dateTo) conditions.push(lte(walletTransactions.createdAt, new Date(opts.dateTo)));

  const whereClause = and(...conditions);

  // Determine sort
  const sortEntries = Object.entries(opts.sort ?? { createdAt: -1 });
  const [sortField, sortDir] = sortEntries[0] ?? ["createdAt", -1];
  const sortCol =
    sortField === "amount" ? walletTransactions.amount : walletTransactions.createdAt;
  const sortOrderFn = sortDir === 1 ? asc : desc;

  const [totalRow, transactions, statsResult, courierOptionsRows] = await Promise.all([
    db.select({ value: count() }).from(walletTransactions).where(whereClause),
    db
      .select()
      .from(walletTransactions)
      .where(whereClause)
      .orderBy(sortOrderFn(sortCol))
      .offset(skip)
      .limit(limit),
    // Stats scoped to the same filters as the list query
    db
      .select({
        totalCredits: sql<number>`coalesce(sum(case when ${walletTransactions.type} = 'credit' then ${walletTransactions.amount}::numeric else 0 end), 0)`,
        totalDebits: sql<number>`coalesce(sum(case when ${walletTransactions.type} = 'debit' then ${walletTransactions.amount}::numeric else 0 end), 0)`,
      })
      .from(walletTransactions)
      .where(whereClause),
    // Distinct service providers across all wallet transactions for this wallet (unfiltered)
    db
      .selectDistinct({
        sp: sql<string>`${walletTransactions.meta}->>'service_provider'`,
      })
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.walletId, opts.walletId),
          sql`${walletTransactions.meta}->>'service_provider' IS NOT NULL`,
        ),
      ),
  ]);

  const total = totalRow[0]?.value ?? 0;

  const stats: TransactionStats = {
    totalCredits: Number(statsResult[0]?.totalCredits ?? 0),
    totalDebits: Number(statsResult[0]?.totalDebits ?? 0),
  };

  const courierOptions = courierOptionsRows
    .map((r) => r.sp)
    .filter((s): s is string => !!s)
    .sort();

  return {
    transactions,
    courierOptions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    stats,
  };
}

// ── Admin: list all wallets ──

export interface WalletListItem {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userPhone: string | null;
  businessName: string | null;
  balance: number;
  currency: string;
  plan: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListWalletsResult {
  wallets: WalletListItem[];
  pagination: Pagination;
  stats: {
    totalWallets: number;
    totalBalance: number;
    walletsWithBalance: number;
    walletsEmpty: number;
  };
}

export async function listWallets(opts?: {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}): Promise<ListWalletsResult> {
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortOrderFn = opts?.sortOrder === "asc" ? asc : desc;

  // Build conditions for search
  const conditions: ReturnType<typeof eq>[] = [];
  if (opts?.search) {
    const like = `%${opts.search}%`;
    const searchClause = or(
      ilike(users.name, like),
      ilike(users.email, like),
      ilike(users.phone, like),
      ilike(users.businessName, like),
    );
    if (searchClause) conditions.push(searchClause as unknown as ReturnType<typeof eq>);
  }
  const whereClause = conditions.length ? and(...conditions) : undefined;

  // Determine sort column
  const sortCol =
    opts?.sortBy === "balance"
      ? wallets.balance
      : opts?.sortBy === "userName"
        ? users.name
        : wallets.createdAt;

  const [rows, totalRow, statsRow] = await Promise.all([
    db
      .select({
        id: wallets.id,
        userId: wallets.userId,
        balance: wallets.balance,
        currency: wallets.currency,
        createdAt: wallets.createdAt,
        updatedAt: wallets.updatedAt,
        userName: users.name,
        userEmail: users.email,
        userPhone: users.phone,
        businessName: users.businessName,
        plan: users.plan,
        isActive: users.isActive,
      })
      .from(wallets)
      .innerJoin(users, eq(users.id, wallets.userId))
      .where(whereClause)
      .orderBy(sortOrderFn(sortCol))
      .offset(skip)
      .limit(limit),
    db
      .select({ value: count() })
      .from(wallets)
      .innerJoin(users, eq(users.id, wallets.userId))
      .where(whereClause),
    db
      .select({
        totalWallets: count(),
        totalBalance: sql<number>`coalesce(sum(${wallets.balance}::numeric), 0)`,
        walletsWithBalance: sql<number>`coalesce(sum(case when ${wallets.balance}::numeric > 0 then 1 else 0 end), 0)`,
        walletsEmpty: sql<number>`coalesce(sum(case when ${wallets.balance}::numeric = 0 then 1 else 0 end), 0)`,
      })
      .from(wallets),
  ]);

  const walletsOut: WalletListItem[] = rows.map((w) => ({
    id: w.id,
    userId: w.userId,
    userName: w.userName ?? null,
    userEmail: w.userEmail ?? null,
    userPhone: w.userPhone ?? null,
    businessName: w.businessName ?? null,
    balance: toNum(w.balance),
    currency: w.currency,
    plan: w.plan ?? "basic",
    isActive: w.isActive ?? true,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  }));

  const total = totalRow[0]?.value ?? 0;
  const stats = statsRow[0] ?? {
    totalWallets: 0,
    totalBalance: 0,
    walletsWithBalance: 0,
    walletsEmpty: 0,
  };

  return {
    wallets: walletsOut,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    stats: {
      totalWallets: Number(stats.totalWallets) || 0,
      totalBalance: Number(stats.totalBalance) || 0,
      walletsWithBalance: Number(stats.walletsWithBalance) || 0,
      walletsEmpty: Number(stats.walletsEmpty) || 0,
    },
  };
}

// ── Admin: manual adjustment ──

export async function adjustWallet(opts: {
  userId: string;
  type: TransactionType;
  amount: number;
  reason: string;
  notes?: string;
  adminId: string;
}): Promise<{ wallet: IWallet; transaction: IWalletTransaction }> {
  const wallet = await getWalletByUserId(opts.userId);

  const transaction = await createWalletTransaction({
    walletId: wallet.id,
    amount: opts.amount,
    type: opts.type,
    reason: opts.reason,
    ref: `admin_adjustment_${Date.now()}`,
    meta: {
      adjustedBy: opts.adminId,
      notes: opts.notes,
      timestamp: new Date().toISOString(),
    },
  });

  const updatedWallet = await db.query.wallets.findFirst({ where: eq(wallets.id, wallet.id) });
  return { wallet: updatedWallet!, transaction };
}
// Suppress unused isNotNull import warning — kept for symmetry with cheat-sheet patterns
void isNotNull;
