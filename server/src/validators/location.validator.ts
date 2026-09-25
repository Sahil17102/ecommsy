import { body, param, query } from "express-validator";
import { VALID_TAGS } from "../services/location.js";

export const listLocationsValidation = [
  query("search").optional().isString().trim(),
  query("state").optional().isString().trim(),
  query("tag")
    .optional()
    .isIn([...VALID_TAGS])
    .withMessage("Invalid tag"),
  query("isActive")
    .optional()
    .isIn(["true", "false"])
    .withMessage("isActive must be true or false"),
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

export const createLocationValidation = [
  body("pincode")
    .isString()
    .trim()
    .matches(/^\d{6}$/)
    .withMessage("Pincode must be exactly 6 digits"),
  body("city").isString().trim().notEmpty().withMessage("City is required"),
  body("state").isString().trim().notEmpty().withMessage("State is required"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
  body("tags.*")
    .optional()
    .isIn([...VALID_TAGS])
    .withMessage("Invalid tag value"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];

export const bulkImportValidation = [
  body("locations")
    .isArray({ min: 1 })
    .withMessage("locations must be a non-empty array"),
  body("locations.*.pincode")
    .isString()
    .trim()
    .matches(/^\d{6}$/)
    .withMessage("Each pincode must be 6 digits"),
  body("locations.*.city")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Each location must have a city"),
  body("locations.*.state")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Each location must have a state"),
  body("locations.*.tags").optional().isArray(),
  body("locations.*.tags.*")
    .optional()
    .isIn([...VALID_TAGS]),
];

export const bulkDeleteValidation = [
  body("ids")
    .isArray({ min: 1 })
    .withMessage("ids must be a non-empty array"),
  body("ids.*").isUUID().withMessage("Each id must be a valid ID"),
];

export const locationIdValidation = [
  param("id").isUUID().withMessage("Invalid location ID"),
];

export const pincodeParamValidation = [
  param("pincode")
    .matches(/^\d{6}$/)
    .withMessage("Pincode must be exactly 6 digits"),
];
