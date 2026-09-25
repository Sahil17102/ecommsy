/**
 * Seeder: insert the DTDC origin (pickup) addresses pulled from the DTDC
 * address-book API into our `pickup_addresses` table.
 *
 * Only `addType: "Origin"` records are seeded. Each nickname is suffixed with
 * "(DTDC)" so it's obvious in the UI that these came from / belong to the DTDC
 * account.
 *
 * All addresses are attached to a single owner (resolved by email). Idempotent:
 * an address with the same (userId, pincode, addressLine1) is skipped.
 *
 * Usage:
 *   npm run seed:dtdc-pickup-addresses
 */

import dotenv from "dotenv";
import { and, eq } from "drizzle-orm";
import { connectDB, disconnectDB, db } from "../config/db.js";
import { pickupAddresses, users } from "../db/schema.js";
import logger from "../config/logger.js";

dotenv.config();

const TAG = "[DtdcPickupAddresses]";

/** Owner of the seeded pickup addresses (the active DTDC tester). */
const OWNER_EMAIL = "harshitarajpal1523@gmail.com";

/**
 * DTDC origin records (addType === "Origin") from the address-book response.
 * 110075 is the known-good Dwarka pickup that books successfully against the
 * SL2850 account; 411045 / 110049 are additional registered origins.
 */
const DTDC_ORIGINS: Array<{
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  companyName?: string;
}> = [
  {
    name: "VUCLIP",
    phone: "8956524610",
    addressLine1: "ADD VUCLIP New Baner DTDC Franchisee, PF1587,Pune 411045 MOB 8956524610",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411045",
  },
  {
    name: "DREAMZ",
    phone: "8750047039",
    addressLine1: "A 55 KAKROLA",
    addressLine2: "DELHI",
    city: "Delhi",
    state: "Delhi",
    pincode: "110049",
    companyName: "DREAMZ",
  },
  {
    name: "DREAMZ SERVICES",
    phone: "8750047039",
    addressLine1: "F 101 PLOT NO 4 DWARKA",
    addressLine2: "SEC 6",
    city: "Delhi",
    state: "Delhi",
    pincode: "110075",
    companyName: "DREAMZ SERVICES",
  },
];

async function seed() {
  await connectDB();
  logger.info(`${TAG} Connected to Postgres`);

  const owner = await db.query.users.findFirst({ where: eq(users.email, OWNER_EMAIL) });
  if (!owner) {
    throw new Error(`Owner user not found by email: ${OWNER_EMAIL}`);
  }
  logger.info(`${TAG} Owner resolved: ${OWNER_EMAIL} (${owner.id})`);

  let created = 0;
  let skipped = 0;

  for (const a of DTDC_ORIGINS) {
    const existing = await db
      .select({ id: pickupAddresses.id })
      .from(pickupAddresses)
      .where(
        and(
          eq(pickupAddresses.userId, owner.id),
          eq(pickupAddresses.pincode, a.pincode),
          eq(pickupAddresses.addressLine1, a.addressLine1),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      logger.info(`${TAG} SKIP "${a.name}" (${a.pincode}) — already exists`);
      skipped++;
      continue;
    }

    await db.insert(pickupAddresses).values({
      userId: owner.id,
      nickname: `${a.name} (DTDC)`,
      contactName: a.name,
      phone: a.phone,
      addressLine1: a.addressLine1,
      addressLine2: a.addressLine2 ?? null,
      city: a.city,
      state: a.state,
      country: "India",
      pincode: a.pincode,
      gstNumber: null,
      addressType: "Origin",
      isPrimary: false,
      isActive: true,
      updatedAt: new Date(),
    });

    logger.info(`${TAG} CREATED "${a.name} (DTDC)" — ${a.city} ${a.pincode}`);
    created++;
  }

  logger.info(`${TAG} Done — ${created} created, ${skipped} skipped`);
  await disconnectDB();
}

seed().catch((err) => {
  logger.error(`${TAG} Failed`, err);
  process.exit(1);
});
