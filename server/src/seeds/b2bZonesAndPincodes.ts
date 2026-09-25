/**
 * Seeder: B2B Zones, Pincodes, Zone Rates & Additional Charges
 *
 * Seeds:
 * 1. B2B Zones (A through E)
 * 2. B2B Pincodes — maps ~100 major Indian pincodes to zones per courier
 * 3. B2B Zone Rates — per-kg rate matrix for each zone-to-zone pair
 * 4. B2B Additional Charges — overhead charges config per courier
 *
 * Run: npx tsx src/seeds/b2bZonesAndPincodes.ts
 */

import dotenv from "dotenv";
import { and, eq } from "drizzle-orm";
import { connectDB, disconnectDB, db } from "../config/db.js";
import {
  b2bAdditionalCharges,
  b2bPincodes,
  b2bZoneRates,
  b2bZones,
  couriers,
} from "../db/schema.js";
import logger from "../config/logger.js";

dotenv.config();

// ── 1. ZONE DEFINITIONS ──

const ZONES = [
  { code: "A", name: "Zone A — Metro", description: "Major metro cities (Delhi, Mumbai, Bangalore, Chennai, Kolkata, Hyderabad)" },
  { code: "B", name: "Zone B — Tier 1", description: "Tier 1 cities (Pune, Ahmedabad, Jaipur, Lucknow, etc.)" },
  { code: "C", name: "Zone C — Tier 2", description: "Tier 2 cities and state capitals" },
  { code: "D", name: "Zone D — Tier 3 / Semi-Urban", description: "Smaller cities and semi-urban areas" },
  { code: "E", name: "Zone E — Remote / Special", description: "Remote areas, NE India, J&K, island territories" },
];

// ── 2. PINCODE → ZONE MAPPING ──
// Format: [pincode, city, state, zoneCode, flags?]

type PincodeEntry = [string, string, string, string, Partial<{ isOda: boolean; isRemote: boolean; isCsd: boolean; isMall: boolean; isSez: boolean }>?];

