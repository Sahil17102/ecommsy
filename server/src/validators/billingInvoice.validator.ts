import { body, param, query } from "express-validator";

export const listInvoicesValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("search").optional().isString().trim(),
];

export const invoiceIdValidation = [
  param("id").isUUID().withMessage("Invalid invoice ID"),
];

export const generateInvoiceValidation = [
  body("userId").isUUID().withMessage("User ID is required"),
  body("periodStart").isISO8601().withMessage("Period start is required"),
  body("periodEnd").isISO8601().withMessage("Period end is required"),
  body("taxRate").optional().isFloat({ min: 0, max: 100 }),
];

export const billingPreferenceValidation = [
  body("frequency").optional().isIn(["weekly", "monthly", "manual", "custom"]),
  body("autoGenerate").optional().isBoolean(),
  body("customFrequencyDays").optional().isInt({ min: 1, max: 90 }),
];
