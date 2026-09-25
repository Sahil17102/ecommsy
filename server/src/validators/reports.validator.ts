import { body, query, type ValidationChain } from "express-validator";
import {
  FIELD_KEYS,
  MAX_DATE_RANGE_DAYS,
  ORDER_STATUSES,
  PAYMENT_TYPES,
} from "../services/reports.service.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Shared date-range validator — required, valid ISO, and within MAX_DATE_RANGE_DAYS */
function dateRangeValidator(source: "body" | "query"): ValidationChain[] {
  const field = source === "body" ? body : query;
  return [
    field("from")
      .exists({ checkNull: true }).withMessage("`from` date is required")
      .bail()
      .isISO8601().withMessage("`from` must be a valid ISO date"),
    field("to")
      .exists({ checkNull: true }).withMessage("`to` date is required")
      .bail()
      .isISO8601().withMessage("`to` must be a valid ISO date")
      .bail()
      .custom((to, { req }) => {
        const from = source === "body" ? req.body?.from : req.query?.from;
        if (!from) return true; // earlier rule will fail
        const fromDate = new Date(from);
        const toDate = new Date(to);
        if (toDate < fromDate) {
          throw new Error("`to` must be on or after `from`");
        }
        const diffDays = (toDate.getTime() - fromDate.getTime()) / MS_PER_DAY;
        if (diffDays > MAX_DATE_RANGE_DAYS) {
          throw new Error(`Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days (about 6 months)`);
        }
        return true;
      }),
  ];
}

// ── POST /reports/generate ──

export const generateReportValidation: ValidationChain[] = [
  body("fields")
    .isArray({ min: 1 }).withMessage("At least one field is required")
    .bail()
    .custom((fields: unknown[]) => {
      const invalid = fields.filter((f) => typeof f !== "string" || !FIELD_KEYS.has(f as string));
      if (invalid.length > 0) {
        throw new Error(`Invalid fields: ${invalid.join(", ")}`);
      }
      return true;
    }),

  // Date range lives at body root (not under filters) for ergonomic validation
  ...dateRangeValidator("body"),

  body("filters").optional().isObject(),
  body("filters.status").optional().isArray(),
  body("filters.status.*").optional().isIn(ORDER_STATUSES as readonly string[]),
  body("filters.paymentType").optional().isArray(),
  body("filters.paymentType.*").optional().isIn(PAYMENT_TYPES as readonly string[]),
  body("filters.orderType").optional().isIn(["B2B", "B2C"]),
  body("filters.courier").optional().isArray(),
  body("filters.city").optional().isString().trim().isLength({ max: 100 }),
  body("filters.state").optional().isString().trim().isLength({ max: 100 }),
  body("filters.pincode").optional().isString().trim().isLength({ max: 10 }),
  body("filters.weightMin").optional().isFloat({ min: 0 }),
  body("filters.weightMax").optional().isFloat({ min: 0 }),
  body("filters.amountMin").optional().isFloat({ min: 0 }),
  body("filters.amountMax").optional().isFloat({ min: 0 }),
];

// ── GET /reports/preview ──

export const previewReportValidation: ValidationChain[] = [
  ...dateRangeValidator("query"),
  query("status").optional().isString(),
  query("paymentType").optional().isString(),
  query("orderType").optional().isIn(["B2B", "B2C"]),
  query("courier").optional().isString(),
];

// ── Admin variants — same as customer ones plus optional userId filter ──

export const adminGenerateReportValidation: ValidationChain[] = [
  ...generateReportValidation,
  body("filters.userId").optional().isUUID().withMessage("Invalid userId"),
];

export const adminPreviewReportValidation: ValidationChain[] = [
  ...previewReportValidation,
  query("userId").optional().isUUID().withMessage("Invalid userId"),
];
