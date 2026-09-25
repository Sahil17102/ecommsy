import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { otpSendLimiter, loginLimiter } from "../middleware/rateLimiter.js";
import {
  sendOtpValidation,
  verifyOtpValidation,
  loginPasswordValidation,
  googleLoginValidation,
  onboardingValidation,
  changePasswordValidation,
} from "../validators/auth.validator.js";
import {
  handleSendOtp,
  handleVerifyOtp,
  handleLoginPassword,
  handleGoogleLogin,
  handleRefresh,
  handleGetMe,
  handleOnboarding,
  handleLogout,
  handleChangePassword,
} from "../controllers/auth.controller.js";

const router = Router();

// OTP flow
router.post("/send-otp", otpSendLimiter, sendOtpValidation, validate, asyncHandler(handleSendOtp));
router.post("/verify-otp", loginLimiter, verifyOtpValidation, validate, asyncHandler(handleVerifyOtp));

// Password login
router.post("/login", loginLimiter, loginPasswordValidation, validate, asyncHandler(handleLoginPassword));

// Google OAuth
router.post("/google", loginLimiter, googleLoginValidation, validate, asyncHandler(handleGoogleLogin));

// Refresh access token (reads httpOnly cookie)
router.post("/refresh", asyncHandler(handleRefresh));

// Protected
router.get("/me", requireAuth, asyncHandler(handleGetMe));
router.post("/onboarding", requireAuth, onboardingValidation, validate, asyncHandler(handleOnboarding));
router.post(
  "/change-password",
  requireAuth,
  changePasswordValidation,
  validate,
  asyncHandler(handleChangePassword),
);

// Logout
router.post("/logout", asyncHandler(handleLogout));

export default router;
