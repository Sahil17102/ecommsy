/* ─── Regex Patterns ─── */

export const regex = {
  /** 15-character Indian GSTIN format: 22AAAAA0000A1Z5 */
  gstin: /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/,
  /** 6-digit Indian pincode */
  pincode: /^\d{6}$/,
  /** 10-digit Indian phone number */
  phone: /^\d{10}$/,
  /** Basic email format: local@domain.tld */
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  /** Digits only (zero or more) */
  digitsOnly: /^\d*$/,
  /** 10-character Indian PAN: ABCDE1234F */
  pan: /^[A-Z]{5}\d{4}[A-Z]$/,
  /** 21-character Company Identification Number */
  cin: /^[UL]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/,
  /** 11-character IFSC code: SBIN0001234 */
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  /** UPI ID: name@bank */
  upi: /^[\w.-]+@[\w]+$/,
  /** Bank account number: 9-18 digits */
  accountNumber: /^\d{9,18}$/,
} as const;

/* ─── Cache / Stale Times ─── */

/** 5 minutes in ms */
export const STALE_TIME_5M = 1000 * 60 * 5;

/** 1 hour in ms */
export const STALE_TIME_1H = 1000 * 60 * 60;
