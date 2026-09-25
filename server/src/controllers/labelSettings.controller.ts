import type { Request, Response } from "express";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "../config/db.js";
import { labelSettings, orders } from "../db/schema.js";
import { uploadDocument } from "../services/storage.js";
import logger from "../config/logger.js";

// Updatable fields the seller is allowed to PUT. Schema names are used here.
// Note: legacy code had `hideCustomerOrderBarcode` but the Drizzle schema only
// has `hideCustomerOrderBar` — the latter is what we accept on the wire too.
const UPDATABLE_FIELDS = [
  "showLogo",
  "logoUrl",
  "hideCustomerMobile",
  "hideCustomerOrderBar",
  "hideGstNumber",
  "hidePickupAddress",
  "hideRtoAddress",
  "hideRtoName",
  "hidePickupMobile",
  "hideRtoMobile",
  "hidePickupName",
  "hideHsn",
  "hideSku",
  "hideQty",
  "hideTotalAmount",
  "hideOrderAmount",
  "hideProduct",
] as const;

async function getOrCreateSettings(userId: string) {
  const existing = await db.query.labelSettings.findFirst({
    where: eq(labelSettings.userId, userId),
  });
  if (existing) return existing;
  const [created] = await db.insert(labelSettings).values({ userId }).returning();
  return created;
}

/**
 * GET /label-settings — Fetch the current user's label settings
 * Creates a default document if none exists.
 */
export async function handleGetLabelSettings(req: Request, res: Response) {
  const settings = await getOrCreateSettings(req.userId!);
  res.json({ settings });
}

/**
 * PUT /label-settings — Update the current user's label settings
 */
export async function handleUpdateLabelSettings(req: Request, res: Response) {
  const update: Record<string, unknown> = {};
  for (const field of UPDATABLE_FIELDS) {
    if (req.body[field] !== undefined) {
      update[field] = req.body[field];
    }
  }

  // Ensure a row exists, then update it.
  await getOrCreateSettings(req.userId!);

  const [settings] = await db
    .update(labelSettings)
    .set({ ...update, updatedAt: new Date() })
    .where(eq(labelSettings.userId, req.userId!))
    .returning();

  // Invalidate cached labels so they regenerate with new settings.
  const invalidated = await db
    .update(orders)
    .set({ labelUrl: null, updatedAt: new Date() })
    .where(and(eq(orders.userId, req.userId!), isNotNull(orders.labelUrl)))
    .returning({ id: orders.id });

  if (invalidated.length > 0) {
    logger.info(`[LabelSettings] Invalidated ${invalidated.length} cached labels for user ${req.userId}`);
  }

  res.json({ settings });
}

/**
 * POST /label-settings/logo — Upload a logo image for the shipping label
 * Expects multipart/form-data with a "logo" file field.
 */
export async function handleUploadLogo(req: Request, res: Response) {
  if (!req.file) {
    res.status(400).json({ success: false, error: "No file uploaded" });
    return;
  }

  const ext = req.file.originalname.split(".").pop() || "png";
  const key = `logos/${req.userId!}/label-logo.${ext}`;
  await uploadDocument(key, req.file.buffer, req.file.mimetype);

  // Build the URL that the client can use to display the logo
  const logoUrl = `/api/label-settings/logo/${req.userId!}/label-logo.${ext}`;

  await getOrCreateSettings(req.userId!);
  await db
    .update(labelSettings)
    .set({ logoUrl, showLogo: true, updatedAt: new Date() })
    .where(eq(labelSettings.userId, req.userId!));

  res.json({ logoUrl });
}

/**
 * GET /label-settings/logo/:userId/:filename — Serve a stored logo image
 */
export async function handleServeLogo(req: Request, res: Response) {
  const { downloadDocument } = await import("../services/storage.js");
  const key = `logos/${req.params.userId}/${req.params.filename}`;

  try {
    const { buffer, contentType } = await downloadDocument(key);
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=86400");
    res.send(buffer);
  } catch {
    res.status(404).json({ success: false, error: "Logo not found" });
  }
}
