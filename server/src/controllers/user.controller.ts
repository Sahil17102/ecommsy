import type { Request, Response } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { pickupAddresses } from "../db/schema.js";
import {
  listUsers,
  getUserById,
  toggleUserActive,
  updateUserPlan,
  getUserSummary,
} from "../services/user.js";
import { parseQuery, QType } from "../utils/parseQuery.js";

export async function handleListUsers(req: Request, res: Response) {
  const { search, page, limit, onboardingComplete, isVerified, isActive, plan, kycStatus, sortField, sortOrder } = parseQuery(req, {
    search: QType.STRING,
    page: QType.NUMBER,
    limit: QType.NUMBER,
    onboardingComplete: QType.BOOLEAN,
    isVerified: QType.BOOLEAN,
    isActive: QType.BOOLEAN,
    plan: QType.STRING,
    kycStatus: QType.STRING,
    sortField: QType.STRING,
    sortOrder: QType.STRING,
  });

  const result = await listUsers({
    search,
    onboardingComplete,
    isVerified,
    isActive,
    plan,
    kycStatus,
    page,
    limit,
    sortField,
    sortOrder: sortOrder as "asc" | "desc" | undefined,
  });
  res.json(result);
}

export async function handleGetUser(req: Request, res: Response) {
  const user = await getUserById(req.params.id);
  res.json({ user });
}

export async function handleToggleUserActive(req: Request, res: Response) {
  const doc = await toggleUserActive(req.params.id);
  res.json({ message: `User ${doc.isActive ? "activated" : "deactivated"}` });
}

export async function handleUpdateUserPlan(req: Request, res: Response) {
  const doc = await updateUserPlan(req.params.id, req.body.plan);
  res.json({ message: `User plan updated to ${doc.plan}` });
}

export async function handleGetUserSummary(req: Request, res: Response) {
  const summary = await getUserSummary(req.params.id);
  res.json(summary);
}

export async function handleGetUserPickupAddresses(req: Request, res: Response) {
  const addresses = await db
    .select()
    .from(pickupAddresses)
    .where(eq(pickupAddresses.userId, req.params.id))
    .orderBy(desc(pickupAddresses.isPrimary), desc(pickupAddresses.createdAt));
  res.json({ addresses });
}
