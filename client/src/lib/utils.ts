/**
 * Project-specific utility functions.
 */

/**
 * Format a number as Indian Rupee currency (₹).
 * Uses en-IN locale for proper Indian number grouping (e.g., ₹11,74,325.51).
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

/**
 * Format an ISO date string as "02 Mar 2026" (en-IN).
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format an ISO date string as "02:30 pm" (en-IN).
 */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Human-readable relative time: "just now", "5m ago", "3h ago", "2d ago", or formatted date */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

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

/** @deprecated Use `formatKeyword` instead */
export const humanize = formatKeyword;

/**
 * Trigger a browser file download from a Blob.
 */
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

/**
 * Convert a number to Indian currency words.
 * e.g. 1234567.89 → "Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Rupees and Eighty Nine Paise"
 */
export function amountToWords(amount: number): string {
  if (amount === 0) return "Zero Rupees";
  if (!Number.isFinite(amount)) return "";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  function twoDigits(n: number): string {
    if (n < 20) return ones[n];
    return (tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "")).trim();
  }

  function threeDigits(n: number): string {
    if (n === 0) return "";
    if (n < 100) return twoDigits(n);
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + twoDigits(n % 100) : "");
  }

  // Indian numbering: Crore (10^7), Lakh (10^5), Thousand (10^3), Hundred
  function wholeToWords(n: number): string {
    if (n === 0) return "";
    const parts: string[] = [];
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;

    if (crore) parts.push(twoDigits(crore) + " Crore");
    if (lakh) parts.push(twoDigits(lakh) + " Lakh");
    if (thousand) parts.push(twoDigits(thousand) + " Thousand");
    if (n) parts.push(threeDigits(n));

    return parts.join(" ");
  }

  const abs = Math.abs(amount);
  const whole = Math.floor(abs);
  const paise = Math.round((abs - whole) * 100);

  const parts: string[] = [];
  if (whole > 0) parts.push(wholeToWords(whole) + " Rupees");
  if (paise > 0) parts.push(twoDigits(paise) + " Paise");

  const result = parts.join(" and ") || "Zero Rupees";
  return amount < 0 ? "Minus " + result : result;
}

/**
 * Download an array of records as a CSV file (client-side, no server round-trip).
 * `columns` picks + orders + labels the fields; omit to dump every key.
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
