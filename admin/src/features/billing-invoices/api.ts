import { api } from "@/lib/api";
import { downloadBlob } from "@/lib/utils";
import type {
  ListInvoicesResponse,
  ListInvoicesParams,
  InvoiceOrdersResponse,
  BillingInvoiceItem,
  GenerateInvoicePayload,
} from "./types";

export const billingInvoicesApi = {
  list: async (params?: ListInvoicesParams): Promise<ListInvoicesResponse> => {
    const { data } = await api.get("/billing-invoices", { params });
    return data as ListInvoicesResponse;
  },

  getOrders: async (id: string): Promise<InvoiceOrdersResponse> => {
    const { data } = await api.get(`/billing-invoices/${id}/orders`);
    return data as InvoiceOrdersResponse;
  },

  voidInvoice: async (
    id: string,
  ): Promise<{ message: string; invoice: BillingInvoiceItem }> => {
    const { data } = await api.post(`/billing-invoices/${id}/void`);
    return data as { message: string; invoice: BillingInvoiceItem };
  },

  generate: async (
    payload: GenerateInvoicePayload,
  ): Promise<{ message: string; invoice: BillingInvoiceItem }> => {
    const { data } = await api.post("/billing-invoices/generate", payload);
    return data as { message: string; invoice: BillingInvoiceItem };
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
