import dotenv from "dotenv";
import axios from "axios";
import { and, eq, inArray } from "drizzle-orm";
import { connectDB, disconnectDB, db } from "../config/db.js";
import { b2cPricing, couriers, serviceProviders } from "../db/schema.js";
import { externalUrls } from "../config/externalUrls.js";
import logger from "../config/logger.js";

dotenv.config();

const TAG = "[SeedXpressbeesCouriers]";

interface XpressbeesCourier {
  id: string;
  name: string;
}

async function getToken(email: string, password: string): Promise<string> {
  const { data } = await axios.post(externalUrls.xpressbees.franchiseLogin, {
    email,
    password,
  });

  if (!data.status || !data.data) {
    throw new Error(`Login failed: ${data.message || "Unknown error"}`);
  }

  return data.data;
}

async function fetchCouriers(token: string): Promise<XpressbeesCourier[]> {
  const { data } = await axios.get(externalUrls.xpressbees.couriers, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!data.status || !Array.isArray(data.data)) {
    throw new Error(`Failed to fetch couriers: ${data.message || "Unknown error"}`);
  }

  return data.data;
}

type CredentialBlock = { values?: Record<string, string> };
type SpCredentials = { b2c?: CredentialBlock; b2b?: CredentialBlock } | null;

async function seed() {
  await connectDB();
  logger.info(`${TAG} Connected to Postgres`);

  // 1. Get Xpressbees credentials from service_providers table. Schema only
  // has `isActive` (no `status`), so we filter on isActive=true.
  const sp = await db.query.serviceProviders.findFirst({
    where: and(
      eq(serviceProviders.slug, "xpressbees"),
      eq(serviceProviders.isActive, true),
    ),
  });

  if (!sp) throw new Error("Xpressbees service provider not found or disabled");

  const creds = (sp.credentials ?? {}) as SpCredentials;
  const email = creds?.b2c?.values?.email;
  const password = creds?.b2c?.values?.password;
  if (!email || !password) throw new Error("Xpressbees B2C email/password not configured");

  // 2. Login and fetch couriers from Xpressbees API
  logger.info(`${TAG} Logging in as ${email}...`);
  const token = await getToken(email, password);
  logger.info(`${TAG} Login successful, fetching couriers...`);

  const apiCouriers = await fetchCouriers(token);
  logger.info(`${TAG} Fetched ${apiCouriers.length} courier(s) from Xpressbees API`);

  // 3. Delete existing Xpressbees couriers and their pricing
  const oldCouriers = await db.select().from(couriers).where(eq(couriers.serviceProvider, "xpressbees"));
  if (oldCouriers.length > 0) {
    const oldIds = oldCouriers.map((c) => c.id);
    const pricingDeleted = await db
      .delete(b2cPricing)
      .where(inArray(b2cPricing.courierId, oldIds))
      .returning({ id: b2cPricing.id });
    const courierDeleted = await db
      .delete(couriers)
      .where(eq(couriers.serviceProvider, "xpressbees"))
      .returning({ id: couriers.id });
    logger.info(
      `${TAG} Deleted ${courierDeleted.length} old courier(s) and ${pricingDeleted.length} pricing doc(s)`,
    );
  }

  // 4. Seed fetched couriers
  for (const apiCourier of apiCouriers) {
    const businessType = apiCourier.name.toLowerCase().includes("b2b") ? ["b2b"] : ["b2c"];

    await db.insert(couriers).values({
      name: apiCourier.name,
      serviceProvider: "xpressbees",
      courierType: "delivery",
      businessType,
      isEnabled: true,
      logo: null,
      metaData: {
        xpressbeesId: apiCourier.id,
      },
    });

    logger.info(`${TAG} Seeded: ${apiCourier.name} (id: ${apiCourier.id}, ${businessType.join(",")})`);
  }

  logger.info(`${TAG} Done — ${apiCouriers.length} Xpressbees courier(s) seeded`);
  await disconnectDB();
}

seed().catch((err) => {
  logger.error(`${TAG} Seed failed`, err);
  process.exit(1);
});
