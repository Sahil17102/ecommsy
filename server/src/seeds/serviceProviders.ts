import dotenv from "dotenv";
import { eq, ne } from "drizzle-orm";
import { connectDB, disconnectDB, db } from "../config/db.js";
import { serviceProviders } from "../db/schema.js";
import logger from "../config/logger.js";

dotenv.config();

const credentials = {
  b2c: {
    fields: [
      { key: "identifier", label: "Login Identifier", type: "text" as const, required: true },
      { key: "password", label: "Password", type: "password" as const, required: true },
      { key: "pickupAddressId", label: "Dreamz Pickup Address ID", type: "text" as const, required: false },
    ],
    description: "Dreamz Services API credentials. Auth uses POST /auth/login and the returned bearer token.",
    values: {
      identifier: process.env.DREAMZ_IDENTIFIER ?? process.env.DREAMZ_USER ?? "",
      password: process.env.DREAMZ_PASSWORD ?? process.env.DREAMZ_PASS ?? "",
      pickupAddressId: process.env.DREAMZ_PICKUP_ADDRESS_ID ?? "",
    },
  },
  b2b: {
    fields: [
      { key: "identifier", label: "Login Identifier", type: "text" as const, required: true },
      { key: "password", label: "Password", type: "password" as const, required: true },
    ],
    description: "Dreamz Services B2B credentials.",
    values: {},
    sameAsB2c: true,
  },
  _meta: {
    displayName: "Dreamz Services",
    description: "Dreamz Services shipping API aggregator.",
    logoUrl: "https://dreamzservices.in/favicon.png",
    status: "active",
  },
};

async function seed() {
  await connectDB();
  await db.delete(serviceProviders).where(ne(serviceProviders.slug, "dreamz"));

  const existing = await db.query.serviceProviders.findFirst({ where: eq(serviceProviders.slug, "dreamz") });
  if (existing) {
    await db.update(serviceProviders).set({
      name: "Dreamz Services",
      baseUrl: "https://dreamzservices.in/api",
      logoUrl: "https://dreamzservices.in/favicon.png",
      credentials,
      isActive: true,
      updatedAt: new Date(),
    }).where(eq(serviceProviders.id, existing.id));
  } else {
    await db.insert(serviceProviders).values({
      slug: "dreamz",
      name: "Dreamz Services",
      baseUrl: "https://dreamzservices.in/api",
      logoUrl: "https://dreamzservices.in/favicon.png",
      credentials,
      isActive: true,
    });
  }

  logger.info("Dreamz Services is the only seeded service provider");
  await disconnectDB();
}

seed().catch((err) => {
  logger.error("Dreamz provider seeding failed", err);
  process.exit(1);
});