const PINCODES: PincodeEntry[] = [
  // Zone A — Metro cities
  ["110001", "New Delhi", "Delhi", "A"],
  ["110020", "New Delhi", "Delhi", "A"],
  ["110085", "New Delhi", "Delhi", "A"],
  ["122001", "Gurgaon", "Haryana", "A"],
  ["201301", "Noida", "Uttar Pradesh", "A"],
  ["400001", "Mumbai", "Maharashtra", "A"],
  ["400069", "Mumbai", "Maharashtra", "A"],
  ["400076", "Mumbai", "Maharashtra", "A"],
  ["560001", "Bangalore", "Karnataka", "A"],
  ["560068", "Bangalore", "Karnataka", "A"],
  ["600001", "Chennai", "Tamil Nadu", "A"],
  ["600040", "Chennai", "Tamil Nadu", "A"],
  ["700001", "Kolkata", "West Bengal", "A"],
  ["700091", "Kolkata", "West Bengal", "A"],
  ["500001", "Hyderabad", "Telangana", "A"],
  ["500081", "Hyderabad", "Telangana", "A"],

  // Zone B — Tier 1 cities
  ["411001", "Pune", "Maharashtra", "B"],
  ["411057", "Pune", "Maharashtra", "B"],
  ["380001", "Ahmedabad", "Gujarat", "B"],
  ["380015", "Ahmedabad", "Gujarat", "B"],
  ["302001", "Jaipur", "Rajasthan", "B"],
  ["302020", "Jaipur", "Rajasthan", "B"],
  ["226001", "Lucknow", "Uttar Pradesh", "B"],
  ["226010", "Lucknow", "Uttar Pradesh", "B"],
  ["440001", "Nagpur", "Maharashtra", "B"],
  ["160001", "Chandigarh", "Chandigarh", "B"],
  ["462001", "Bhopal", "Madhya Pradesh", "B"],
  ["452001", "Indore", "Madhya Pradesh", "B"],
  ["800001", "Patna", "Bihar", "B"],
  ["641001", "Coimbatore", "Tamil Nadu", "B"],
  ["530001", "Visakhapatnam", "Andhra Pradesh", "B"],
  ["682001", "Kochi", "Kerala", "B"],
  ["395001", "Surat", "Gujarat", "B"],
  ["360001", "Rajkot", "Gujarat", "B"],

  // Zone C — Tier 2 cities
  ["208001", "Kanpur", "Uttar Pradesh", "C"],
  ["250001", "Meerut", "Uttar Pradesh", "C"],
  ["282001", "Agra", "Uttar Pradesh", "C"],
  ["211001", "Prayagraj", "Uttar Pradesh", "C"],
  ["221001", "Varanasi", "Uttar Pradesh", "C"],
  ["342001", "Jodhpur", "Rajasthan", "C"],
  ["313001", "Udaipur", "Rajasthan", "C"],
  ["324001", "Kota", "Rajasthan", "C"],
  ["431001", "Aurangabad", "Maharashtra", "C"],
  ["416001", "Sangli", "Maharashtra", "C"],
  ["570001", "Mysore", "Karnataka", "C"],
  ["580001", "Hubli", "Karnataka", "C"],
  ["590001", "Belgaum", "Karnataka", "C"],
  ["625001", "Madurai", "Tamil Nadu", "C"],
  ["636001", "Salem", "Tamil Nadu", "C"],
  ["751001", "Bhubaneswar", "Odisha", "C"],
  ["769001", "Rourkela", "Odisha", "C"],
  ["440010", "Nagpur", "Maharashtra", "C"],
  ["335001", "Sri Ganganagar", "Rajasthan", "C"],
  ["140401", "Rajpura", "Punjab", "C"],

  // Zone D — Tier 3 / Semi-Urban
  ["243001", "Bareilly", "Uttar Pradesh", "D"],
  ["273001", "Gorakhpur", "Uttar Pradesh", "D"],
  ["274001", "Deoria", "Uttar Pradesh", "D"],
  ["344001", "Barmer", "Rajasthan", "D"],
  ["345001", "Jaisalmer", "Rajasthan", "D", { isOda: true }],
  ["370001", "Kutch", "Gujarat", "D", { isOda: true }],
  ["403001", "Panaji", "Goa", "D"],
  ["421001", "Dombivli", "Maharashtra", "D"],
  ["444001", "Akola", "Maharashtra", "D"],
  ["455001", "Dewas", "Madhya Pradesh", "D"],
  ["474001", "Gwalior", "Madhya Pradesh", "D"],
  ["486001", "Rewa", "Madhya Pradesh", "D"],
  ["577001", "Davangere", "Karnataka", "D"],
  ["671001", "Kasaragod", "Kerala", "D"],
  ["695001", "Thiruvananthapuram", "Kerala", "D"],
  ["831001", "Jamshedpur", "Jharkhand", "D"],
  ["834001", "Ranchi", "Jharkhand", "D"],
  ["846001", "Muzaffarpur", "Bihar", "D"],

  // Zone E — Remote / Special
  ["110021", "Defence Colony", "Delhi", "A", { isCsd: true }],
  ["400093", "Bhandup Mall", "Maharashtra", "A", { isMall: true }],
  ["781001", "Guwahati", "Assam", "E"],
  ["793001", "Shillong", "Meghalaya", "E", { isRemote: true }],
  ["795001", "Imphal", "Manipur", "E", { isRemote: true }],
  ["796001", "Aizawl", "Mizoram", "E", { isRemote: true }],
  ["797001", "Kohima", "Nagaland", "E", { isRemote: true }],
  ["799001", "Agartala", "Tripura", "E", { isRemote: true }],
  ["790001", "Itanagar", "Arunachal Pradesh", "E", { isRemote: true, isOda: true }],
  ["737101", "Gangtok", "Sikkim", "E", { isRemote: true }],
  ["180001", "Jammu", "Jammu & Kashmir", "E"],
  ["190001", "Srinagar", "Jammu & Kashmir", "E", { isRemote: true }],
  ["194101", "Leh", "Ladakh", "E", { isRemote: true, isOda: true }],
  ["744101", "Port Blair", "Andaman & Nicobar", "E", { isRemote: true, isOda: true }],
  ["403801", "SEZ Goa", "Goa", "D", { isSez: true }],
];

