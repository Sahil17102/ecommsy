import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, AuthError } from "../services/auth.js";
import { UserRole } from "../models/User.js";
import logger from "../config/logger.js";

function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return undefined;
}

/**
 * Creates Express middleware that verifies the Bearer access token
 * and enforces one or more allowed roles. Attaches req.userId on success.
 */
function requireRoles(...allowed: UserRole[]) {
  const allowedSet = new Set<UserRole>(allowed);
  const label = allowed.join("|");
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = extractBearerToken(req);

    if (!token) {
      logger.warn(`[AuthMiddleware] No bearer token for ${req.method} ${req.path} (required role=${label}) ip=${req.ip}`);
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    try {
      const decoded = verifyAccessToken(token);

      if (!allowedSet.has(decoded.role)) {
        logger.warn(`[AuthMiddleware] Role mismatch: required=${label} got=${decoded.role} userId=${decoded.userId} path=${req.path}`);
        res.status(403).json({ error: "Insufficient permissions" });
        return;
      }

      req.userId = decoded.userId;
      req.actorId = decoded.actorId ?? decoded.userId;
      req.userRole = decoded.role;
      next();
    } catch (err) {
      if (err instanceof AuthError) {
        logger.warn(`[AuthMiddleware] Token auth failed for ${req.method} ${req.path}: ${err.message}`);
        res.status(err.status).json({ error: err.message });
        return;
      }
      logger.error(`[AuthMiddleware] Unexpected error verifying token for ${req.path}`, err);
      res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}

/** Protects customer routes — requires role: "user" */
export const requireAuth = requireRoles(UserRole.USER);

/** Protects admin routes — accepts both admin and superadmin */
export const requireAdminAuth = requireRoles(UserRole.ADMIN, UserRole.SUPERADMIN);

/** Protects superadmin-only routes (staff management, role presets, global audit log) */
export const requireSuperadminAuth = requireRoles(UserRole.SUPERADMIN);

/**
 * Allows user, admin, or superadmin (e.g. rate calculator used by all panels).
 */
export const requireAnyAuth = requireRoles(
  UserRole.USER,
  UserRole.ADMIN,
  UserRole.SUPERADMIN,
);
