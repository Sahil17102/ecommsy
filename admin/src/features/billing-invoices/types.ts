import type { Pagination } from "../service-providers/types";

export interface BillingInvoiceItem {
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
  user?: {
    email: string;
    name: string | null;
    businessName: string | null;
  };
}

export interface ListInvoicesResponse {
  invoices: BillingInvoiceItem[];
  pagination: Pagination;
}

export interface ListInvoicesParams {
  search?: string;
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: string;
}

export interface InvoiceOrdersResponse {
  invoice: BillingInvoiceItem;
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

export interface GenerateInvoicePayload {
  userId: string;
  periodStart: string;
  periodEnd: string;
  taxRate?: number;
}
