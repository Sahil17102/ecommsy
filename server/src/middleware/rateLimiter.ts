import rateLimit from "express-rate-limit";
import {
  RATE_LIMIT_OTP_WINDOW_MS,
  RATE_LIMIT_OTP_MAX,
  RATE_LIMIT_LOGIN_WINDOW_MS,
  RATE_LIMIT_LOGIN_MAX,
} from "../config/constants.js";

/** OTP sends per window per IP */
export const otpSendLimiter = rateLimit({
  windowMs: RATE_LIMIT_OTP_WINDOW_MS,
  max: RATE_LIMIT_OTP_MAX,
  message: { error: "Too many OTP requests. Please wait before trying again." },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Login attempts per window per IP */
export const loginLimiter = rateLimit({
  windowMs: RATE_LIMIT_LOGIN_WINDOW_MS,
  max: RATE_LIMIT_LOGIN_MAX,
  message: { error: "Too many login attempts. Please wait before trying again." },
  standardHeaders: true,
  legacyHeaders: false,
});
