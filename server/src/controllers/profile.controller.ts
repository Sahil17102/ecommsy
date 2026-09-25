import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { users } from "../db/schema.js";
import logger from "../config/logger.js";

const TAG = "[ProfileController]";

const PROFILE_COLUMNS = {
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  businessName: true,
  website: true,
  supportEmail: true,
  contactNumber: true,
  address: true,
  pincode: true,
  city: true,
  state: true,
  plan: true,
} as const;

/**
 * GET /profile — Return the current user's company profile fields.
 */
export async function handleGetProfile(req: Request, res: Response) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, req.userId!),
    columns: PROFILE_COLUMNS,
  });
  if (!user) {
    res.status(404).json({ success: false, error: "User not found" });
    return;
  }
  res.json({ success: true, profile: user });
}

/** Fields the user is allowed to update (businessName & plan are read-only) */
const UPDATABLE_FIELDS = [
  "website",
  "supportEmail",
  "contactNumber",
  "address",
  "pincode",
  "city",
  "state",
] as const;

/**
 * PUT /profile — Update the current user's company profile.
 * businessName and plan are read-only (set during onboarding / by admin).
 */
export async function handleUpdateProfile(req: Request, res: Response) {
  const updates: Record<string, unknown> = {};

  for (const field of UPDATABLE_FIELDS) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ success: false, error: "No valid fields to update" });
    return;
  }

  const [updated] = await db
    .update(users)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(users.id, req.userId!))
    .returning();

  if (!updated) {
    res.status(404).json({ success: false, error: "User not found" });
    return;
  }

  const profile = await db.query.users.findFirst({
    where: eq(users.id, req.userId!),
    columns: PROFILE_COLUMNS,
  });

  logger.info(`${TAG} Profile updated — userId=${req.userId}`);
  res.json({ success: true, profile });
}
