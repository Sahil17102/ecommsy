/**
 * Seeder: Import pickup addresses from a Delhivery `listWarehouses` JSON dump.
 *
 * Source: the JSON body returned by Delhivery's facility-list API (i.e. the
 * shape `{ results: [{ facility_name, address: {...}, return_address: {...},
 * ...}] }`). Save the response at the path below and run:
 *
 *   npm run seed:delhivery-facilities
 *
 * Env:
 *   DATABASE_URL           — required
 *   SEED_FACILITIES_JSON   — optional, override the default fixture path
 *   SEED_USER_EMAIL        — optional, override the owning user (default
 *                            admin@searchcraftdigital.com)
 */

import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq, inArray } from "drizzle-orm";
import { connectDB, disconnectDB, db } from "../config/db.js";
import { pickupAddresses, users } from "../db/schema.js";
import logger from "../config/logger.js";

dotenv.config();

const DEFAULT_USER_EMAIL = "admin@searchcraftdigital.com";

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_FIXTURE_PATH = resolve(here, "data/delhiveryFacilities.json");

// ── Delhivery payload shapes (only the fields we actually consume) ──

interface DelhiveryAddress {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  pin_code?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  first_name?: string | null;
  contact_person?: string | null;
}

interface DelhiveryFacility {
  facility_name?: string | null;
  facility_id?: string | null;
  status?: string | null;
  blocked?: boolean | null;
  gst_number?: string | null;
  address?: DelhiveryAddress | null;
  return_address?: DelhiveryAddress | null;
}

interface DelhiveryListResponse {
  results?: DelhiveryFacility[];
}

// ── Helpers ──

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function normalizeCountry(raw: string | null | undefined): string {
  const c = (raw ?? "").trim().toUpperCase();
  if (!c || c === "IN" || c === "IND") return "India";
  return titleCase(c);
}

function normalizeState(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return titleCase(raw.trim());
}

function cleanPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return digits.slice(-10);
}

function normalizeNickname(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return raw.trim().replace(/\s+/g, " ");
}

// Compare the primary address vs the return address on the fields we care
// about. If everything matches, mark `is_same_as_rto=true` and skip storing
// the rto blob.
function isSameAddress(a: DelhiveryAddress, b: DelhiveryAddress): boolean {
  const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
  return (
    norm(a.address_line1) === norm(b.address_line1) &&
    norm(a.pin_code) === norm(b.pin_code) &&
    norm(a.city) === norm(b.city) &&
    norm(a.state) === norm(b.state)
  );
}

interface MappedRow {
  userId: string;
  nickname: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string;
  pincode: string | null;
  gstNumber: string | null;
  isSameAsRto: boolean;
  rtoAddress: Record<string, unknown> | null;
  isActive: boolean;
}

function mapFacility(f: DelhiveryFacility, userId: string): MappedRow | null {
  const nickname = normalizeNickname(f.facility_name);
  if (!nickname) return null;

  const addr = f.address ?? {};
  const rto = f.return_address ?? null;

  const sameAsRto = rto ? isSameAddress(addr, rto) : true;
  const rtoBlob =
    rto && !sameAsRto
      ? {
          addressLine1: rto.address_line1 ?? null,
          addressLine2: rto.address_line2 ?? null,
          city: rto.city ?? null,
          state: normalizeState(rto.state),
          pincode: rto.pin_code ?? null,
          country: normalizeCountry(rto.country),
        }
      : null;

  return {
    userId,
    nickname,
    contactName: addr.contact_person ?? addr.first_name ?? null,
    phone: cleanPhone(addr.phone),
    email: addr.email ?? null,
    addressLine1: addr.address_line1 ?? null,
    addressLine2: addr.address_line2 ?? null,
    city: addr.city ?? null,
    state: normalizeState(addr.state),
    country: normalizeCountry(addr.country),
    pincode: addr.pin_code ?? null,
    gstNumber: f.gst_number ?? null,
    isSameAsRto: sameAsRto,
    rtoAddress: rtoBlob,
    isActive: f.status === "ACTIVE" && !f.blocked,
  };
}

// ── Main ──

async function seed() {
  const fixturePath = process.env.SEED_FACILITIES_JSON ?? DEFAULT_FIXTURE_PATH;
  const ownerEmail = process.env.SEED_USER_EMAIL ?? DEFAULT_USER_EMAIL;

  logger.info(`[Delhivery Facilities] Reading fixture from ${fixturePath}`);
  const raw = readFileSync(fixturePath, "utf8");
  const payload = JSON.parse(raw) as DelhiveryListResponse;
  const facilities = payload.results ?? [];
  logger.info(`[Delhivery Facilities] Parsed ${facilities.length} facility record(s)`);

  await connectDB();

  const owner = await db.query.users.findFirst({ where: eq(users.email, ownerEmail) });
  if (!owner) {
    throw new Error(
      `Owner user not found (email=${ownerEmail}). Run the admin seed first or set SEED_USER_EMAIL.`,
    );
  }
  logger.info(`[Delhivery Facilities] Attaching to user ${owner.email} (${owner.id})`);

  const rows: MappedRow[] = [];
  let skippedInvalid = 0;
  for (const f of facilities) {
    const mapped = mapFacility(f, owner.id);
    if (!mapped) {
      skippedInvalid++;
      continue;
    }
    rows.push(mapped);
  }

  // De-dupe within the fixture itself: first occurrence of each nickname wins.
  const byNickname = new Map<string, MappedRow>();
  let duplicatesInFixture = 0;
  for (const r of rows) {
    const key = r.nickname.toLowerCase();
    if (byNickname.has(key)) {
      duplicatesInFixture++;
      continue;
    }
    byNickname.set(key, r);
  }
  const candidates = Array.from(byNickname.values());

  // Skip nicknames already present for this user.
  const existingRows = await db
    .select({ nickname: pickupAddresses.nickname })
    .from(pickupAddresses)
    .where(
      and(
        eq(pickupAddresses.userId, owner.id),
        inArray(
          pickupAddresses.nickname,
          candidates.map((c) => c.nickname),
        ),
      ),
    );
  const existing = new Set(
    existingRows.map((r) => (r.nickname ?? "").toLowerCase()),
  );

  const toInsert = candidates.filter((c) => !existing.has(c.nickname.toLowerCase()));
  const skippedExisting = candidates.length - toInsert.length;

  if (toInsert.length === 0) {
    logger.info(
      `[Delhivery Facilities] Nothing to insert — ${skippedExisting} skipped (already present), ${duplicatesInFixture} dupes in fixture, ${skippedInvalid} invalid`,
    );
    await disconnectDB();
    return;
  }

  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    const out = await db
      .insert(pickupAddresses)
      .values(batch)
      .returning({ id: pickupAddresses.id });
    inserted += out.length;
    logger.info(
      `[Delhivery Facilities]   batch ${Math.floor(i / BATCH) + 1}: inserted ${out.length} (running total ${inserted})`,
    );
  }

  logger.info(
    `[Delhivery Facilities] Done — ${inserted} inserted, ${skippedExisting} skipped (existing), ${duplicatesInFixture} dupes in fixture, ${skippedInvalid} invalid`,
  );
  await disconnectDB();
}

seed().catch(async (err) => {
  logger.error("[Delhivery Facilities] Seed failed", err);
  try {
    await disconnectDB();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
