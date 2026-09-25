import { body } from "express-validator";

export const availableCouriersValidation = [
  body("origin")
    .isString()
    .isLength({ min: 6, max: 6 })
    .withMessage("Valid 6-digit origin pincode required"),
  body("destination")
    .isString()
    .isLength({ min: 6, max: 6 })
    .withMessage("Valid 6-digit destination pincode required"),
  body("weight")
    .isFloat({ min: 1 })
    .withMessage("Weight in grams must be a positive number"),
  body("length")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Length must be a positive number (cm)"),
  body("breadth")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Breadth must be a positive number (cm)"),
  body("height")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Height must be a positive number (cm)"),
  body("paymentType")
    .isIn(["prepaid", "cod"])
    .withMessage("paymentType must be 'prepaid' or 'cod'"),
  body("orderAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("orderAmount must be a non-negative number"),
  body("orderType")
    .optional()
    .isIn(["B2B", "B2C"])
    .withMessage("orderType must be 'B2B' or 'B2C'"),
];
