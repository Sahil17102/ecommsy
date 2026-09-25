import dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { connectDB, disconnectDB, db } from "../config/db.js";
import { b2cPricing, b2cZones, couriers } from "../db/schema.js";
import logger from "../config/logger.js";
import {
  ZONE_MAP,
  buildPricingPayload,
  rateCardsFor,
  serviceTypeFromName,
} from "./dtdcRateCards.js";

dotenv.config();

const TAG = "[SeedSl4041Pricing]";
const CUSTOMER_CODE = "SL4041";
const PLAN = "basic";

/**
 * Targeted, NON-DESTRUCTIVE pricing seed for the DTDC SL4041 couriers.
 *
 * Unlike seed:couriers-dtdc (which wipes and recreates ALL dtdc couriers), this
 * only upserts b2c_pricing for the existing SL4041 couriers — it never touches
 * the courier rows themselves, so courier IDs / order references stay intact.
 * Re-runnable: upserts on the (courier_id, plan) unique index. Rates come from
 * RATE_CARDS_BY_CUSTOMER_CODE.SL4041 in dtdcRateCards.ts.
 *
 * Couriers are matched by NAME ("...(DTDC-SL4041)") rather than account binding:
 * in the live DB these couriers are bound to the SL2850 account and their
 * account creds carry no customerCode, so neither is a reliable selector.
 */
async function seed() {
  await connectDB();
  logger.info(`${TAG} Connected to Postgres`);

  // 1. Zone code → id map (zoneRates reference zone ids).
  const zones = await db.select().from(b2cZones).where(eq(b2cZones.isActive, true));
  const zoneIdMap: Record<string, string> = {};
  for (const z of zones) zoneIdMap[z.code] = z.id;
  for (const code of ZONE_MAP) {
    if (!zoneIdMap[code]) throw new Error(`Zone "${code}" not found — run seed:zones first`);
  }

  // 2. SL4041 couriers = dtdc couriers whose name carries the SL4041 account tag.
  const allDtdc = await db.select().from(couriers).where(eq(couriers.serviceProvider, "dtdc"));
  const sl4041Couriers = allDtdc.filter((c) => c.name.includes(CUSTOMER_CODE));

  if (sl4041Couriers.length === 0) {
    throw new Error(
      `No dtdc couriers with "${CUSTOMER_CODE}" in their name found. ` +
        `Expected rows like "DTDC Priority (DTDC-${CUSTOMER_CODE})".`,
    );
  }
  logger.info(`${TAG} Found ${sl4041Couriers.length} SL4041 courier(s)`);

  const rateCards = rateCardsFor(CUSTOMER_CODE);
  const now = new Date();
  let upserts = 0;

  // 4. Upsert one pricing row per courier from its service-type rate card.
  //    Service is keyed off the NAME, not metaData.serviceTypeId — the latter
  //    has drifted in the live DB (all 4 say "B2C PREMIUM") and would mis-price.
  for (const courier of sl4041Couriers) {
    const serviceTypeId = serviceTypeFromName(courier.name);
    const card = serviceTypeId ? rateCards[serviceTypeId] : undefined;

    if (!card) {
      logger.warn(
        `${TAG} Skipping "${courier.name}" — could not resolve a service type from its name`,
      );
      continue;
    }

    const pricingPayload = buildPricingPayload(card, zoneIdMap);

    await db
      .insert(b2cPricing)
      .values({ courierId: courier.id, plan: PLAN, ...pricingPayload, updatedAt: now })
      .onConflictDoUpdate({
        target: [b2cPricing.courierId, b2cPricing.plan],
        set: { ...pricingPayload, updatedAt: now },
      });
    upserts++;
    logger.info(
      `${TAG}   ${courier.name}: ${card.mode}, slabs=${card.slabs.length}, ` +
        `z1=${card.slabs[0].forward[0]}/${card.slabs[0].rto[0]}, ` +
        `z6=${card.slabs[0].forward[5]}/${card.slabs[0].rto[5]}, COD ₹${card.codCharges}+${card.codPercent}%`,
    );
  }

  logger.info(`${TAG} Done — upserted ${upserts} pricing row(s) for ${CUSTOMER_CODE}`);
  await disconnectDB();
}

seed().catch((err) => {
  logger.error(`${TAG} Seed failed`, err);
  process.exit(1);
});
