import { asc, eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { b2cPricing, b2cZones, couriers, serviceProviders } from "../db/schema.js";
import logger from "../config/logger.js";
import { seedB2cZones } from "./b2cZones.js";
import { seedB2bPricing } from "./b2bZonesAndPincodes.js";

const PLANS = [
  { slug: "basic", factor: 1 },
  { slug: "gold", factor: 0.94 },
  { slug: "platinum", factor: 0.88 },
  { slug: "diamond", factor: 0.82 },
];

const ZONE_BASE: Record<string, number> = {
  WITHIN_CITY: 42,
  WITHIN_STATE: 48,
  WITHIN_REGION: 54,
  METRO_TO_METRO: 58,
  ROI: 65,
  SPECIAL_ZONE: 82,
};

/** Populate a safe, clearly-labelled demo courier and complete pricing screens. */
export async function seedDemoPricing(): Promise<void> {
  await seedB2cZones({ connect: false, disconnect: false });

  const provider = await db.query.serviceProviders.findFirst({
    where: eq(serviceProviders.slug, "delhivery"),
  });
  if (!provider) throw new Error("Delhivery provider must be seeded before demo pricing");

  let courier = await db.query.couriers.findFirst({
    where: eq(couriers.name, "Delhivery Demo Surface"),
  });
  if (!courier) {
    [courier] = await db.insert(couriers).values({
      name: "Delhivery Demo Surface",
      serviceProvider: "delhivery",
      courierType: "surface",
      businessType: ["b2c", "b2b"],
      isEnabled: true,
      metaData: { serviceProviderId: provider.id, demo: true },
    }).returning();
  }

  const zones = await db.select().from(b2cZones).orderBy(asc(b2cZones.code));
  const weightSlabs = [
    { minWeight: 0, maxWeight: 0.5 },
    { minWeight: 0.5, maxWeight: 1 },
    { minWeight: 1, maxWeight: 2 },
    { minWeight: 2, maxWeight: null },
  ];

  for (const plan of PLANS) {
    const zoneRates = zones.map((zone) => {
      const base = ZONE_BASE[zone.code] ?? 65;
      return {
        zone: zone.id,
        slabRates: weightSlabs.map((_slab, index) => ({
          forward: Math.round(base * plan.factor * (1 + index * 0.72)),
          rto: Math.round(base * plan.factor * (0.7 + index * 0.5)),
          codCharges: 35 + index * 5,
          codPercent: 1.5,
        })),
      };
    });
    await db.insert(b2cPricing).values({
      courierId: courier.id,
      plan: plan.slug,
      mode: "surface",
      otherCharges: "25",
      weightSlabs,
      zoneRates,
    }).onConflictDoNothing({ target: [b2cPricing.courierId, b2cPricing.plan] });
  }

  await seedB2bPricing({ connect: false, disconnect: false });
  logger.info("[Seed] Demo B2C/B2B zones, pincodes, rates and charges ready");
}
