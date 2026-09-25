import { body, param, query } from "express-validator";

// ── Common pagination & filters ──

export const listRemittancesValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("status").optional().isIn(["pending", "credited"]),
  query("search").optional().isString().trim(),
  query("dateFrom").optional().isISO8601(),
  query("dateTo").optional().isISO8601(),
];

export const remittanceIdValidation = [
  param("id").isUUID().withMessage("Invalid remittance ID"),
];

export const userIdParamValidation = [
  param("userId").isUUID().withMessage("Invalid user ID"),
];

// ── Admin: manual credit ──

export const creditRemittanceValidation = [
  param("id").isUUID().withMessage("Invalid remittance ID"),
  body("utrNumber").optional().isString().trim(),
  body("creditDate").optional().isISO8601(),
  body("amount").optional().isFloat({ min: 0.01 }),
  body("notes").optional().isString().trim(),
];

// ── Admin: update notes ──

export const updateNotesValidation = [
  param("id").isUUID().withMessage("Invalid remittance ID"),
  body("notes").isString().trim().isLength({ max: 1024 }),
];

// ── Admin: preview CSV ──

export const previewCsvValidation = [
  body("rows").isArray({ min: 1 }).withMessage("rows array is required"),
  body("rows.*.awbNumber").isString().trim().notEmpty(),
  body("rows.*.amount").isFloat({ min: 0 }),
];

// ── Admin: confirm settlement ──

export const confirmSettlementValidation = [
  body("remittanceIds").isArray({ min: 1 }).withMessage("remittanceIds array is required"),
  body("remittanceIds.*").isUUID(),
  body("utrNumber").isString().trim().notEmpty().withMessage("utrNumber is required"),
];
