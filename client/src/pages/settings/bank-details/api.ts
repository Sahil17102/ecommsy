import { api } from "@/lib/api";
import type {
  BankAccountsResponse,
  BankAccountResponse,
} from "./types";

export const bankAccountApi = {
  list: async (): Promise<BankAccountsResponse> => {
    const { data } = await api.get("/bank-accounts");
    return data;
  },

  /** Add bank account — uses FormData for cancelled cheque upload */
  addBankAccount: async (formData: FormData): Promise<BankAccountResponse> => {
    const { data } = await api.post("/bank-accounts", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  /** Add UPI account — plain JSON */
  addUpi: async (payload: {
    accountHolderName: string;
    upiId: string;
  }): Promise<BankAccountResponse> => {
    const { data } = await api.post("/bank-accounts", {
      ...payload,
      type: "upi",
    });
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/bank-accounts/${id}`);
  },

  setPrimary: async (id: string): Promise<BankAccountResponse> => {
    const { data } = await api.patch(`/bank-accounts/${id}/set-primary`);
    return data;
  },
};
