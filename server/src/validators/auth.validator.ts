import { body } from "express-validator";
import { regex } from "../config/regex.js";

// ── OTP flow ──

export const sendOtpValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
];

export const verifyOtpValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("code")
    .isString()
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("OTP must be exactly 6 digits"),
];

// ── Password login ──

export const loginPasswordValidation = [
  body("identifier")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Email or phone number is required"),
  body("password")
    .isString()
    .notEmpty()
    .withMessage("Password is required"),
];

// ── Google OAuth ──

export const googleLoginValidation = [
  body("accessToken")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Google access token is required"),
];

// ── Admin password login ──

export const adminLoginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("password")
    .isString()
    .notEmpty()
    .withMessage("Password is required"),
];

// ── Refresh token ──

export const refreshValidation = [
  // Refresh token comes from the httpOnly cookie — no body validation needed
];

// ── Change own password ──

export const changePasswordValidation = [
  body("currentPassword")
    .optional()
    .isString()
    .withMessage("Current password must be a string"),
  body("newPassword")
    .isString()
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters"),
];

// ── Onboarding ──

export const onboardingValidation = [
  body("firstName").isString().trim().notEmpty().withMessage("First name is required"),
  body("lastName").isString().trim().notEmpty().withMessage("Last name is required"),
  body("pincode")
    .isString()
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("Valid 6-digit pincode is required"),
  body("businessName").isString().trim().notEmpty().withMessage("Business name is required"),
  body("sellsOn").isArray({ min: 1 }).withMessage("Select at least one sales channel"),
  body("monthlyShipmentVolume")
    .isString()
    .notEmpty()
    .withMessage("Monthly shipment volume is required"),
  body("phone")
    .isString()
    .trim()
    .matches(regex.phone)
    .withMessage("Valid 10-digit phone is required"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("integrationsOfInterest").optional().isArray(),
];
