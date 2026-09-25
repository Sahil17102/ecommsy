import { api } from "./api";
import { downloadBlob } from "./utils";

export interface ReportField {
  key: string;
  label: string;
}

/** Maximum date range allowed by the server (must match server constant) */
export const MAX_REPORT_RANGE_DAYS = 186;

export interface ReportFilters {
  /** Required — ISO date (YYYY-MM-DD). Range cannot exceed MAX_REPORT_RANGE_DAYS. */
  from: string;
  /** Required — ISO date (YYYY-MM-DD). */
  to: string;
  status?: string[];
  paymentType?: string[];
  orderType?: string;
  courier?: string[];
  city?: string;
  state?: string;
  pincode?: string;
  weightMin?: number;
  weightMax?: number;
  amountMin?: number;
  amountMax?: number;
}

export const reportsApi = {
  /** Fetch available report fields */
  async getFields(): Promise<ReportField[]> {
    const { data } = await api.get<{ fields: ReportField[] }>("/reports/fields");
    return data.fields;
  },

  /** Get count of orders matching filters */
  async getPreview(filters: ReportFilters): Promise<number> {
    const params: Record<string, string> = {
      from: filters.from,
      to: filters.to,
    };
    if (filters.status?.length) params.status = filters.status.join(",");
    if (filters.paymentType?.length) params.paymentType = filters.paymentType.join(",");
    if (filters.orderType) params.orderType = filters.orderType;
    if (filters.courier?.length) params.courier = filters.courier.join(",");
    const { data } = await api.get<{ count: number }>("/reports/preview", { params });
    return data.count;
  },

  /** Download CSV report */
  async downloadCsv(fields: string[], filters: ReportFilters): Promise<void> {
    // Server expects `from` / `to` at body root; remaining filters under `filters`
    const { from, to, ...rest } = filters;
    const { data } = await api.post(
      "/reports/generate",
      { fields, from, to, filters: rest },
      { responseType: "blob" },
    );
    const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `report_${new Date().toISOString().split("T")[0]}.csv`);
  },
};
