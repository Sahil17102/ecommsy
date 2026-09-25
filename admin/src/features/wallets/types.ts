import type { Pagination } from "../service-providers/types";

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
  createdAt: string;
  updatedAt: string;
}

export interface WalletStats {
  totalWallets: number;
  totalBalance: number;
  walletsWithBalance: number;
  walletsEmpty: number;
}

export interface ListWalletsResponse {
  wallets: WalletListItem[];
  pagination: Pagination;
  stats: WalletStats;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  amount: number;
  currency: string;
  type: "credit" | "debit";
  reason: string;
  ref?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export interface ListTransactionsResponse {
  transactions: WalletTransaction[];
  pagination: Pagination;
}

export interface AdjustWalletPayload {
  type: "credit" | "debit";
  amount: number;
  reason: string;
  notes?: string;
}

export interface ListWalletsParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "balance" | "userName" | "createdAt";
  sortOrder?: "asc" | "desc";
  sortField?: string;
}

export interface ListTransactionsParams {
  userId: string;
  type?: "credit" | "debit";
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: string;
}
