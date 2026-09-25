import { api } from "@/lib/api";
import { downloadBlob } from "@/lib/utils";
import type {
  CodRemittanceStats,
  ListRemittancesResponse,
  ListRemittancesParams,
  CreditRemittancePayload,
  CodRemittanceItem,
  SettlementPreviewResponse,
  ConfirmSettlementPayload,
  ConfirmSettlementResponse,
} from "./types";

export const codRemittanceApi = {
  getStats: async (): Promise<CodRemittanceStats> => {
    const { data } = await api.get("/cod-remittance/stats");
    return data as CodRemittanceStats;
  },

  list: async (params?: ListRemittancesParams): Promise<ListRemittancesResponse> => {
    const { data } = await api.get("/cod-remittance/remittances", { params });
    return data as ListRemittancesResponse;
  },

  getUserRemittances: async (
    userId: string,
    params?: ListRemittancesParams,
  ): Promise<ListRemittancesResponse> => {
    const { data } = await api.get(`/cod-remittance/users/${userId}/remittances`, { params });
    return data as ListRemittancesResponse;
  },

  credit: async (
    id: string,
    payload: CreditRemittancePayload,
  ): Promise<{ message: string; remittance: CodRemittanceItem }> => {
    const { data } = await api.post(`/cod-remittance/remittances/${id}/credit`, payload);
    return data as { message: string; remittance: CodRemittanceItem };
  },

  updateNotes: async (
    id: string,
    notes: string,
  ): Promise<{ message: string; remittance: CodRemittanceItem }> => {
    const { data } = await api.patch(`/cod-remittance/remittances/${id}/notes`, { notes });
    return data as { message: string; remittance: CodRemittanceItem };
  },

  autoCredit: async (
    daysOld?: number,
  ): Promise<{ message: string; credited: number; failed: number }> => {
    const { data } = await api.post("/cod-remittance/remittances/auto-credit", { daysOld });
    return data as { message: string; credited: number; failed: number };
  },

  previewSettlementCsv: async (
    rows: Array<{ awbNumber: string; amount: number }>,
  ): Promise<SettlementPreviewResponse> => {
    const { data } = await api.post("/cod-remittance/preview-settlement-csv", { rows });
    return data as SettlementPreviewResponse;
  },

  confirmSettlement: async (
    payload: ConfirmSettlementPayload,
  ): Promise<ConfirmSettlementResponse> => {
    const { data } = await api.post("/cod-remittance/confirm-settlement", payload);
    return data as ConfirmSettlementResponse;
  },

  downloadCsvTemplate: async (): Promise<void> => {
    const { data } = await api.get("/cod-remittance/csv-template", {
      responseType: "blob",
    });
    downloadBlob(data as Blob, "settlement-csv-template.csv");
  },

  export: async (params?: { status?: string; dateFrom?: string; dateTo?: string }): Promise<void> => {
    const { data } = await api.get("/cod-remittance/remittances/export", {
      params,
      responseType: "blob",
    });
    downloadBlob(data as Blob, "cod-remittances.csv");
  },
};