// ── 3. ZONE-TO-ZONE RATE MATRIX (₹ per kg) ──
const RATE_MATRIX: Record<string, number[]> = {
  A: [12, 18, 22, 28, 45],
  B: [18, 15, 20, 26, 42],
  C: [22, 20, 16, 24, 40],
  D: [28, 26, 24, 18, 38],
  E: [45, 42, 40, 38, 35],
};

// RTO rate = ~60% of forward rate
const RTO_FACTOR = 0.6;

// ── 4. ADDITIONAL CHARGES CONFIG ──
// NOTE: the new schema collapses ODA into a single `odaCharges` column and
// drops codMinimum, csdCharges, mallDeliveryCharges, rovMinimum, demurrage*
// and timeSpecific*/holidayPickup* fields. Drop-only fields are stashed into
// the jsonb `extras` blob so a future schema bump can recover them.

const ADDITIONAL_CHARGES_BASE = {
  awbCharges: "50",
  minimumChargeableWeight: "10",
  minimumChargeableAmount: "200",
  codChargesFlat: "50",
  codPercent: "1",
  fuelSurchargePercent: "10",
  greenTax: "25",
  odaCharges: "100", // schema only has one ODA column; using the flat amount
  rovPercent: "0.5",
  handlingCharges: [
    { min: 0, max: 50, charge: 0 },
    { min: 50, max: 100, charge: 150 },
    { min: 100, max: 200, charge: 250 },
    { min: 200, max: 99999, charge: 400 },
  ],
};

const ADDITIONAL_CHARGES_EXTRAS = {
  codMinimum: 75,
  odaChargesPerKg: 5,
  csdCharges: 200,
  mallDeliveryCharges: 150,
  rovMinimum: 100,
  demurrageFreeHours: 72,
  demurragePerHour: 10,
  demurrageMaxDays: 7,
  timeSpecificDeliveryCharge: 100,
  holidayPickupCharge: 150,
};

// ── SEED FUNCTION ──

