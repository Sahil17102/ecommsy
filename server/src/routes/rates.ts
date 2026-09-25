import { Router, type Request, type Response } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../config/db.js";
import { users, couriers, b2cPricing, b2cZones } from "../db/schema.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { delhiveryRateValidation } from "../validators/rates.validator.js";
import { handleGetDelhiveryRate } from "../controllers/rates.controller.js";
import { availableCouriersValidation } from "../validators/courierAvailability.validator.js";
import { handleFetchAvailableCouriers } from "../controllers/courierAvailability.controller.js";
import { b2bAvailableCouriersValidation } from "../validators/b2bRateAvailability.validator.js";
import { handleFetchB2bAvailableCouriers } from "../controllers/b2bRateAvailability.controller.js";
import { requireAuth, requireAnyAuth } from "../middleware/auth.js";

const router = Router();

router.get("/delhivery", delhiveryRateValidation, validate, asyncHandler(handleGetDelhiveryRate));
router.post("/available", requireAnyAuth, availableCouriersValidation, validate, asyncHandler(handleFetchAvailableCouriers));
router.post("/b2b/available", requireAnyAuth, b2bAvailableCouriersValidation, validate, asyncHandler(handleFetchB2bAvailableCouriers));

/** GET /rates/rate-card — Return B2C pricing for the logged-in user's plan (enabled couriers only) */
router.get(
  "/rate-card",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.userId!),
      columns: { plan: true },
    });
    const plan = user?.plan ?? "basic";

    // Only include enabled couriers
    const enabledCouriers = await db
      .select({ id: couriers.id, name: couriers.name, serviceProvider: couriers.serviceProvider, logo: couriers.logo })
      .from(couriers)
      .where(eq(couriers.isEnabled, true));
    const idList = enabledCouriers.map((c) => c.id);
    const courierById = new Map(enabledCouriers.map((c) => [c.id, c]));

    if (idList.length === 0) {
      res.json({ plan, pricing: [] });
      return;
    }

    const rawPricing = await db
      .select()
      .from(b2cPricing)
      .where(and(eq(b2cPricing.plan, plan), inArray(b2cPricing.courierId, idList)))
      .orderBy(desc(b2cPricing.updatedAt));

    // Build zone-code → zone-doc map for the codes referenced in any pricing row.
    const codes = new Set<string>();
    for (const p of rawPricing) {
      for (const zr of p.zoneRates ?? []) {
        if (zr?.zone) codes.add(zr.zone);
      }
    }
    const zoneRows = codes.size
      ? await db.select().from(b2cZones).where(inArray(b2cZones.code, Array.from(codes)))
      : [];
    const zoneByCode = new Map(zoneRows.map((z) => [z.code, { name: z.name, code: z.code }]));

    // Filter out entries where every zone's slab rates are all zero (unconfigured pricing).
    // Also drops rows whose courier is missing, and zone-rates with missing slabRates / zone.
    const pricing = rawPricing
      .map((p) => {
        const courier = courierById.get(p.courierId);
        if (!courier) return null;
        const zoneRates = (p.zoneRates ?? [])
          .filter((zr) => zr?.zone && Array.isArray(zr.slabRates))
          .map((zr) => ({ ...zr, zone: zoneByCode.get(zr.zone) ?? { code: zr.zone, name: zr.zone } }));
        return { ...p, courier, zoneRates };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .filter((p) =>
        p.zoneRates.some((zr) =>
          (zr.slabRates as Array<{ forward?: number; rto?: number }>).some(
            (sr) => (sr?.forward ?? 0) > 0 || (sr?.rto ?? 0) > 0,
          ),
        ),
      );

    res.json({ plan, pricing });
  }),
);

export default router;
