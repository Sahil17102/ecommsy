import { Router } from "express";
import { body } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { handleImportExternalOrder } from "../controllers/externalOrder.controller.js";
import { regex } from "../config/regex.js";

const router = Router();

router.post(
  "/orders/import",
  requireAuth,
  [
    body("externalOrderId").isString().trim().notEmpty().withMessage("externalOrderId is required"),
    body("paymentMode").optional().isIn(["prepaid", "cod"]).withMessage("paymentMode must be prepaid or cod"),
    body("customer.name").isString().trim().notEmpty().withMessage("customer.name is required"),
    body("customer.phone").isString().trim().matches(regex.phone).withMessage("Valid 10-digit customer.phone required"),
    body("customer.email").optional({ values: "falsy" }).isEmail().withMessage("Valid customer.email required"),
    body("deliveryAddress.addressLine1").isString().trim().isLength({ min: 5 }).withMessage("deliveryAddress.addressLine1 is required"),
    body("deliveryAddress.city").isString().trim().notEmpty().withMessage("deliveryAddress.city is required"),
    body("deliveryAddress.state").isString().trim().notEmpty().withMessage("deliveryAddress.state is required"),
    body("deliveryAddress.pincode").isString().trim().matches(regex.pincode).withMessage("Valid deliveryAddress.pincode required"),
    body("items").isArray({ min: 1 }).withMessage("items must contain at least one item"),
    body("items.*.name").isString().trim().notEmpty().withMessage("items.*.name is required"),
    body("items.*.quantity").isInt({ min: 1 }).withMessage("items.*.quantity must be at least 1"),
    body("items.*.price").optional().isFloat({ min: 0 }).withMessage("items.*.price must be non-negative"),
    body("orderAmount").optional().isFloat({ min: 0 }).withMessage("orderAmount must be non-negative"),
    body("codAmount").optional().isFloat({ min: 0 }).withMessage("codAmount must be non-negative"),
    body("package.weight").optional().isFloat({ min: 1 }).withMessage("package.weight must be positive grams"),
    body("package.length").optional().isFloat({ min: 0.1 }).withMessage("package.length must be positive cm"),
    body("package.breadth").optional().isFloat({ min: 0.1 }).withMessage("package.breadth must be positive cm"),
    body("package.height").optional().isFloat({ min: 0.1 }).withMessage("package.height must be positive cm"),
  ],
  validate,
  asyncHandler(handleImportExternalOrder),
);

export default router;
