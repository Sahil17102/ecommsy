import dotenv from "dotenv";
import { and, eq, inArray } from "drizzle-orm";
import { connectDB, disconnectDB, db } from "../config/db.js";
import { b2cPricing, b2cZones, couriers, serviceProviders } from "../db/schema.js";
import logger from "../config/logger.js";
import {
  DTDC_SERVICES,
  ZONE_MAP,
  buildPricingPayload,
  prettyServiceName,
  rateCardsFor,
} from "./dtdcRateCards.js";

dotenv.config();

const TAG = "[SeedDtdcCouriers]";

type CredentialBlock = { values?: Record<string, string> };
type SpCredentials = { b2c?: CredentialBlock; b2b?: CredentialBlock } | null;

async function seed() {
  await connectDB();
  logger.info(`${TAG} Connected to Postgres`);

  // ── 1. Load active DTDC service-provider rows (one per customer account) ──
  const accounts = await db
    .select()
    .from(serviceProviders)
    .where(and(eq(serviceProviders.slug, "dtdc"), eq(serviceProviders.isActive, true)));

  if (accounts.length === 0) {
    throw new Error("No active DTDC service provider rows found in service_providers");
  }
  logger.info(`${TAG} Found ${accounts.length} active DTDC account(s)`);

  // ── 2. Load zone IDs (needed for zoneRates.zone references in b2c_pricing) ──
  const zones = await db.select().from(b2cZones).where(eq(b2cZones.isActive, true));
  const zoneIdMap: Record<string, string> = {};
  for (const z of zones) zoneIdMap[z.code] = z.id;
  for (const code of ZONE_MAP) {
    if (!zoneIdMap[code]) throw new Error(`Zone "${code}" not found — run seed:zones first`);
  }
  logger.info(`${TAG} Loaded ${zones.length} zones`);

  // ── 3. Clear out any previous DTDC couriers (and pricing) for idempotence ──
  const oldCouriers = await db
    .select()
    .from(couriers)
    .where(eq(couriers.serviceProvider, "dtdc"));
  if (oldCouriers.length > 0) {
    const oldIds = oldCouriers.map((c) => c.id);
    const pricingDeleted = await db
      .delete(b2cPricing)
      .where(inArray(b2cPricing.courierId, oldIds))
      .returning({ id: b2cPricing.id });
    const courierDeleted = await db
      .delete(couriers)
      .where(eq(couriers.serviceProvider, "dtdc"))
      .returning({ id: couriers.id });
    logger.info(
      `${TAG} Cleared ${courierDeleted.length} old courier(s) and ${pricingDeleted.length} pricing row(s)`,
    );
  }

  // ── 4. Seed 4 couriers + their pricing per account ──
  let courierCount = 0;
  let pricingCount = 0;
  for (const account of accounts) {
    const creds = (account.credentials ?? {}) as SpCredentials;
    const customerCode = creds?.b2c?.values?.customerCode ?? account.name;
    const rateCards = rateCardsFor(creds?.b2c?.values?.customerCode);

    for (const svc of DTDC_SERVICES) {
      const name = `DTDC ${prettyServiceName(svc.serviceTypeId)} (${customerCode})`;
      const card = rateCards[svc.serviceTypeId];

      const [courier] = await db
        .insert(couriers)
        .values({
          name,
          serviceProvider: "dtdc",
          courierType: "delivery",
          businessType: ["b2c"],
          isEnabled: true,
          logo: null,
          metaData: {
            serviceTypeId: svc.serviceTypeId,
            serviceProviderId: account.id,
            rawResponse: svc,
          },
        })
        .returning();
      courierCount++;
      logger.info(`${TAG} Courier: ${name} → account=${account.name} (${account.id})`);

      // Build pricing — one row per courier with all slabs aligned across zones.
      const pricingPayload = buildPricingPayload(card, zoneIdMap);

      await db.insert(b2cPricing).values({
        courierId: courier.id,
        plan: "basic",
        ...pricingPayload,
        updatedAt: new Date(),
      });
      pricingCount++;
      logger.info(
        `${TAG}   Pricing: ${card.mode}, slabs=${card.slabs.length}, z1=${card.slabs[0].forward[0]}/${card.slabs[0].rto[0]}, z6=${card.slabs[0].forward[5]}/${card.slabs[0].rto[5]}, COD ₹${card.codCharges}+${card.codPercent}%`,
      );
    }
  }

  logger.info(
    `${TAG} Done — ${courierCount} courier(s) and ${pricingCount} pricing row(s) across ${accounts.length} account(s)`,
  );
  await disconnectDB();
}

seed().catch((err) => {
  logger.error(`${TAG} Seed failed`, err);
  process.exit(1);
});
