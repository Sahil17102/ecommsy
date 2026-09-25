import dotenv from "dotenv";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { connectDB, disconnectDB, db } from "../config/db.js";
import { b2cPricing, couriers } from "../db/schema.js";
import logger from "../config/logger.js";

dotenv.config();

const TAG = "[CleanupCouriers]";

// Delhivery couriers to KEEP — everything else under "delhivery" gets deleted
const DELHIVERY_KEEP = ["Delhivery Surface", "Delhivery Express"];

async function cleanup() {
  await connectDB();
  logger.info(`${TAG} Connected to Postgres`);

  // ── 1. Remove extra Delhivery couriers ──
  const extraDelhivery = await db
    .select()
    .from(couriers)
    .where(and(eq(couriers.serviceProvider, "delhivery"), notInArray(couriers.name, DELHIVERY_KEEP)));

  if (extraDelhivery.length > 0) {
    const ids = extraDelhivery.map((c) => c.id);
    const pricingDeleted = await db
      .delete(b2cPricing)
      .where(inArray(b2cPricing.courierId, ids))
      .returning({ id: b2cPricing.id });
    const courierDeleted = await db
      .delete(couriers)
      .where(inArray(couriers.id, ids))
      .returning({ id: couriers.id });

    logger.info(
      `${TAG} Removed ${courierDeleted.length} extra Delhivery courier(s): ${extraDelhivery.map((c) => c.name).join(", ")}`,
    );
    logger.info(`${TAG} Removed ${pricingDeleted.length} associated pricing doc(s)`);
  } else {
    logger.info(`${TAG} No extra Delhivery couriers to remove`);
  }

  // ── 2. Remove ALL old Xpressbees couriers + pricing ──
  const oldXpressbees = await db
    .select()
    .from(couriers)
    .where(eq(couriers.serviceProvider, "xpressbees"));

  if (oldXpressbees.length > 0) {
    const ids = oldXpressbees.map((c) => c.id);
    const pricingDeleted = await db
      .delete(b2cPricing)
      .where(inArray(b2cPricing.courierId, ids))
      .returning({ id: b2cPricing.id });
    const courierDeleted = await db
      .delete(couriers)
      .where(inArray(couriers.id, ids))
      .returning({ id: couriers.id });

    logger.info(`${TAG} Removed ${courierDeleted.length} old Xpressbees courier(s)`);
    logger.info(`${TAG} Removed ${pricingDeleted.length} associated pricing doc(s)`);
  } else {
    logger.info(`${TAG} No old Xpressbees couriers to remove`);
  }

  logger.info(`${TAG} Cleanup complete`);
  await disconnectDB();
}

cleanup().catch((err) => {
  logger.error(`${TAG} Cleanup failed`, err);
  process.exit(1);
});
