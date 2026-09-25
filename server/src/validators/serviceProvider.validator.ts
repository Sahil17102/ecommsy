import { body, param, query } from "express-validator";

export const listProvidersValidation = [
  query("page").optional().isInt({ min: 1 }).toInt().withMessage("page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 1000 }).toInt().withMessage("limit must be 1-100"),
  query("configured").optional().isIn(["true", "false"]).withMessage("configured must be true or false"),
];

export const updateProviderValidation = [
  param("id").isUUID().withMessage("Invalid provider ID"),
  body("status").optional().isIn(["active", "inactive"]).withMessage("status must be active or inactive"),
  body("isEnabled").optional().isBoolean().withMessage("isEnabled must be a boolean"),
  body("b2bSameAsB2c").optional().isBoolean().withMessage("b2bSameAsB2c must be a boolean"),
];

export const updateCredentialsValidation = [
  param("id").isUUID().withMessage("Invalid provider ID"),
  body("type").isIn(["b2c", "b2b"]).withMessage("type must be b2c or b2b"),
  body("credentials").isObject().notEmpty().withMessage("credentials must be a non-empty object"),
];

export const getByIdValidation = [
  param("id").isUUID().withMessage("Invalid provider ID"),
];

export const createProviderValidation = [
  body("slug")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("slug is required")
    .isLength({ max: 64 })
    .withMessage("slug must be at most 64 characters")
    .matches(/^[a-z0-9_-]+$/)
    .withMessage("slug must be lowercase alphanumeric, underscores or hyphens"),
  body("name").isString().trim().notEmpty().withMessage("name is required"),
  body("baseUrl").optional({ values: "falsy" }).isURL().withMessage("baseUrl must be a valid URL"),
  body("logoUrl").optional({ values: "falsy" }).isString().withMessage("logoUrl must be a string"),
  body("credentials").optional().isObject().withMessage("credentials must be an object"),
  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
];
