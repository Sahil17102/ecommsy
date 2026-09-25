/**
 * Seeder: Fetch all pickup addresses from Ekart and upsert into our pickup_addresses table.
 *
 * Usage:
 *   SEED_USER_ID=<uuid> npm run seed:ekart-pickup-addresses
 *
 * If SEED_USER_ID is not set, the seeder falls back to the first active user in the DB.
 */

import dotenv from "dotenv";
import axios from "axios";
import { and, asc, count, eq } from "drizzle-orm";
import { connectDB, disconnectDB, db } from "../config/db.js";
import { pickupAddresses, serviceProviders, users } from "../db/schema.js";
import { externalUrls } from "../config/externalUrls.js";
import logger from "../config/logger.js";

dotenv.config();

// ── Types ──

interface EkartAddress {
  alias: string;
  phone: number;
  address_line1: string;
  address_line2?: string;
  pincode: number;
  city: string;
  state: string;
  country: string;
  geo?: { lat?: number; lon?: number };
}

type SpCredentials = { b2c?: { values?: Record<string, string> } } | null;

// ── Auth ──

async function getEkartToken(): Promise<string> {
  const sp = await db.query.serviceProviders.findFirst({
    where: and(eq(serviceProviders.slug, "ekart"), eq(serviceProviders.isActive, true)),
  });

  if (!sp) throw new Error("Ekart service provider not found or disabled in DB");

  const creds = (sp.credentials ?? {}) as SpCredentials;
  const values = creds?.b2c?.values ?? {};
  const clientId = values.clientId;
  const username = values.username || process.env.EKART_USERNAME;
  const password = values.password || process.env.EKART_PASSWORD;

  if (!clientId || !username || !password) {
    throw new Error("Missing Ekart credentials (clientId, username, password)");
  }

  logger.info(`[Ekart Seeder] Fetching auth token for client ${clientId}`);
  const { data } = await axios.post(
    `${externalUrls.ekart.authUrl}/${clientId}`,
    { username, password },
    { timeout: 10_000 },
  );

  const token = data?.token || data?.data?.token || data?.access_token;
  if (!token) throw new Error(`Auth response has no token — ${JSON.stringify(data)}`);

  logger.info("[Ekart Seeder] Auth token obtained");
  return token;
}

// ── Fetch addresses from Ekart ──

async function fetchEkartAddresses(token: string): Promise<EkartAddress[]> {
  logger.info("[Ekart Seeder] Fetching pickup addresses from Ekart");

  const { data } = await axios.get(externalUrls.ekart.listPickupAddresses, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15_000,
  });

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.addresses)) return data.addresses;
  if (Array.isArray(data?.result)) return data.result;

  logger.warn(`[Ekart Seeder] Unexpected response shape: ${JSON.stringify(data)}`);
  return [];
}

// ── Resolve target user ──

async function resolveUserId(): Promise<string> {
  const envId = process.env.SEED_USER_ID;
  if (envId) {
    const user = await db.query.users.findFirst({ where: eq(users.id, envId) });
    if (!user) throw new Error(`User with id "${envId}" not found`);
    logger.info(`[Ekart Seeder] Using user from SEED_USER_ID: ${envId}`);
    return user.id;
  }

  // Fallback: first active user
  const first = await db.query.users.findFirst({
    where: eq(users.isActive, true),
    orderBy: [asc(users.createdAt)],
  });
  if (!first) throw new Error("No active user found in DB — set SEED_USER_ID");
  logger.info(`[Ekart Seeder] Falling back to first active user: ${first.id}`);
  return first.id;
}

// ── Seed ──

async function seed() {
  await connectDB();
  logger.info("[Ekart Seeder] Connected to Postgres");

  const token = await getEkartToken();
  const ekartAddresses = await fetchEkartAddresses(token);

  if (ekartAddresses.length === 0) {
    logger.info("[Ekart Seeder] No addresses returned from Ekart — nothing to seed");
    await disconnectDB();
    return;
  }

  logger.info(`[Ekart Seeder] Found ${ekartAddresses.length} address(es) on Ekart`);

  const userId = await resolveUserId();

  // Check if any address exists to determine isPrimary for first upsert
  const [{ value: existingCount = 0 } = { value: 0 }] = await db
    .select({ value: count() })
    .from(pickupAddresses)
    .where(and(eq(pickupAddresses.userId, userId), eq(pickupAddresses.isActive, true)));
  let primaryAssigned = existingCount > 0;

  let upserted = 0;
  let skipped = 0;

  for (const addr of ekartAddresses) {
    const alias = addr.alias?.trim();
    if (!alias) {
      logger.warn("[Ekart Seeder] Skipping address with no alias");
      skipped++;
      continue;
    }

    const phone = String(addr.phone ?? "").replace(/\D/g, "").slice(-10);
    const pincode = String(addr.pincode ?? "").padStart(6, "0").slice(-6);

    // Auto-set first address as primary if none exist yet
    const isPrimary = !primaryAssigned;
    if (!primaryAssigned) primaryAssigned = true;

    const existing = await db.query.pickupAddresses.findFirst({
      where: and(eq(pickupAddresses.userId, userId), eq(pickupAddresses.nickname, alias)),
    });

    const baseValues = {
      userId,
      nickname: alias,
      contactName: alias,
      phone: phone || "9999999999",
      email: process.env.SEED_DEFAULT_EMAIL || "noreply@placeholder.com",
      role: "warehouse_manager",
      addressLine1: addr.address_line1 || " ",
      ...(addr.address_line2 && { addressLine2: addr.address_line2 }),
      city: addr.city || " ",
      state: addr.state || " ",
      country: addr.country || "India",
      pincode: pincode || "000000",
      addressType: "pickup",
      isSameAsRto: true,
      isActive: true,
      isPrimary,
      ...(addr.geo?.lat != null && { latitude: addr.geo.lat }),
      ...(addr.geo?.lon != null && { longitude: addr.geo.lon }),
      updatedAt: new Date(),
    } as typeof pickupAddresses.$inferInsert;

    if (existing) {
      await db.update(pickupAddresses).set(baseValues).where(eq(pickupAddresses.id, existing.id));
    } else {
      await db.insert(pickupAddresses).values(baseValues);
    }

    logger.info(`[Ekart Seeder] Upserted: "${alias}" (${addr.city}, ${addr.state})`);
    upserted++;
  }

  logger.info(`[Ekart Seeder] Done — ${upserted} upserted, ${skipped} skipped`);
  await disconnectDB();
}

seed().catch((err) => {
  logger.error("[Ekart Seeder] Failed", err);
  process.exit(1);
});
