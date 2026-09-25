import type { Request, Response } from "express";
import {
  loginWithPassword,
  rotateRefreshToken,
  revokeRefreshToken,
  getUserById,
  changeOwnPassword,
} from "../services/auth.js";
import { ADMIN_ROLES, UserRole } from "../models/User.js";
import { notifyAsync } from "../services/notificationService.js";
import logger from "../config/logger.js";
import { REFRESH_TOKEN_MAX_AGE_MS } from "../config/constants.js";
import { AppError } from "../utils/AppError.js";

// ── Cookie configuration ──

const REFRESH_COOKIE = "admin_rt"; // separate from customer refresh token
const IS_PROD = process.env.NODE_ENV === "production";

const COOKIE_BASE = {
  httpOnly: true,
  secure: IS_PROD,
};

const REFRESH_COOKIE_OPTIONS = {
  ...COOKIE_BASE,
  sameSite: IS_PROD ? ("none" as const) : ("lax" as const),
  maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  path: "/",
};

/** Same shape minus maxAge — used for clearCookie calls */
const CLEAR_REFRESH_COOKIE_OPTIONS = {
  ...COOKIE_BASE,
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
  designation?: string | null;
  isVerified: boolean;
  onboardingComplete: boolean;
}) {
  return {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    name: user.name ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    role: user.role,
    designation: user.designation ?? null,
    isVerified: user.isVerified,
    onboardingComplete: user.onboardingComplete,
  };
}

// ── Login (password only) ──

export async function handleAdminLogin(req: Request, res: Response) {
  logger.info(`[AdminAuth] POST /login from ip=${req.ip}`);
  const { user, accessToken, refreshToken } = await loginWithPassword(
    req.body.email,
    req.body.password,
  );

  // Extra safety: ensure only admin/superadmin accounts can log in here
  if (!ADMIN_ROLES.includes(user.role as UserRole)) {
    logger.warn(`[AdminAuth] Non-admin user attempted admin login: userId=${user.id} role=${user.role}`);
    throw new AppError(403, "Access denied");
  }

  res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
  logger.info(`[AdminAuth] Login success → setting cookie="${REFRESH_COOKIE}" secure=${REFRESH_COOKIE_OPTIONS.secure} sameSite=${REFRESH_COOKIE_OPTIONS.sameSite} path=${REFRESH_COOKIE_OPTIONS.path}`);
  res.json({ user: formatUser(user), accessToken });
}

// ── Refresh token ──

export async function handleAdminRefresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE];
  logger.info(`[AdminAuth] POST /refresh from ip=${req.ip} hasCookie=${!!token} cookies=${Object.keys(req.cookies ?? {}).join(",")}`);

  if (!token) {
    logger.warn(`[AdminAuth] Refresh failed: no "${REFRESH_COOKIE}" cookie. Origin=${req.headers.origin} Referer=${req.headers.referer}`);
    res.status(401).json({ error: "No refresh token provided" });
    return;
  }

  try {
    const { accessToken, refreshToken } = await rotateRefreshToken(token, ADMIN_ROLES);
    res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
    logger.info("[AdminAuth] Refresh token rotated successfully");
    res.json({ accessToken });
  } catch (err) {
    // Clear the invalid cookie before re-throwing
    res.clearCookie(REFRESH_COOKIE, CLEAR_REFRESH_COOKIE_OPTIONS);
    throw err;
  }
}

// ── Session ──

export async function handleAdminGetMe(req: Request, res: Response) {
  logger.info(`[AdminAuth] GET /me from ip=${req.ip} userId=${req.userId ?? "none"}`);
  if (!req.userId) {
    logger.warn("[AdminAuth] get-me failed: no userId on request");
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const user = await getUserById(req.userId);
  if (!user) {
    logger.warn(`[AdminAuth] get-me failed: user not found for userId=${req.userId}`);
    throw new AppError(404, "User not found");
  }
  if (!ADMIN_ROLES.includes(user.role as UserRole)) {
    logger.warn(`[AdminAuth] get-me failed: non-admin role=${user.role} for userId=${req.userId}`);
    throw new AppError(403, "Access denied");
  }
  logger.info(`[AdminAuth] get-me success for userId=${req.userId}`);
  res.json({ user: formatUser(user) });
}

// ── Change own password (self-service) ──

export async function handleAdminChangePassword(req: Request, res: Response) {
  const actorId = req.actorId ?? req.userId;
  if (!actorId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };
  if (!newPassword || newPassword.length < 8) {
    throw new AppError(400, "New password must be at least 8 characters");
  }
  await changeOwnPassword(actorId, currentPassword, newPassword);
  notifyAsync({ userId: actorId, event: "admin.password_changed" });
  logger.info(`[AdminAuth] Self-password change for actorId=${actorId}`);
  res.json({ message: "Password updated successfully" });
}

// ── Logout ──

export async function handleAdminLogout(req: Request, res: Response) {
  logger.info(`[AdminAuth] POST /logout from ip=${req.ip}`);
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    try {
      await revokeRefreshToken(token);
      logger.info("[AdminAuth] Refresh token revoked on logout");
    } catch (err) {
      logger.warn("[AdminAuth] Failed to revoke refresh token on logout", err);
    }
  }
  res.clearCookie(REFRESH_COOKIE, CLEAR_REFRESH_COOKIE_OPTIONS);
  res.json({ message: "Logged out" });
}
