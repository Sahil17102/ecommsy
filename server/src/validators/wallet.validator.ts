import { body, param, query } from "express-validator";

export const walletUserIdValidation = [
  param("userId").isUUID().withMessage("Invalid user ID"),
];

export const listWalletsValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage("limit must be 1-100"),
  query("search").optional().isString().trim(),
  query("sortBy")
    .optional()
    .isIn(["balance", "userName", "createdAt"])
    .withMessage("sortBy must be balance, userName, or createdAt"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder must be asc or desc"),
];

export const listTransactionsValidation = [
  param("userId").isUUID().withMessage("Invalid user ID"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage("limit must be 1-100"),
  query("type")
    .optional()
    .isIn(["credit", "debit"])
    .withMessage("type must be credit or debit"),
  query("dateFrom")
    .optional()
    .isISO8601()
    .withMessage("dateFrom must be a valid ISO date"),
  query("dateTo")
    .optional()
    .isISO8601()
    .withMessage("dateTo must be a valid ISO date"),
];

export const adjustWalletValidation = [
  param("userId").isUUID().withMessage("Invalid user ID"),
  body("type")
    .isIn(["credit", "debit"])
    .withMessage("type must be credit or debit"),
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("amount must be a positive number"),
  body("reason")
    .isString()
    .trim()
    .notEmpty()
    .isLength({ max: 256 })
    .withMessage("reason is required (max 256 chars)"),
  body("notes").optional().isString().trim(),
];
