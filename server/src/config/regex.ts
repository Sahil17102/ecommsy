/**
 * Centralized regex patterns used across the server.
 * Mirrors client/src/lib/constants.ts → regex
 */

export const regex = {
  /** 10-digit Indian phone number */
  phone: /^\d{10}$/,

  /** 6-digit Indian pincode */
  pincode: /^\d{6}$/,

  /** 15-character Indian GSTIN: 22AAAAA0000A1Z5 */
  gstin: /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/,

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
