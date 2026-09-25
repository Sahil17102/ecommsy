import type { Pagination } from "../service-providers/types";

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
  utrNumber?: string;
  notes?: string;
  user?: {
    email: string;
    name: string | null;
    businessName: string | null;
  };
}

export interface CodRemittanceStats {
  totalPending: number;
  todayCredited: number;
  totalCredited: number;
  usersWithPending: number;
}

export interface ListRemittancesResponse {
  remittances: CodRemittanceItem[];
  pagination: Pagination;
}

export interface ListRemittancesParams {
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: string;
}

export interface CreditRemittancePayload {
  utrNumber?: string;
  creditDate?: string;
  amount?: number;
  notes?: string;
}

export interface SettlementPreviewItem {
  awbNumber: string;
  courierAmount: number;
  remittanceId?: string;
  ourAmount?: number;
  category: "matched" | "discrepancy" | "not_found" | "already_credited";
  difference?: number;
}

export interface SettlementPreviewResponse {
  items: SettlementPreviewItem[];
  summary: {
    matched: number;
    discrepancies: number;
    notFound: number;
    alreadyCredited: number;
  };
}

export interface ConfirmSettlementPayload {
  remittanceIds: string[];
  utrNumber: string;
}

export interface ConfirmSettlementResponse {
  message: string;
  credited: number;
  failed: number;
  errors: string[];
}
