import { body } from "express-validator";

export const b2bAvailableCouriersValidation = [
  body("origin")
    .isString()
    .isLength({ min: 6, max: 6 })
    .withMessage("Valid 6-digit origin pincode required"),
  body("destination")
    .isString()
    .isLength({ min: 6, max: 6 })
    .withMessage("Valid 6-digit destination pincode required"),

  // Packages array (multi-box)
  body("packages")
    .isArray({ min: 1 })
    .withMessage("At least one package (box) is required"),
  body("packages.*.weight")
    .isFloat({ min: 0.01 })
    .withMessage("Package weight in kg must be positive"),
  body("packages.*.length")
    .isFloat({ min: 0.1 })
    .withMessage("Package length in cm must be positive"),
  body("packages.*.breadth")
    .isFloat({ min: 0.1 })
    .withMessage("Package breadth in cm must be positive"),
  body("packages.*.height")
    .isFloat({ min: 0.1 })
    .withMessage("Package height in cm must be positive"),

  body("paymentType")
    .isIn(["prepaid", "cod"])
    .withMessage("paymentType must be 'prepaid' or 'cod'"),
  body("orderAmount")
    .isFloat({ min: 0 })
    .withMessage("orderAmount must be a non-negative number"),

  // Optional fields
  body("declaredValue")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("declaredValue must be a non-negative number"),
  body("isInsurance")
    .optional()
    .isBoolean()
    .withMessage("isInsurance must be a boolean"),
  body("isTimeSpecificDelivery")
    .optional()
    .isBoolean()
    .withMessage("isTimeSpecificDelivery must be a boolean"),
  body("isHolidayPickup")
    .optional()
    .isBoolean()
    .withMessage("isHolidayPickup must be a boolean"),
];
