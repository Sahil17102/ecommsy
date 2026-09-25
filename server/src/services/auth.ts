import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { and, eq, ne, or } from "drizzle-orm";

import { db } from "../config/db.js";
import { users, refreshTokens, otps, wallets } from "../db/schema.js";
import type { IUser } from "../models/User.js";
import { UserRole } from "../models/User.js";
import { sendOtpEmail } from "./mailer.js";

import {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_MAX_AGE_MS,
  OTP_EXPIRES_MINUTES,
  OTP_MAX_ATTEMPTS,
  BCRYPT_ROUNDS,
} from "../config/constants.js";
import { externalUrls } from "../config/externalUrls.js";
import logger from "../config/logger.js";
import { AppError } from "../utils/AppError.js";

// ── Custom error ──

export class AuthError extends AppError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = "AuthError";
  }
}

// ── Private helpers ──

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new AuthError(500, "JWT_SECRET is not configured");
  return secret;
}

/** Insert a wallet row for a newly created user. Inlined here so the auth
 *  batch can be completed without porting services/wallet.ts in this round. */
async function initWalletForUser(userId: string): Promise<void> {
  await db.insert(wallets).values({ userId }).onConflictDoNothing();
}

// ── Access token ──

export interface AccessTokenPayload {
  userId: string;
  role: UserRole;
  actorId?: string;
}

export function signAccessToken(
  userId: string,
  role: UserRole,
  actorId?: string,
): string {
  const payload: AccessTokenPayload = actorId && actorId !== userId
    ? { userId, role, actorId }
    : { userId, role };
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AccessTokenPayload;
    logger.debug(`[Auth] Access token verified for userId=${decoded.userId} role=${decoded.role} actorId=${decoded.actorId ?? "self"}`);
    return decoded;
  } catch (err) {
    logger.warn(`[Auth] Access token verification failed: ${(err as Error).message}`);
    throw new AuthError(401, "Invalid or expired access token");
  }
}

// ── Refresh token ──

async function createRefreshToken(
  userId: string,
  role: UserRole,
  actorId?: string,
): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);
  await db.insert(refreshTokens).values({ token, userId, role, actorId: actorId ?? null, expiresAt });
  return token;
}

export async function generateTokenPair(
  userId: string,
  role: UserRole,
  actorId?: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = signAccessToken(userId, role, actorId);
  const refreshToken = await createRefreshToken(userId, role, actorId);
  return { accessToken, refreshToken };
}

/**
 * Resolves the effective owner id and actor id for a user row.
 * - Owners: { ownerId: user.id, actorId: undefined }
 * - Members: { ownerId: user.parentUserId, actorId: user.id }
 */
export function resolveTokenSubject(user: IUser): { ownerId: string; actorId?: string } {
  if (user.parentUserId) {
    return { ownerId: user.parentUserId, actorId: user.id };
  }
  return { ownerId: user.id };
}

export async function rotateRefreshToken(
  oldToken: string,
  expectedRole?: UserRole | UserRole[],
): Promise<{
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: UserRole;
  actorId?: string;
}> {
  const expectedLabel = Array.isArray(expectedRole)
    ? expectedRole.join("|")
    : (expectedRole ?? "any");
  logger.info(`[Auth] Refresh token rotation attempt (expectedRole=${expectedLabel})`);

  const stored = await db.query.refreshTokens.findFirst({
    where: eq(refreshTokens.token, oldToken),
  });

  if (!stored) {
    logger.warn("[Auth] Refresh token rotation failed: token not found in DB");
    throw new AuthError(401, "Invalid refresh token");
  }
  if (stored.expiresAt < new Date()) {
    logger.warn(`[Auth] Refresh token expired for userId=${stored.userId} (expired=${stored.expiresAt.toISOString()})`);
    await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));
    throw new AuthError(401, "Refresh token has expired. Please log in again.");
  }
  if (expectedRole) {
    const allowed = Array.isArray(expectedRole) ? expectedRole : [expectedRole];
    if (!allowed.includes(stored.role as UserRole)) {
      logger.warn(`[Auth] Refresh token role mismatch: expected=${expectedLabel} got=${stored.role} userId=${stored.userId}`);
      throw new AuthError(401, "Token role mismatch");
    }
  }

  await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));

  const userId = stored.userId;
  const role = stored.role as UserRole;
  const actorId = stored.actorId ?? undefined;
  const { accessToken, refreshToken } = await generateTokenPair(userId, role, actorId);

  logger.info(`[Auth] Refresh token rotated successfully for userId=${userId} actorId=${actorId ?? "self"}`);
  return { accessToken, refreshToken, userId, role, actorId };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
}

