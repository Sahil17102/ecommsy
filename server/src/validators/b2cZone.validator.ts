import { body, param, query } from "express-validator";

export const listZonesValidation = [
  query("search").optional().isString().trim(),
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
];

export const createZoneValidation = [
  body("name")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Name is required"),
  body("description")
    .optional()
    .isString()
    .trim(),
  body("code")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Code is required"),
];

export const updateZoneValidation = [
  param("id").isUUID().withMessage("Invalid zone ID"),
  body("name")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty"),
  body("description")
    .optional()
    .isString()
    .trim(),
  body("code")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Code cannot be empty"),
];

export const zoneIdValidation = [
  param("id").isUUID().withMessage("Invalid zone ID"),
];
