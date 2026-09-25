import type { Request, Response } from "express";
import {
  sendOtp,
  verifyOtp,
  loginWithPassword,
  loginWithGoogle,
  rotateRefreshToken,
  revokeRefreshToken,
  getUserById,
  userHasPassword,
  completeOnboarding,
  changeOwnPassword,
} from "../services/auth.js";
import logger from "../config/logger.js";
import { REFRESH_TOKEN_MAX_AGE_MS } from "../config/constants.js";
import { UserRole } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { notifyAsync, notifyAdmins } from "../services/notificationService.js";

function buildDeviceLabel(req: Request): string {
  const ua = req.get("user-agent") ?? "";
  if (!ua) return "a new device";
  const m = ua.match(/(Chrome|Firefox|Safari|Edg|OPR)\/[\d.]+/);
  const browser = m?.[1] === "Edg" ? "Edge" : m?.[1] ?? "browser";
  const platformMatch = ua.match(/Mac OS X|Windows NT|Linux|Android|iPhone|iPad/);
  const os = platformMatch?.[0] ?? "unknown OS";
  return `${browser} on ${os}`;
}

// ── Cookie configuration ──

const REFRESH_COOKIE = "rt"; // httpOnly refresh token cookie name
const IS_PROD = process.env.NODE_ENV === "production";

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: IS_PROD ? ("none" as const) : ("lax" as const),
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: IS_PROD ? ("none" as const) : ("lax" as const),
  maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  path: "/",
};

/** Same shape minus maxAge — used for clearCookie calls */
const CLEAR_REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: IS_PROD ? ("none" as const) : ("lax" as const),
  path: "/",
};

// ── Helpers ──

function formatUser(user: {
  id: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  teamRole?: string | null;
  parentUserId?: string | null;
  isVerified: boolean;
  onboardingComplete: boolean;
}) {
  return {
    id: user.id,
    // Keep _id alongside id while the frontend still expects the Mongo shape.
    _id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    name: user.name ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    role: user.role,
    teamRole: user.teamRole ?? "owner",
    parentUserId: user.parentUserId ?? null,
    isVerified: user.isVerified,
    onboardingComplete: user.onboardingComplete,
  };
}

// ── OTP handlers ──

export async function handleSendOtp(req: Request, res: Response) {
  logger.info(`[Auth] POST /send-otp from ip=${req.ip}`);
  const result = await sendOtp(req.body.email);
  res.json(result);
}

export async function handleVerifyOtp(req: Request, res: Response) {
  logger.info(`[Auth] POST /verify-otp from ip=${req.ip}`);
  const { user, accessToken, refreshToken, isNewUser } = await verifyOtp(
    req.body.email,
    req.body.code,
  );
  res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
  logger.info(`[Auth] verify-otp success → setting cookie="${REFRESH_COOKIE}" secure=${REFRESH_COOKIE_OPTIONS.secure} sameSite=${REFRESH_COOKIE_OPTIONS.sameSite}`);
  const hasPassword = await userHasPassword(user.id);
  const device = buildDeviceLabel(req);
  if (isNewUser) {
    notifyAdmins("admin.new_user_registered", {
      userId: user.id,
      userName: user.name ?? user.firstName ?? "New user",
      userEmail: user.email ?? "",
    });
  } else {
    notifyAsync({ userId: user.id, event: "auth.login", data: { device } });
  }
  res.json({ user: { ...formatUser(user), hasPassword }, accessToken, isNewUser });
}

// ── Password login handler ──

export async function handleLoginPassword(req: Request, res: Response) {
  logger.info(`[Auth] POST /login from ip=${req.ip}`);
  const { user, accessToken, refreshToken } = await loginWithPassword(
    req.body.identifier,
    req.body.password,
  );
  res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
  logger.info(`[Auth] login-password success → setting cookie="${REFRESH_COOKIE}" secure=${REFRESH_COOKIE_OPTIONS.secure} sameSite=${REFRESH_COOKIE_OPTIONS.sameSite}`);
  notifyAsync({
    userId: user.id,
    event: "auth.login",
    data: { device: buildDeviceLabel(req) },
  });
  res.json({ user: { ...formatUser(user), hasPassword: true }, accessToken });
}

// ── Google OAuth handler ──

