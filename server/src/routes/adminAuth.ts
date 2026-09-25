import { Router } from "express";
import { body } from "express-validator";
import { requireAdminAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { loginLimiter } from "../middleware/rateLimiter.js";
import { adminLoginValidation } from "../validators/auth.validator.js";
import {
  handleAdminLogin,
  handleAdminRefresh,
  handleAdminGetMe,
  handleAdminChangePassword,
  handleAdminLogout,
} from "../controllers/adminAuth.controller.js";

const router = Router();

// Password-only login
router.post("/login", loginLimiter, adminLoginValidation, validate, asyncHandler(handleAdminLogin));

// Refresh access token
router.post("/refresh", asyncHandler(handleAdminRefresh));

// Protected
router.get("/me", requireAdminAuth, asyncHandler(handleAdminGetMe));

// Self-service password change — both staff admin and superadmin
router.post(
  "/change-password",
  requireAdminAuth,
  [
    body("currentPassword").optional().isString(),
    body("newPassword").isString().isLength({ min: 8 }).withMessage("New password must be at least 8 characters"),
  ],
  validate,
  asyncHandler(handleAdminChangePassword),
);

// Logout
router.post("/logout", asyncHandler(handleAdminLogout));

export default router;
