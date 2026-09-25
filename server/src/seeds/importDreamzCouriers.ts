import dotenv from "dotenv";
import { eq, inArray } from "drizzle-orm";
import { axios } from "../services/providers/BaseProvider.js";
import { connectDB, disconnectDB, db } from "../config/db.js";
import { couriers, serviceProviders } from "../db/schema.js";
import { externalUrls } from "../config/externalUrls.js";
import logger from "../config/logger.js";

dotenv.config();

type DreamzCourier = {
  id: string;
  name: string;
  serviceProvider?: string;
  courierType?: string;
  businessType?: string[];
  logo?: string | null;
};

export async function importDreamzCouriers(opts: { connect?: boolean } = {}) {
  if (opts.connect !== false) await connectDB();

  const identifier = process.env.DREAMZ_IDENTIFIER ?? process.env.DREAMZ_USER;
  const password = process.env.DREAMZ_PASSWORD ?? process.env.DREAMZ_PASS;
  if (!identifier || !password) throw new Error("DREAMZ_IDENTIFIER and DREAMZ_PASSWORD are required");

  const account = await db.query.serviceProviders.findFirst({ where: eq(serviceProviders.slug, "dreamz") });
  if (!account) throw new Error("Seed Dreamz service provider before importing couriers");

  const login = await axios.post(externalUrls.dreamz.login, { identifier, password }, {
    headers: { "Content-Type": "application/json" },
  });
  const token = login.data?.accessToken;
  if (!token) throw new Error("Dreamz login did not return accessToken");

  const { data } = await axios.get(externalUrls.dreamz.couriers, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const remoteCouriers = (Array.isArray(data?.couriers) ? data.couriers : []) as DreamzCourier[];
  const validIds = new Set(remoteCouriers.map((c) => c.id));

  const existing = await db.select().from(couriers);
  const remove = existing.filter((c) => {
    const meta = (c.metaData ?? {}) as Record<string, unknown>;
    return c.serviceProvider !== "dreamz" || !validIds.has(String(meta.dreamzCourierId ?? ""));
  });
  if (remove.length) await db.delete(couriers).where(inArray(couriers.id, remove.map((c) => c.id)));

  for (const c of remoteCouriers) {
    const existingRow = await db.query.couriers.findFirst({ where: eq(couriers.name, c.name) });
    const values = {
      name: c.name,
      serviceProvider: "dreamz",
      courierType: c.courierType ?? "delivery",
      businessType: (c.businessType?.length ? c.businessType : ["b2c"]).map((v) => v.toLowerCase()),
      isEnabled: true,
      logo: c.logo ?? null,
      metaData: {
        serviceProviderId: account.id,
        dreamzCourierId: c.id,
        dreamzServiceProvider: c.serviceProvider ?? null,
      },
      updatedAt: new Date(),
    };
    if (existingRow) {
      await db.update(couriers).set(values).where(eq(couriers.id, existingRow.id));
    } else {
      await db.insert(couriers).values(values);
    }
  }

  logger.info(`Imported ${remoteCouriers.length} Dreamz courier(s)`);
  if (opts.connect !== false) await disconnectDB();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  importDreamzCouriers().catch((err) => {
    logger.error("Dreamz courier import failed", err);
    process.exit(1);
  });
}
