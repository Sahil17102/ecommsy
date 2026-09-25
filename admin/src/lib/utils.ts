/**
 * Word-level overrides for formatKeyword — acronyms, abbreviations, etc.
 * Keys must be lowercase.
 */
const KEYWORD_OVERRIDES: Record<string, string> = {
  utr: "UTR",
  llp: "LLP",
  gst: "GST",
  pan: "PAN",
  cod: "COD",
  awb: "AWB",
  kyc: "KYC",
  ndr: "NDR",
  rto: "RTO",
  api: "API",
  id: "ID",
  otp: "OTP",
  sku: "SKU",
  ifsc: "IFSC",
  aadhaar: "Aadhaar",
  shipexindia: "Shipex India"
};

/**
 * Convert a snake_case / camelCase key into a human-readable label.
 * Applies word-level overrides for acronyms (UTR, LLP, GST, etc.).
 *
 * Examples:
 *   "partnership_firm"  → "Partnership Firm"
 *   "one_person_company" → "One Person Company"
 *   "llp"               → "LLP"
 *   "utr_number"        → "UTR Number"
 *   "section_8_company" → "Section 8 Company"
 */
export function formatKeyword(key: string | null | undefined): string {
  if (!key) return "—";

  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase → spaced
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => {
      const lower = word.toLowerCase();
      return KEYWORD_OVERRIDES[lower] ?? lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/**
 * Format number as Indian Rupee (₹) with en-IN locale grouping.
 * E.g., ₹11,74,325.51
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  // Postgres `numeric` arrives as a string, and a missing field must never
  // render as "₹NaN" — show a dash instead.
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Weights are stored in grams — render them as "1.25 kg". */
export function formatWeight(grams: number | string | null | undefined): string {
  const value = typeof grams === "string" ? Number(grams) : grams;
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  return `${(value / 1000).toFixed(2)} kg`;
}

export interface AddressLike {
  contactName?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  nickname?: string | null;
}

/** One-line address — used as the tooltip behind a truncated city/pincode cell. */
export function formatAddress(addr?: AddressLike | null): string {
  if (!addr) return "—";
  const line = [addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.pincode]
    .filter(Boolean)
    .join(", ");
  return line || "—";
}

/** "City, 110001" — the compact form shown in a table cell. */
export function formatCityPincode(addr?: AddressLike | null): string {
  if (!addr) return "—";
  return [addr.city, addr.pincode].filter(Boolean).join(", ") || "—";
}

/** Format a date string as "25 Feb 2026" */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format a date string as "25 Feb 2026, 02:30 pm" */
export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Export an array of objects as a CSV file download.
 * @param data       Array of row objects
 * @param filename   Output filename (without extension)
 * @param columns    Optional column config to control order/labels.
 *                   If omitted, all keys from the first row are used.
 */
export function exportToCsv<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[],
): void {
  if (!data.length) return;

  const cols =
    columns ?? (Object.keys(data[0]) as (keyof T)[]).map((k) => ({ key: k, label: String(k) }));

  const escape = (val: unknown): string => {
    const str = val == null ? "" : String(val);
    return str.includes(",") || str.includes('"') || str.includes("\n")
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const header = cols.map((c) => escape(c.label)).join(",");
  const rows = data.map((row) => cols.map((c) => escape(row[c.key])).join(","));
  const csv = [header, ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Trigger a browser file download from a Blob. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Human-readable relative time: "Just now", "5m ago", "3h ago", "2d ago", or formatted date */
export function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}
