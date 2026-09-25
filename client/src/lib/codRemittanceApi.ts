import { api } from "./api";
import { downloadBlob } from "./utils";

export interface CodRemittanceItem {
  id: string;
  userId: string;
  orderId: string;
  orderType: "B2B" | "B2C";
  orderNumber: string;
  awbNumber: string;
  courierPartner: string;
  codAmount: number;
  remittableAmount: number;
  status: "pending" | "credited";
  collectedAt: string;
  creditedAt?: string;
  walletTransactionId?: string;
  utrNumber?: string;
}

export interface CodRemittanceStats {
  remittedTillDate: number;
  remittedCount: number;
  lastRemittanceAmount: number;
  pendingAmount: number;
  pendingCount: number;
}

export interface ListRemittancesResponse {
  remittances: CodRemittanceItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const codRemittanceApi = {
  getStats: async (): Promise<CodRemittanceStats> => {
    const { data } = await api.get<CodRemittanceStats>("/cod-remittance/stats");
    return data;
  },

  list: async (params?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    sortField?: string;
    sortOrder?: string;
  }): Promise<ListRemittancesResponse> => {
    const { data } = await api.get<ListRemittancesResponse>("/cod-remittance/remittances", {
      params,
    });
    return data;
  },

  export: async (params?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<void> => {
    const { data } = await api.get("/cod-remittance/remittances/export", {
      params,
      responseType: "blob",
    });
    downloadBlob(data as Blob, "cod-remittances.csv");
  },

  exportSingle: async (id: string): Promise<Record<string, unknown>> => {
    const { data } = await api.get(`/cod-remittance/remittances/${id}/export`);
    return data as Record<string, unknown>;
  },
};
