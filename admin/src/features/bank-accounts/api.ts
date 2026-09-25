import { api } from "@/lib/api";
import type { BankAccountsResponse, BankAccountResponse } from "./types";

export const adminBankAccountApi = {
  listByUser: async (userId: string): Promise<BankAccountsResponse> => {
    const { data } = await api.get(`/bank-accounts/user/${userId}`);
    return data;
  },

  approve: async (id: string): Promise<BankAccountResponse> => {
    const { data } = await api.post(`/bank-accounts/${id}/approve`);
    return data;
  },

  reject: async (
    id: string,
    rejectionReason: string,
  ): Promise<BankAccountResponse> => {
    const { data } = await api.post(`/bank-accounts/${id}/reject`, {
      rejectionReason,
    });
    return data;
  },
};
