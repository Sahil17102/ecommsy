import { body, param, query } from "express-validator";

export const listCouriersValidation = [
  query("serviceProvider").optional().isString().trim().toLowerCase(),
  query("businessType").optional().isIn(["b2c", "b2b"]).withMessage("businessType must be b2c or b2b"),
  query("isEnabled").optional().isIn(["true", "false"]).withMessage("isEnabled must be true or false"),
  query("page").optional().isInt({ min: 1 }).toInt().withMessage("page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 1000 }).toInt().withMessage("limit must be 1-100"),
];

export const createCourierValidation = [
  body("name").isString().trim().notEmpty().withMessage("Courier name is required"),
  body("serviceProviderId")
    .optional()
    .isUUID()
    .withMessage("serviceProviderId must be a valid account id"),
  body("serviceProvider")
    .optional()
    .isString()
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage("Service provider is required"),
  body().custom((value) => {
    if (!value.serviceProviderId && !value.serviceProvider) {
      throw new Error("serviceProviderId is required");
    }
    return true;
  }),
  body("businessType").optional().isArray().withMessage("businessType must be an array"),
  body("businessType.*").optional().isIn(["b2c", "b2b"]).withMessage("businessType values must be b2c or b2b"),
  body("isEnabled").optional().isBoolean().withMessage("isEnabled must be a boolean"),
  body("logo").optional({ values: "null" }).isString(),
];

export const courierIdValidation = [
  param("id").isUUID().withMessage("Invalid courier ID"),
];

export const updateCourierValidation = [
  param("id").isUUID().withMessage("Invalid courier ID"),
  body("name").isString().trim().notEmpty().withMessage("Courier name is required"),
];
