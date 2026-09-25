import { api } from "@/lib/api";
import type {
  ListWalletsResponse,
  ListWalletsParams,
  ListTransactionsResponse,
  ListTransactionsParams,
  AdjustWalletPayload,
  WalletListItem,
  WalletTransaction,
} from "./types";

export const walletsApi = {
  list: async (params?: ListWalletsParams) => {
    const { data } = await api.get<ListWalletsResponse>("/wallets", { params });
    return data;
  },

  getByUserId: async (userId: string) => {
    const { data } = await api.get<{ wallet: WalletListItem }>(`/wallets/${userId}`);
    return data;
  },

  transactions: async ({ userId, ...params }: ListTransactionsParams) => {
    const { data } = await api.get<ListTransactionsResponse>(
      `/wallets/${userId}/transactions`,
      { params },
    );
    return data;
  },

  adjust: async (userId: string, payload: AdjustWalletPayload) => {
    const { data } = await api.post<{
      message: string;
      wallet: WalletListItem;
      transaction: WalletTransaction;
    }>(`/wallets/${userId}/adjust`, payload);
    return data;
  },
};
