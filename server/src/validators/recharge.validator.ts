import { body } from "express-validator";
import { MIN_RECHARGE_AMOUNT, MAX_RECHARGE_AMOUNT } from "../services/recharge.js";

export const createRechargeOrderValidation = [
  body("amount")
    .isFloat({ min: MIN_RECHARGE_AMOUNT, max: MAX_RECHARGE_AMOUNT })
    .withMessage(
      `amount must be between ₹${MIN_RECHARGE_AMOUNT} and ₹${MAX_RECHARGE_AMOUNT.toLocaleString("en-IN")}`,
    ),
];

export const verifyRechargeValidation = [
  body("razorpayOrderId")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("razorpayOrderId is required"),
  body("razorpayPaymentId")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("razorpayPaymentId is required"),
  body("razorpaySignature")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("razorpaySignature is required"),
];
