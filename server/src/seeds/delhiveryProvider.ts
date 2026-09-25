import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { serviceProviders } from "../db/schema.js";
import logger from "../config/logger.js";

const DELHIVERY_B2C_FIELDS = [
  {
    key: "accessToken",
    label: "Delhivery API Token",
    type: "password" as const,
    required: true,
  },
];

/** Ensure Admin → Service Providers always exposes Delhivery's B2C token field. */
export async function seedDelhiveryProvider(): Promise<void> {
  const existing = await db.query.serviceProviders.findFirst({
    where: eq(serviceProviders.slug, "delhivery"),
  });

  if (!existing) {
    await db.insert(serviceProviders).values({
      slug: "delhivery",
      name: "Delhivery",
      baseUrl: process.env.DELHIVERY_BASE_URL || "https://track.delhivery.com",
      credentials: {
        b2c: {
          fields: DELHIVERY_B2C_FIELDS,
          description: "Enter the Delhivery B2C API token from Delhivery One. Orders, serviceability, tracking, labels and pickups use this token.",
          values: process.env.DELHIVERY_TOKEN
            ? { accessToken: process.env.DELHIVERY_TOKEN }
            : {},
        },
      },
      isActive: true,
    });
    logger.info("[Seed] Delhivery B2C service provider created");
    return;
  }

  const credentials = (existing.credentials ?? {}) as {
    b2c?: {
      fields?: Array<{ key: string; label: string; type: "text" | "password"; required: boolean }>;
      description?: string;
      values?: Record<string, string>;
    };
    b2b?: unknown;
  };
  const values = { ...(credentials.b2c?.values ?? {}) };
  if (!values.accessToken && process.env.DELHIVERY_TOKEN) {
    values.accessToken = process.env.DELHIVERY_TOKEN;
  }

  await db.update(serviceProviders).set({
    name: existing.name || "Delhivery",
    baseUrl: existing.baseUrl || process.env.DELHIVERY_BASE_URL || "https://track.delhivery.com",
    credentials: {
      ...credentials,
      b2c: {
        ...credentials.b2c,
        fields: DELHIVERY_B2C_FIELDS,
        description: "Enter the Delhivery B2C API token from Delhivery One. Orders, serviceability, tracking, labels and pickups use this token.",
        values,
      },
    },
    updatedAt: new Date(),
  }).where(eq(serviceProviders.id, existing.id));
  logger.info("[Seed] Delhivery B2C credential form ready");
}
