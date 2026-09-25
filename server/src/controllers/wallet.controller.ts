import type { Request, Response } from "express";
import {
  listWallets,
  getWalletByUserId,
  listTransactions,
  adjustWallet,
  getBalance,
  createWallet,
  TransactionType,
} from "../services/wallet.js";
import { parseSortParams } from "../utils/parseQuery.js";

const TX_SORT_FIELDS = ["createdAt", "amount"];

// ── Admin: list all wallets ──

export async function handleListWallets(req: Request, res: Response) {
  const result = await listWallets({
    search: req.query.search as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    sortBy: req.query.sortBy as string | undefined,
    sortOrder: req.query.sortOrder as "asc" | "desc" | undefined,
  });
  res.json(result);
}

// ── Admin: get wallet for a specific user ──

export async function handleGetUserWallet(req: Request, res: Response) {
  const wallet = await getWalletByUserId(req.params.userId);
  res.json({ wallet });
}

// ── Admin: get transaction history for a user ──

export async function handleGetUserTransactions(req: Request, res: Response) {
  const wallet = await getWalletByUserId(req.params.userId);
  const sort = parseSortParams(req, TX_SORT_FIELDS);
  const result = await listTransactions({
    walletId: wallet.id,
    type: req.query.type as TransactionType | undefined,
    serviceProvider: req.query.serviceProvider as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    sort,
  });
  res.json(result);
}

// ── Admin: manual credit/debit ──

export async function handleAdjustWallet(req: Request, res: Response) {
  const { type, amount, reason, notes } = req.body;
  const result = await adjustWallet({
    userId: req.params.userId,
    type: type as TransactionType,
    amount: Number(amount),
    reason,
    notes,
    adminId: req.userId!,
  });
  res.json({
    message: `Wallet ${type}ed ₹${amount}`,
    wallet: result.wallet,
    transaction: result.transaction,
  });
}

// ── Customer: get own wallet balance ──

export async function handleGetMyBalance(req: Request, res: Response) {
  // createWallet is idempotent — ensures wallet exists for legacy users
  await createWallet(req.userId!);
  const result = await getBalance(req.userId!);
  res.json(result);
}

// ── Customer: get own transaction history ──

export async function handleGetMyTransactions(req: Request, res: Response) {
  const wallet = await getWalletByUserId(req.userId!);
  const sort = parseSortParams(req, TX_SORT_FIELDS);
  const result = await listTransactions({
    walletId: wallet.id,
    type: req.query.type as TransactionType | undefined,
    serviceProvider: req.query.serviceProvider as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    sort,
  });
  res.json(result);
}