// ── OTP flow ──

export async function sendOtp(
  email: string,
): Promise<{ message: string; isNewUser: boolean; devOtp?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  logger.info(`[Auth] OTP send requested for email=${normalizedEmail}`);

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  });

  const code = String(crypto.randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

  // At most one active OTP per identifier: delete then insert.
  await db.delete(otps).where(eq(otps.identifier, normalizedEmail));
  await db.insert(otps).values({ identifier: normalizedEmail, code, expiresAt, attempts: 0 });

  await sendOtpEmail(normalizedEmail, code);

  logger.info(`[Auth] OTP sent successfully to email=${normalizedEmail} isNewUser=${!existingUser}`);
  return {
    message: "OTP sent to your email",
    isNewUser: !existingUser,
    ...(process.env.NODE_ENV === "development" ? { devOtp: code } : {}),
  };
}

export async function verifyOtp(
  email: string,
  code: string,
): Promise<{
  user: IUser;
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
}> {
  const normalizedEmail = email.toLowerCase().trim();
  logger.info(`[Auth] OTP verification attempt for email=${normalizedEmail}`);

  const otp = await db.query.otps.findFirst({
    where: eq(otps.identifier, normalizedEmail),
  });

  if (!otp) {
    logger.warn(`[Auth] OTP verify failed: no OTP found for email=${normalizedEmail}`);
    throw new AuthError(400, "No OTP found. Please request a new one.");
  }
  if (otp.expiresAt < new Date()) {
    logger.warn(`[Auth] OTP verify failed: expired for email=${normalizedEmail}`);
    await db.delete(otps).where(eq(otps.id, otp.id));
    throw new AuthError(400, "OTP has expired. Please request a new one.");
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    logger.warn(`[Auth] OTP verify failed: max attempts reached for email=${normalizedEmail}`);
    await db.delete(otps).where(eq(otps.id, otp.id));
    throw new AuthError(400, "Too many failed attempts. Please request a new OTP.");
  }
  if (otp.code !== code) {
    await db.update(otps).set({ attempts: otp.attempts + 1 }).where(eq(otps.id, otp.id));
    const remaining = OTP_MAX_ATTEMPTS - (otp.attempts + 1);
    logger.warn(`[Auth] OTP verify failed: wrong code for email=${normalizedEmail} (${remaining} attempts left)`);
    throw new AuthError(
      400,
      `Invalid OTP. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
    );
  }

  // Valid OTP — consume it
  await db.delete(otps).where(eq(otps.id, otp.id));

  let user = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  });
  let isNewUser = false;

  if (!user) {
    const [created] = await db.insert(users).values({
      email: normalizedEmail,
      isVerified: true,
      lastLogin: new Date(),
      role: UserRole.USER,
    }).returning();
    user = created;
    isNewUser = true;
    await initWalletForUser(user.id);
    logger.info(`[Auth] New user created via OTP: userId=${user.id} email=${normalizedEmail}`);
  } else {
    await db.update(users).set({
      isVerified: true,
      lastLogin: new Date(),
      updatedAt: new Date(),
    }).where(eq(users.id, user.id));
    user = { ...user, isVerified: true, lastLogin: new Date() };
    logger.info(`[Auth] Existing user verified via OTP: userId=${user.id} email=${normalizedEmail}`);
  }

  const { ownerId, actorId } = resolveTokenSubject(user);
  const { accessToken, refreshToken } = await generateTokenPair(
    ownerId,
    user.role as UserRole,
    actorId,
  );
  logger.info(`[Auth] OTP login successful for userId=${user.id} actor=${actorId ?? "owner"}`);
  return { user, accessToken, refreshToken, isNewUser };
}

// ── Password login (customers + admin) ──

export async function loginWithPassword(
  identifier: string,
  password: string,
): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
  const trimmed = identifier.trim();
  const isPhone = /^\d{10}$/.test(trimmed);
  const matcher = isPhone
    ? eq(users.phone, trimmed)
    : eq(users.email, trimmed.toLowerCase());
  logger.info(`[Auth] Password login attempt for ${isPhone ? "phone" : "email"}=${isPhone ? trimmed : trimmed.toLowerCase()}`);

  const user = await db.query.users.findFirst({ where: matcher });

  if (!user || !user.passwordHash) {
    logger.warn(`[Auth] Password login failed: user not found or no password for identifier=${trimmed}`);
    throw new AuthError(401, "Invalid credentials");
  }
  if (!user.isActive) {
    logger.warn(`[Auth] Password login failed: account disabled for userId=${user.id}`);
    throw new AuthError(403, "Account has been disabled");
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    logger.warn(`[Auth] Password login failed: wrong password for userId=${user.id}`);
    throw new AuthError(401, "Invalid credentials");
  }

  await db.update(users).set({ lastLogin: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  const updatedUser: IUser = { ...user, lastLogin: new Date() };
  const { ownerId, actorId } = resolveTokenSubject(updatedUser);
  const { accessToken, refreshToken } = await generateTokenPair(
    ownerId,
    updatedUser.role as UserRole,
    actorId,
  );
  logger.info(`[Auth] Password login successful for userId=${updatedUser.id} role=${updatedUser.role} actor=${actorId ?? "owner"}`);
  return { user: updatedUser, accessToken, refreshToken };
}

// ── Google OAuth ──

interface GoogleUserInfo {
  id: string;
  email: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  verified_email?: boolean;
}

export async function loginWithGoogle(
  googleAccessToken: string,
): Promise<{
  user: IUser;
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
}> {
  let userInfo: GoogleUserInfo;
  logger.info("[Auth] Google OAuth login attempt");

  try {
    const res = await fetch(externalUrls.google.userInfo, {
      headers: { Authorization: `Bearer ${googleAccessToken}` },
    });
    if (!res.ok) {
      logger.warn(`[Auth] Google userinfo request failed with status=${res.status}`);
      throw new Error(`Google responded with ${res.status}`);
    }
    userInfo = (await res.json()) as GoogleUserInfo;
    logger.info(`[Auth] Google userinfo fetched: email=${userInfo.email} verified=${userInfo.verified_email}`);
  } catch (err) {
    if (err instanceof AuthError) throw err;
    logger.error("[Auth] Google OAuth token validation failed", err);
    throw new AuthError(401, "Invalid Google access token");
  }

  if (!userInfo.email) {
    logger.warn("[Auth] Google account has no email");
    throw new AuthError(400, "Google account has no email");
  }
  if (userInfo.verified_email === false) {
    logger.warn(`[Auth] Google email not verified: email=${userInfo.email}`);
    throw new AuthError(400, "Google email is not verified");
  }

  const emailLower = userInfo.email.toLowerCase();
  let user = await db.query.users.findFirst({ where: eq(users.email, emailLower) });
  let isNewUser = false;

  if (!user) {
    const [created] = await db.insert(users).values({
      email: emailLower,
      firstName: userInfo.given_name ?? null,
      lastName: userInfo.family_name ?? null,
      name: userInfo.name ?? null,
      isVerified: true,
      lastLogin: new Date(),
      role: UserRole.USER,
    }).returning();
    user = created;
    isNewUser = true;
    await initWalletForUser(user.id);
    logger.info(`[Auth] New user created via Google: userId=${user.id} email=${emailLower}`);
  } else {
    if (!user.isActive) {
      logger.warn(`[Auth] Google login blocked: account disabled for userId=${user.id}`);
      throw new AuthError(403, "Account has been disabled");
    }
    const patch: Partial<IUser> = {
      isVerified: true,
      lastLogin: new Date(),
      updatedAt: new Date(),
    };
    if (!user.name && userInfo.name) patch.name = userInfo.name;
    if (!user.firstName && userInfo.given_name) patch.firstName = userInfo.given_name;
    if (!user.lastName && userInfo.family_name) patch.lastName = userInfo.family_name;
    await db.update(users).set(patch).where(eq(users.id, user.id));
    user = { ...user, ...patch } as IUser;
    logger.info(`[Auth] Existing user logged in via Google: userId=${user.id}`);
  }

  const { ownerId, actorId } = resolveTokenSubject(user);
  const { accessToken, refreshToken } = await generateTokenPair(
    ownerId,
    user.role as UserRole,
    actorId,
  );
  logger.info(`[Auth] Google login successful for userId=${user.id} actor=${actorId ?? "owner"}`);
  return { user, accessToken, refreshToken, isNewUser };
}

// ── Session ──

export async function getUserById(userId: string): Promise<IUser | null> {
  const row = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!row) return null;
  // Strip passwordHash before returning (consumers expect it absent)
  const { passwordHash: _ph, ...safe } = row;
  return safe as IUser;
}

export async function userHasPassword(userId: string): Promise<boolean> {
  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { passwordHash: true },
  });
  return !!row?.passwordHash;
}

// ── Password management ──

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function changeOwnPassword(
  userId: string,
  currentPassword: string | undefined,
  newPassword: string,
): Promise<void> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new AuthError(404, "User not found");

  if (!user.passwordHash) {
    const newHash = await hashPassword(newPassword);
    await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
    logger.info(`[Auth] Initial password set for userId=${userId}`);
    return;
  }

  if (!currentPassword) {
    throw new AuthError(400, "Current password is required");
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    logger.warn(`[Auth] changeOwnPassword: wrong current password for userId=${userId}`);
    throw new AuthError(401, "Current password is incorrect");
  }

  const newHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
  logger.info(`[Auth] Password changed by self for userId=${userId}`);
}

export async function generateAndSetTempPassword(
  targetUserId: string,
): Promise<string> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, targetUserId),
    columns: { id: true },
  });
  if (!user) throw new AuthError(404, "User not found");

  const tempPassword = crypto.randomBytes(9).toString("base64url");
  const hash = await hashPassword(tempPassword);
  await db.update(users).set({ passwordHash: hash, updatedAt: new Date() })
    .where(eq(users.id, targetUserId));

  // Invalidate any refresh tokens tied to this account (as owner OR as actor)
  await db.delete(refreshTokens).where(
    or(eq(refreshTokens.userId, targetUserId), eq(refreshTokens.actorId, targetUserId)),
  );

  logger.info(`[Auth] Temp password issued for userId=${targetUserId}`);
  return tempPassword;
}

// ── Onboarding ──

interface OnboardingData {
  firstName: string;
  lastName: string;
  pincode: string;
  businessName: string;
  sellsOn: string[];
  monthlyShipmentVolume: string;
  phone?: string;
  email?: string;
  integrationsOfInterest?: string[];
}

export async function completeOnboarding(
  userId: string,
  data: OnboardingData,
): Promise<IUser> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new AuthError(404, "User not found");

  const {
    firstName,
    lastName,
    pincode,
    businessName,
    sellsOn,
    monthlyShipmentVolume,
    phone,
    email,
    integrationsOfInterest = [],
  } = data;

  const patch: Partial<IUser> = {
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    pincode,
    businessName,
    sellsOn,
    monthlyShipmentVolume,
    integrationsOfInterest,
    onboardingComplete: true,
    updatedAt: new Date(),
  };
  const newPhone = phone && !user.phone ? phone.trim() : undefined;
  const newEmail = email && !user.email ? email.toLowerCase().trim() : undefined;
  if (newPhone) patch.phone = newPhone;
  if (newEmail) patch.email = newEmail;

  // `users.phone` / `users.email` are UNIQUE. Onboarding is the one place a
  // seller types a phone number that may already belong to another account
  // (a second business on the same mobile, staff reusing the office number),
  // and the raw 23505 came back as a bare 500 "Internal server error" — the
  // seller had no way to know which field was the problem, so they retried the
  // same number forever and never got past the form. Check first, and still
  // catch the constraint in case another signup lands in between.
  if (newPhone) {
    const taken = await db.query.users.findFirst({
      where: and(eq(users.phone, newPhone), ne(users.id, userId)),
      columns: { id: true },
    });
    if (taken) {
      logger.warn(`[Auth] Onboarding blocked for userId=${userId}: phone ${newPhone} already registered`);
      throw new AuthError(
        409,
        "This phone number is already registered with another account. Use a different number or log in to that account.",
      );
    }
  }
  if (newEmail) {
    const taken = await db.query.users.findFirst({
      where: and(eq(users.email, newEmail), ne(users.id, userId)),
      columns: { id: true },
    });
    if (taken) {
      logger.warn(`[Auth] Onboarding blocked for userId=${userId}: email ${newEmail} already registered`);
      throw new AuthError(
        409,
        "This email is already registered with another account. Use a different email or log in to that account.",
      );
    }
  }

  try {
    const [updated] = await db.update(users).set(patch).where(eq(users.id, userId)).returning();
    return updated;
  } catch (err) {
    const message = (err as Error).message ?? "";
    if (message.includes("users_phone_uq")) {
      throw new AuthError(409, "This phone number is already registered with another account.");
    }
    if (message.includes("users_email_uq")) {
      throw new AuthError(409, "This email is already registered with another account.");
    }
    logger.error(`[Auth] Onboarding update failed for userId=${userId}: ${message}`);
    throw err;
  }
}