async function seed() {
  await connectDB();
  logger.info("Connected to Postgres for B2B seeding");

  // ── Step 1: Seed zones ──
  const zoneMap = new Map<string, string>();

  for (const z of ZONES) {
    const now = new Date();
    const [zone] = await db
      .insert(b2bZones)
      .values({ code: z.code, name: z.name, description: z.description, updatedAt: now })
      .onConflictDoUpdate({
        target: b2bZones.code,
        set: { name: z.name, description: z.description, updatedAt: now },
      })
      .returning();
    zoneMap.set(z.code, zone.id);
    logger.info(`Seeded B2B zone: ${z.name} (${z.code})`);
  }

  logger.info(`B2B zones seeded — ${ZONES.length} zones`);

  // ── Step 2: Find all B2B-enabled couriers ──
  const b2bCourierRows = await db.select().from(couriers);
  const b2bCouriers = b2bCourierRows.filter((c) => {
    const types = (c.businessType ?? []) as string[];
    return c.isEnabled && types.includes("b2b");
  });

  if (b2bCouriers.length === 0) {
    logger.warn("No B2B couriers found! Skipping pincode/rate/charge seeding.");
    logger.warn("Make sure you have couriers with businessType containing 'b2b' enabled.");
    await disconnectDB();
    return;
  }

  logger.info(`Found ${b2bCouriers.length} B2B courier(s): ${b2bCouriers.map((c) => c.name).join(", ")}`);

  // ── Step 3: Seed pincodes for each B2B courier ──
  let pincodeCount = 0;

  for (const courier of b2bCouriers) {
    for (const [pincode, city, state, zoneCode, flags] of PINCODES) {
      const zoneId = zoneMap.get(zoneCode);
      if (!zoneId) continue;

      const fullFlags = {
        isOda: false,
        isRemote: false,
        isMall: false,
        isSez: false,
        isCsd: false,
        isAirport: false,
        isHighSecurity: false,
        ...flags,
      };

      const now = new Date();
      await db
        .insert(b2bPincodes)
        .values({
          pincode,
          city,
          state,
          zoneId,
          courierId: courier.id,
          serviceProvider: courier.serviceProvider,
          flags: fullFlags,
          isActive: true,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [b2bPincodes.pincode, b2bPincodes.courierId],
          set: {
            city,
            state,
            zoneId,
            serviceProvider: courier.serviceProvider,
            flags: fullFlags,
            isActive: true,
            updatedAt: now,
          },
        });
      pincodeCount++;
    }
  }

  logger.info(`B2B pincodes seeded — ${pincodeCount} entries (${PINCODES.length} pincodes × ${b2bCouriers.length} courier(s))`);

  // ── Step 4: Seed zone-to-zone rates for each B2B courier ──
  let rateCount = 0;
  const zoneCodes = ZONES.map((z) => z.code);

  for (const courier of b2bCouriers) {
    for (const originCode of zoneCodes) {
      const originZoneId = zoneMap.get(originCode)!;
      const rates = RATE_MATRIX[originCode];

      for (let j = 0; j < zoneCodes.length; j++) {
        const destCode = zoneCodes[j];
        const destZoneId = zoneMap.get(destCode)!;
        const ratePerKg = rates[j];
        const rtoRatePerKg = Math.round(ratePerKg * RTO_FACTOR * 100) / 100;

        const now = new Date();
        await db
          .insert(b2bZoneRates)
          .values({
            plan: "basic",
            courierId: courier.id,
            serviceProvider: courier.serviceProvider,
            originZoneId,
            destinationZoneId: destZoneId,
            ratePerKg: String(ratePerKg),
            rtoRatePerKg: String(rtoRatePerKg),
            volumetricDivisor: 5000,
            effectiveFrom: now,
            isActive: true,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [
              b2bZoneRates.plan,
              b2bZoneRates.courierId,
              b2bZoneRates.originZoneId,
              b2bZoneRates.destinationZoneId,
            ],
            set: {
              serviceProvider: courier.serviceProvider,
              ratePerKg: String(ratePerKg),
              rtoRatePerKg: String(rtoRatePerKg),
              volumetricDivisor: 5000,
              effectiveFrom: now,
              isActive: true,
              updatedAt: now,
            },
          });
        rateCount++;
      }
    }
  }

  logger.info(`B2B zone rates seeded — ${rateCount} entries (${zoneCodes.length}×${zoneCodes.length} matrix × ${b2bCouriers.length} courier(s))`);

  // ── Step 5: Seed additional charges for each B2B courier ──
  for (const courier of b2bCouriers) {
    const now = new Date();
    await db
      .insert(b2bAdditionalCharges)
      .values({
        plan: "basic",
        courierId: courier.id,
        serviceProvider: courier.serviceProvider,
        ...ADDITIONAL_CHARGES_BASE,
        extras: ADDITIONAL_CHARGES_EXTRAS,
        isActive: true,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [b2bAdditionalCharges.plan, b2bAdditionalCharges.courierId],
        set: {
          serviceProvider: courier.serviceProvider,
          ...ADDITIONAL_CHARGES_BASE,
          extras: ADDITIONAL_CHARGES_EXTRAS,
          isActive: true,
          updatedAt: now,
        },
      });
    logger.info(`B2B additional charges seeded for ${courier.name}`);
  }

  logger.info("B2B seeding complete!");
  logger.info(`  Zones: ${ZONES.length}`);
  logger.info(`  Pincodes: ${pincodeCount}`);
  logger.info(`  Zone rates: ${rateCount}`);
  logger.info(`  Additional charges: ${b2bCouriers.length}`);

  // suppress unused-import noise
  void and;
  void eq;

  await disconnectDB();
}

seed().catch((err) => {
  logger.error("B2B seeding failed", err);
  process.exit(1);
});
