/**
 * Seeder: Read all pickup addresses from our DB, compare against the warehouses
 * already registered on Delhivery's portal, and create any missing ones.
 *
 * Usage:
 *   npm run seed:delhivery-pickup-addresses
 *
 * Environment variables:
 *   DATABASE_URL         — required
 *   DELHIVERY_TOKEN      — required (if not stored in service_providers table)
 *   DELHIVERY_BASE_URL   — optional override (default: https://track.delhivery.com)
 */

import dotenv from "dotenv";
import axios from "axios";
import { and, eq } from "drizzle-orm";
import { connectDB, disconnectDB, db } from "../config/db.js";
import { pickupAddresses, serviceProviders } from "../db/schema.js";
import { externalUrls } from "../config/externalUrls.js";
import logger from "../config/logger.js";

dotenv.config();

// ── Types ──

interface DelhiveryFacility {
  facility_name: string;
  facility_id: string;
  status: string;
  address?: {
    pin_code?: string;
    phone?: string;
  };
}

interface DelhiveryListResponse {
  results?: DelhiveryFacility[];
}

type SpCredentials = { b2c?: { values?: Record<string, string> } } | null;

// Structural type for the jsonb `rtoAddress` blob — schema stores it untyped.
interface RtoAddressBlob {
  addressLine1?: string;
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
}

// ── Resolve token ──

async function getToken(): Promise<string> {
  if (process.env.DELHIVERY_TOKEN) return process.env.DELHIVERY_TOKEN;

  const sp = await db.query.serviceProviders.findFirst({
    where: and(eq(serviceProviders.slug, "delhivery"), eq(serviceProviders.isActive, true)),
  });

  if (!sp) throw new Error("Delhivery service provider not found or disabled in DB");

  const creds = (sp.credentials ?? {}) as SpCredentials;
  const token = creds?.b2c?.values?.accessToken;
  if (!token) throw new Error("No accessToken in Delhivery credentials");

  return token;
}

// ── Fetch existing warehouses from Delhivery ──

async function fetchDelhiveryWarehouses(token: string): Promise<Set<string>> {
  const knownNames = new Set<string>();

  try {
    const { data } = await axios.get<DelhiveryListResponse>(externalUrls.delhivery.listWarehouses, {
      headers: { Authorization: `Token ${token}`, Accept: "application/json" },
      timeout: 15_000,
    });

    const results = data?.results ?? [];
    for (const facility of results) {
      if (facility.facility_name) {
        knownNames.add(facility.facility_name.trim().toLowerCase());
      }
    }

    logger.info(`[Delhivery Seeder] Found ${knownNames.size} warehouse(s) already on Delhivery portal`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`[Delhivery Seeder] Could not fetch existing warehouses (${message}) — using hardcoded known set`);

    const hardcoded = [
      "damru express transport",
      "rang rasa",
      "damru express 1",
      "damru express",
      "dtc transport",
      "default pickup location",
      "ship aggregator",
    ];
    hardcoded.forEach((n) => knownNames.add(n));
  }

  return knownNames;
}

// ── Create a single warehouse on Delhivery ──

async function createWarehouse(
  token: string,
  payload: {
    name: string;
    phone: string;
    email: string;
    address: string;
    pin: string;
    city: string;
    state: string;
    country: string;
    return_address: string;
    return_pin: string;
    return_city: string;
    return_state: string;
    return_country: string;
    registered_name: string;
  },
): Promise<{ success: boolean; error?: string }> {
  const { data } = await axios.post(externalUrls.delhivery.createWarehouse, payload, {
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    timeout: 10_000,
  });

  if (data?.error) return { success: false, error: data.error };
  return { success: true };
}

// ── Main ──

async function seed() {
  await connectDB();
  logger.info("[Delhivery Seeder] Connected to Postgres");

  const token = await getToken();
  logger.info("[Delhivery Seeder] Resolved Delhivery token");

  const existingOnDelhivery = await fetchDelhiveryWarehouses(token);

  // Fetch all active pickup addresses from our DB (across all users)
  const dbAddresses = await db
    .select({
      nickname: pickupAddresses.nickname,
      contactName: pickupAddresses.contactName,
      phone: pickupAddresses.phone,
      email: pickupAddresses.email,
      addressLine1: pickupAddresses.addressLine1,
      pincode: pickupAddresses.pincode,
      city: pickupAddresses.city,
      state: pickupAddresses.state,
      country: pickupAddresses.country,
      isSameAsRto: pickupAddresses.isSameAsRto,
      rtoAddress: pickupAddresses.rtoAddress,
    })
    .from(pickupAddresses)
    .where(eq(pickupAddresses.isActive, true));

  logger.info(`[Delhivery Seeder] Found ${dbAddresses.length} active pickup address(es) in DB`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const addr of dbAddresses) {
    const nickname = (addr.nickname ?? "").trim();
    if (!nickname) {
      logger.warn("[Delhivery Seeder] Skipping address with no nickname");
      skipped++;
      continue;
    }
    const nicknameLower = nickname.toLowerCase();

    if (existingOnDelhivery.has(nicknameLower)) {
      logger.info(`[Delhivery Seeder] SKIP "${nickname}" — already exists on Delhivery`);
      skipped++;
      continue;
    }

    const phone = (addr.phone ?? "").replace(/\D/g, "").slice(-10);
    const rto = (addr.isSameAsRto ? null : (addr.rtoAddress as RtoAddressBlob | null)) ?? null;

    const payload = {
      name: nickname,
      registered_name: nickname,
      phone,
      email: addr.email ?? "",
      address: addr.addressLine1 ?? "",
      pin: addr.pincode ?? "",
      city: addr.city ?? "",
      state: addr.state ?? "",
      country: addr.country || "India",
      return_address: rto?.addressLine1 ?? addr.addressLine1 ?? "",
      return_pin: rto?.pincode ?? addr.pincode ?? "",
      return_city: rto?.city ?? addr.city ?? "",
      return_state: rto?.state ?? addr.state ?? "",
      return_country: rto?.country ?? addr.country ?? "India",
    };

    try {
      const result = await createWarehouse(token, payload);
      if (result.success) {
        logger.info(`[Delhivery Seeder] CREATED "${nickname}" (${addr.city}, ${addr.pincode})`);
        created++;
      } else {
        logger.warn(`[Delhivery Seeder] FAILED "${nickname}" — ${result.error}`);
        failed++;
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: unknown }; message?: string };
      logger.error(`[Delhivery Seeder] ERROR "${nickname}" — ${e?.response?.data ? JSON.stringify(e.response.data) : e?.message}`);
      failed++;
    }
  }

  logger.info(`[Delhivery Seeder] Done — ${created} created, ${skipped} skipped, ${failed} failed`);
  await disconnectDB();
}

seed().catch((err) => {
  logger.error("[Delhivery Seeder] Failed", err);
  process.exit(1);
});
