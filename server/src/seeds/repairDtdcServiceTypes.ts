import dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { connectDB, disconnectDB, db } from "../config/db.js";
import { couriers } from "../db/schema.js";
import logger from "../config/logger.js";
import { DTDC_SERVICES, serviceTypeFromName } from "./dtdcRateCards.js";

dotenv.config();

const TAG = "[RepairDtdcServiceTypes]";
const DRY_RUN = process.env.DRY_RUN === "1";

/**
 * Repairs DTDC couriers whose metaData.serviceTypeId / rawResponse has drifted
 * away from what their NAME says (e.g. a "Ground Economy" courier whose metaData
 * was overwritten to "B2C PREMIUM"). The name is the stable identity; this
 * restores the canonical service catalog entry (TAT, serviceCode, flags) for
 * each courier while PRESERVING its existing serviceProviderId binding.
 *
 * Only touches metaData, only when it disagrees with the name — idempotent.
 * Run with DRY_RUN=1 to preview without writing.
 */
async function repair() {
  await connectDB();
  logger.info(`${TAG} Connected to Postgres${DRY_RUN ? " (DRY RUN — no writes)" : ""}`);

  const dtdc = await db.select().from(couriers).where(eq(couriers.serviceProvider, "dtdc"));
  logger.info(`${TAG} Inspecting ${dtdc.length} dtdc courier(s)`);

  let fixed = 0;
  let ok = 0;
  let skipped = 0;

  for (const courier of dtdc) {
    const serviceTypeId = serviceTypeFromName(courier.name);
    if (!serviceTypeId) {
      logger.warn(`${TAG} Skipping "${courier.name}" — can't resolve service from name`);
      skipped++;
      continue;
    }

    const canonical = DTDC_SERVICES.find((s) => s.serviceTypeId === serviceTypeId);
    if (!canonical) {
      skipped++;
      continue;
    }

    const meta = (courier.metaData ?? {}) as Record<string, unknown>;
    const current = meta.serviceTypeId;

    if (current === serviceTypeId) {
      ok++;
      continue;
    }

    // Preserve binding; restore the canonical service identity from the catalog.
    const newMeta = {
      serviceTypeId: canonical.serviceTypeId,
      serviceProviderId: meta.serviceProviderId,
      rawResponse: { ...canonical },
    };

    logger.info(
      `${TAG} ${DRY_RUN ? "WOULD FIX" : "FIX"} "${courier.name}": ` +
        `serviceTypeId "${String(current)}" → "${serviceTypeId}" ` +
        `(serviceCode ${("serviceCode" in canonical && canonical.serviceCode) || "—"}, TAT ${canonical.TAT})`,
    );

    if (!DRY_RUN) {
      await db.update(couriers).set({ metaData: newMeta }).where(eq(couriers.id, courier.id));
    }
    fixed++;
  }

  logger.info(
    `${TAG} Done — ${DRY_RUN ? "would fix" : "fixed"} ${fixed}, already-correct ${ok}, skipped ${skipped}`,
  );
  await disconnectDB();
}

repair().catch((err) => {
  logger.error(`${TAG} Repair failed`, err);
  process.exit(1);
});
