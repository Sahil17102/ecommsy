/**
 * Seeder: Xpressbees Franchise Couriers
 *
 * - Removes old generic "Xpressbees Air" and "Xpressbees Surface" couriers + their pricing
 * - Creates/updates the two actual franchise couriers with their Xpressbees API IDs
 * - Sets B2C pricing for Xpressbees Franchise B2C
 * - Sets B2B pricing for Xpressbees Franchise B2B
 *
 * Franchise IDs (from Xpressbees dashboard):
 *   13826 → SHIP AGGRRGATOR TECHNOLOGY FRANCHISE B2C
 *   13827 → SHIP AGGRRGATOR TECHNOLOGY FRANCHISE B2B
 */

import dotenv from "dotenv";
import { and, eq, inArray } from "drizzle-orm";
import { connectDB, disconnectDB, db } from "../config/db.js";
import { b2cPricing, b2cZones, couriers } from "../db/schema.js";
import logger from "../config/logger.js";

dotenv.config();

// ── Zone ordering: must match the order zones are listed in b2c_zones table ──
const ZONE_MAP = [
  "WITHIN_CITY",    // z1
  "WITHIN_STATE",   // z2
  "WITHIN_REGION",  // z3
  "METRO_TO_METRO", // z4
  "SPECIAL_ZONE",   // z5
  "ROI",            // z6
] as const;

// ── Courier definitions ──
const COURIERS = [
  {
    name: "Xpressbees Franchise B2C",
    franchiseCourierId: "13826",
    businessType: ["b2c"] as string[],
    mode: "surface" as const,
    // Format: [weightGrams, z1, z2, z3, z4, z5, z6, codFlat, codPercent]
    rates: [[500, 30, 36, 37, 41, 56, 46, 25, 1.3]] as [number, ...number[]][],
    rtoRates: [[500, 10, 20, 20, 10, 10, 20]] as [number, ...number[]][],
  },
  {
    name: "Xpressbees Franchise B2B",
    franchiseCourierId: "13827",
    businessType: ["b2b"] as string[],
    mode: "surface" as const,
    rates: [[500, 30, 36, 37, 41, 56, 46, 0, 0]] as [number, ...number[]][],
    rtoRates: [[500, 10, 20, 20, 10, 10, 20]] as [number, ...number[]][],
  },
] as const;

// Names to remove (old generic Xpressbees couriers)
const REMOVE_NAMES = ["Xpressbees Air", "Xpressbees Surface"];

async function seed() {
  await connectDB();
  logger.info("[XpressbeesFranchise] Connected to Postgres");

  // ── 1. Load zone IDs ──
  const zones = await db.select().from(b2cZones).where(eq(b2cZones.isActive, true));
  const zoneIdMap: Record<string, string> = {};
  for (const z of zones) {
    zoneIdMap[z.code] = z.id;
  }
  for (const code of ZONE_MAP) {
    if (!zoneIdMap[code]) throw new Error(`Zone "${code}" not found — run seed:zones first`);
  }
  logger.info(`[XpressbeesFranchise] Loaded ${zones.length} zones`);

  // ── 2. Remove old couriers and their pricing ──
  const oldCouriers = await db
    .select()
    .from(couriers)
    .where(and(eq(couriers.serviceProvider, "xpressbees"), inArray(couriers.name, REMOVE_NAMES)));

  if (oldCouriers.length > 0) {
    const oldIds = oldCouriers.map((c) => c.id);
    const pricingDel = await db
      .delete(b2cPricing)
      .where(inArray(b2cPricing.courierId, oldIds))
      .returning({ id: b2cPricing.id });
    const courierDel = await db
      .delete(couriers)
      .where(inArray(couriers.id, oldIds))
      .returning({ id: couriers.id });
    logger.info(
      `[XpressbeesFranchise] Removed ${courierDel.length} old courier(s) (${REMOVE_NAMES.join(", ")}) and ${pricingDel.length} pricing record(s)`,
    );
  } else {
    logger.info("[XpressbeesFranchise] No old couriers to remove");
  }

  // ── 3. Upsert new franchise couriers + pricing ──
  for (const config of COURIERS) {
    // Upsert courier
    const existing = await db.query.couriers.findFirst({
      where: and(eq(couriers.name, config.name), eq(couriers.serviceProvider, "xpressbees")),
    });

    let courier;
    if (existing) {
      [courier] = await db
        .update(couriers)
        .set({
          courierType: "delivery" as const,
          businessType: config.businessType,
          isEnabled: true,
          logo: null,
          metaData: { franchiseCourierId: config.franchiseCourierId },
          updatedAt: new Date(),
        })
        .where(eq(couriers.id, existing.id))
        .returning();
    } else {
      [courier] = await db
        .insert(couriers)
        .values({
          name: config.name,
          serviceProvider: "xpressbees",
          courierType: "delivery" as const,
          businessType: config.businessType,
          isEnabled: true,
          logo: null,
          metaData: { franchiseCourierId: config.franchiseCourierId },
        })
        .returning();
    }

    logger.info(
      `[XpressbeesFranchise] Courier upserted: "${config.name}" (id: ${config.franchiseCourierId}, businessType: ${config.businessType.join(",")})`,
    );

    // Build RTO lookup by weight
    const rtoLookup: Record<number, number[]> = {};
    for (const [weight, ...rates] of config.rtoRates) {
      rtoLookup[weight] = rates;
    }

    // The new schema models pricing as { weightSlabs[], zoneRates[].slabRates[] }.
    // Each weight row becomes a single (minWeight, maxWeight=null) slab whose
    // per-zone slabRates entry carries forward/rto/codCharges/codPercent.
    for (const row of config.rates) {
      const [weight, ...rest] = row;
      const fwdZoneRates = rest.slice(0, 6) as number[];
      const codFlat = rest[6] as number;
      const codPercent = rest[7] as number;
      const rtoZoneRates = rtoLookup[weight] ?? fwdZoneRates;

      // Convert grams → kg for the schema's slab definition.
      const minWeightKg = weight / 1000;
      const weightSlabs = [{ minWeight: minWeightKg, maxWeight: null }];

      const zoneRates = ZONE_MAP.map((code, i) => ({
        zone: zoneIdMap[code],
        slabRates: [
          {
            forward: fwdZoneRates[i],
            rto: rtoZoneRates[i],
            codCharges: codFlat,
            codPercent,
          },
        ],
      }));

      const plan = "basic";
      const now = new Date();
      await db
        .insert(b2cPricing)
        .values({
          courierId: courier.id,
          plan,
          mode: config.mode,
          otherCharges: "0",
          weightSlabs,
          zoneRates,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [b2cPricing.courierId, b2cPricing.plan],
          set: {
            mode: config.mode,
            otherCharges: "0",
            weightSlabs,
            zoneRates,
            updatedAt: now,
          },
        });

      logger.info(
        `[XpressbeesFranchise] Pricing set: "${config.name}" (${config.mode}, ${weight}g) — z1: ₹${fwdZoneRates[0]}/${rtoZoneRates[0]}, z6: ₹${fwdZoneRates[5]}/${rtoZoneRates[5]}, COD: ₹${codFlat} + ${codPercent}%`,
      );
    }
  }

  logger.info("[XpressbeesFranchise] Done");
  await disconnectDB();
}

seed().catch((err) => {
  logger.error("[XpressbeesFranchise] Seed failed", err);
  process.exit(1);
});