export async function handleGoogleLogin(req: Request, res: Response) {
  logger.info(`[Auth] POST /google from ip=${req.ip}`);
  const { user, accessToken, refreshToken, isNewUser } = await loginWithGoogle(
    req.body.accessToken,
  );
  res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
  logger.info(`[Auth] google-login success → setting cookie="${REFRESH_COOKIE}" secure=${REFRESH_COOKIE_OPTIONS.secure} sameSite=${REFRESH_COOKIE_OPTIONS.sameSite}`);
  const hasPassword = await userHasPassword(user.id);
  const device = buildDeviceLabel(req);
  if (isNewUser) {
    notifyAdmins("admin.new_user_registered", {
      userId: user.id,
      userName: user.name ?? user.firstName ?? "New user",
      userEmail: user.email ?? "",
    });
  } else {
    notifyAsync({ userId: user.id, event: "auth.login", data: { device } });
  }
  res.json({ user: { ...formatUser(user), hasPassword }, accessToken, isNewUser });
}

// ── Refresh token handler ──

export async function handleRefresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE];
  logger.info(`[Auth] POST /refresh from ip=${req.ip} hasCookie=${!!token} cookies=${Object.keys(req.cookies ?? {}).join(",")}`);

  if (!token) {
    logger.warn(`[Auth] Refresh failed: no "${REFRESH_COOKIE}" cookie present. Origin=${req.headers.origin} Referer=${req.headers.referer}`);
    res.status(401).json({ error: "No refresh token provided" });
    return;
  }

  try {
    const { accessToken, refreshToken, userId } = await rotateRefreshToken(token, UserRole.USER);
    res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
    logger.info(`[Auth] Refresh success for userId=${userId}`);
    res.json({ accessToken, userId });
  } catch (err) {
    // Clear the invalid cookie before re-throwing
    res.clearCookie(REFRESH_COOKIE, CLEAR_REFRESH_COOKIE_OPTIONS);
    throw err;
  }
}

// ── Session handler ──

export async function handleGetMe(req: Request, res: Response) {
  // For team members, `req.actorId` is the member's own id; for owners it
  // equals `req.userId`. /me always returns the *actual* logged-in user.
  const actorId = req.actorId ?? req.userId;
  logger.info(`[Auth] GET /me from ip=${req.ip} actorId=${actorId ?? "none"}`);
  if (!actorId) {
    logger.warn("[Auth] get-me failed: no actor on request");
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const [user, hasPassword] = await Promise.all([
    getUserById(actorId),
    userHasPassword(actorId),
  ]);
  if (!user) {
    logger.warn(`[Auth] get-me failed: user not found for actorId=${actorId}`);
    throw new AppError(404, "User not found");
  }
  logger.info(`[Auth] get-me success for actorId=${actorId}`);
  res.json({ user: { ...formatUser(user), hasPassword } });
}

// ── Change own password handler ──

export async function handleChangePassword(req: Request, res: Response) {
  const actorId = req.actorId ?? req.userId;
  if (!actorId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  await changeOwnPassword(actorId, req.body.currentPassword, req.body.newPassword);
  notifyAsync({ userId: actorId, event: "auth.password_reset" });
  res.json({ message: "Password updated successfully" });
}

// ── Onboarding handler ──

export async function handleOnboarding(req: Request, res: Response) {
  if (!req.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  logger.info(
    `[Auth] POST /onboarding userId=${req.userId} phone=${req.body?.phone ?? "-"} email=${req.body?.email ?? "-"}`,
  );
  const user = await completeOnboarding(req.userId, req.body);
  logger.info(`[Auth] Onboarding completed for userId=${req.userId}`);
  const hasPassword = await userHasPassword(user.id);
  res.json({ user: { ...formatUser(user), hasPassword } });
}

// ── Logout handler ──

export async function handleLogout(req: Request, res: Response) {
  logger.info(`[Auth] POST /logout from ip=${req.ip}`);
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    try {
      await revokeRefreshToken(token);
      logger.info("[Auth] Refresh token revoked on logout");
    } catch (err) {
      logger.warn("[Auth] Failed to revoke refresh token on logout", err);
    }
  }
  res.clearCookie(REFRESH_COOKIE, CLEAR_REFRESH_COOKIE_OPTIONS);
  res.json({ message: "Logged out" });
}
