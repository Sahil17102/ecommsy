import { api } from "./api";

export interface WalletBalance {
  balance: number;
  currency: string;
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

export interface WalletTransactionStats {
  totalCredits: number;
  totalDebits: number;
}

export interface WalletTransactionsResponse {
  transactions: WalletTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: WalletTransactionStats;
  courierOptions: string[];
}

export interface CreateRechargeOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface VerifyRechargeResponse {
  message: string;
  balance: number;
  creditedAmount: number;
}

export const walletApi = {
  getBalance: async (): Promise<WalletBalance> => {
    const { data } = await api.get<WalletBalance>("/wallet/balance");
    return data;
  },

  getTransactions: async (params?: {
    type?: "credit" | "debit";
    serviceProvider?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    sortField?: string;
    sortOrder?: string;
  }): Promise<WalletTransactionsResponse> => {
    const { data } = await api.get<WalletTransactionsResponse>(
      "/wallet/transactions",
      { params },
    );
    return data;
  },

  createRechargeOrder: async (amount: number): Promise<CreateRechargeOrderResponse> => {
    const { data } = await api.post<CreateRechargeOrderResponse>(
      "/wallet/recharge/create-order",
      { amount },
    );
    return data;
  },

  verifyRecharge: async (payload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): Promise<VerifyRechargeResponse> => {
    const { data } = await api.post<VerifyRechargeResponse>(
      "/wallet/recharge/verify",
      payload,
    );
    return data;
  },
};
