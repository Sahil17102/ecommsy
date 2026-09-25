import { param, query } from "express-validator";

export const listUsersValidation = [
  query("search").optional().isString().trim(),
  query("onboardingComplete").optional().isIn(["true", "false"]).withMessage("onboardingComplete must be true or false"),
  query("isVerified").optional().isIn(["true", "false"]).withMessage("isVerified must be true or false"),
  query("isActive").optional().isIn(["true", "false"]).withMessage("isActive must be true or false"),
  query("plan").optional().isString().trim().withMessage("plan must be a string"),
  query("kycStatus")
    .optional()
    .custom((value: string) => {
      const allowed = ["not_started", "pending", "verification_in_progress", "verified", "rejected"];
      return value.split(",").every((s) => allowed.includes(s));
    })
    .withMessage("kycStatus must be valid KYC status(es)"),
  query("page").optional().isInt({ min: 1 }).toInt().withMessage("page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 1000 }).toInt().withMessage("limit must be 1-100"),
  query("sortField").optional().isIn(["createdAt", "lastLogin"]).withMessage("sortField must be createdAt or lastLogin"),
  query("sortOrder").optional().isIn(["asc", "desc"]).withMessage("sortOrder must be asc or desc"),
];

export const userIdValidation = [
  param("id").isUUID().withMessage("Invalid user ID"),
];
