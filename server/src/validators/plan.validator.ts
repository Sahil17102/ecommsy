import { body, param, query } from "express-validator";

export const listPlansValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 500 })
    .toInt()
    .withMessage("limit must be 1-500"),
  query("isActive")
    .optional()
    .isIn(["true", "false"])
    .withMessage("isActive must be true or false"),
];

export const createPlanValidation = [
  body("name")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Plan name is required"),
  body("slug")
    .isString()
    .trim()
    .toLowerCase()
    .matches(/^[a-z0-9-]+$/)
    .withMessage("Slug must contain only lowercase letters, numbers, and hyphens"),
  body("description")
    .optional()
    .isString()
    .trim(),
  body("sortOrder")
    .optional()
    .isInt({ min: 0 })
    .toInt()
    .withMessage("Sort order must be a non-negative integer"),
];

export const updatePlanValidation = [
  param("id").isUUID().withMessage("Invalid plan ID"),
  body("name")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Plan name cannot be empty"),
  body("description")
    .optional()
    .isString()
    .trim(),
  body("sortOrder")
    .optional()
    .isInt({ min: 0 })
    .toInt()
    .withMessage("Sort order must be a non-negative integer"),
  body("isDefault")
    .optional()
    .isBoolean()
    .withMessage("isDefault must be a boolean"),
];

export const planIdValidation = [
  param("id").isUUID().withMessage("Invalid plan ID"),
];
