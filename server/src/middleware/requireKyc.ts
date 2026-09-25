import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { kycDocuments } from "../db/schema.js";
import logger from "../config/logger.js";

/**
 * Status values consumers can pass in. The legacy code used the model's
 * `KycStatus` enum (verified / not_started / etc.) — the schema enum is
 * { not_submitted | pending | approved | rejected }. We accept both and
 * normalise at the boundary.
 */
export type RequireKycStatus =
  | "not_submitted"
  | "pending"
  | "approved"
  | "rejected"
  | "not_started"
  | "verified";

function normaliseStatus(s: RequireKycStatus | string): string {
  if (s === "verified") return "approved";
  if (s === "not_started") return "not_submitted";
  return s;
}

/**
 * Middleware that checks if the authenticated user has a verified KYC.
 * Must be placed AFTER requireAuth (needs req.userId).
 *
 * Default required status is "approved" (the schema-level equivalent of the
 * legacy "verified" state).
 */
export function requireKyc(requiredStatus: RequireKycStatus = "approved") {
  const expected = normaliseStatus(requiredStatus);
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const kyc = await db.query.kycDocuments.findFirst({
        where: eq(kycDocuments.userId, req.userId!),
        columns: { status: true },
      });

      const currentStatus = kyc?.status ?? "not_submitted";

      if (currentStatus !== expected) {
        logger.warn(
          `[RequireKyc] Blocked ${req.method} ${req.path} — userId=${req.userId} kycStatus=${currentStatus} required=${expected}`,
        );
        res.status(403).json({
          error: "KYC verification required for this action",
          kycStatus: currentStatus,
        });
        return;
      }

      next();
    } catch (err) {
      logger.error("[RequireKyc] Error checking KYC status", err);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
