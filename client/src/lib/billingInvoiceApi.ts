import { api } from "./api";
import { downloadBlob } from "./utils";

export interface BillingInvoice {
  id: string;
  userId: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  status: "generated" | "void";
  type: "weekly" | "monthly_summary" | "manual";
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstRate: number;
  totalAmount: number;
  orderCount: number;
  orderNumbers: string[];
  pdfUrl?: string;
  csvUrl?: string;
  remarks?: string;
  createdAt: string;
}

export interface ListInvoicesResponse {
  invoices: BillingInvoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface InvoiceOrdersResponse {
  invoice: BillingInvoice;
  orders: Array<{
    id: string;
    orderId: string;
    orderType: string;
    awb: string;
    status: string;
    rate: {
      freightCharge: number;
      codCharges: number;
      otherCharges?: number;
      totalCharge: number;
    };
    orderDate: string;
  }>;
}

export interface BillingPreference {
  id: string;
  userId: string;
  frequency: "weekly" | "monthly" | "manual" | "custom";
  autoGenerate: boolean;
  customFrequencyDays?: number;
}

export const billingInvoiceApi = {
  list: async (params?: {
    page?: number;
    limit?: number;
    sortField?: string;
    sortOrder?: string;
  }): Promise<ListInvoicesResponse> => {
    const { data } = await api.get<ListInvoicesResponse>("/billing-invoices", { params });
    return data;
  },

  getOrders: async (id: string): Promise<InvoiceOrdersResponse> => {
    const { data } = await api.get<InvoiceOrdersResponse>(`/billing-invoices/${id}/orders`);
    return data;
  },

  generate: async (payload: {
    periodStart: string;
    periodEnd: string;
  }): Promise<{ message: string; invoice: BillingInvoice }> => {
    const { data } = await api.post("/billing-invoices/generate", payload);
    return data as { message: string; invoice: BillingInvoice };
  },

  getPreferences: async (): Promise<BillingPreference> => {
    const { data } = await api.get<BillingPreference>("/billing-invoices/preferences");
    return data;
  },

  updatePreferences: async (
    payload: Partial<Pick<BillingPreference, "frequency" | "autoGenerate" | "customFrequencyDays">>,
  ): Promise<BillingPreference> => {
    const { data } = await api.patch<BillingPreference>("/billing-invoices/preferences", payload);
    return data;
  },

  downloadDoc: async (id: string, type: "pdf" | "csv", invoiceNumber: string): Promise<void> => {
    const res = await api.get(`/billing-invoices/${id}/download/${type}`, { responseType: "blob" });
    const blob = res.data as Blob;

    // If the server returned a JSON error with a blob content-type, parse it
    if (blob.type === "application/json") {
      const text = await blob.text();
      const json = JSON.parse(text);
      throw new Error(json.error || "Download failed");
    }

    downloadBlob(blob, `${invoiceNumber}.${type}`);
  },
};
