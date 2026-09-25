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
  /** Admin-only: scope to a specific merchant */
  userId?: string;
}
