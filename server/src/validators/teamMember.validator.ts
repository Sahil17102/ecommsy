import { body, param } from "express-validator";
import { regex } from "../config/regex.js";

export const createTeamMemberValidation = [
  body("firstName").isString().trim().notEmpty().withMessage("First name is required"),
  body("lastName").isString().trim().notEmpty().withMessage("Last name is required"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("phone")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .matches(regex.phone)
    .withMessage("Valid 10-digit phone number is required"),
  body("password")
    .isString()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
];

export const memberIdValidation = [
  param("memberId").isUUID().withMessage("Invalid member ID"),
];
