import type { Request, Response } from "express";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import {
  b2bAdditionalCharges,
  b2bPincodes,
  b2bZoneRates,
  b2bZones,
} from "../db/schema.js";
import { fetchB2bAvailableCouriers } from "../services/b2bRateCalculation.js";
import { AppError } from "../utils/AppError.js";

// ── ZONES ──

export async function handleListB2bZones(_req: Request, res: Response) {
  const zones = await db.select().from(b2bZones).orderBy(asc(b2bZones.code));
  res.json({ success: true, data: zones });
}

export async function handleCreateB2bZone(req: Request, res: Response) {
  const { code, name, description } = req.body as { code: string; name: string; description?: string };
  const codeUpper = String(code).toUpperCase();

  const existing = await db.query.b2bZones.findFirst({ where: eq(b2bZones.code, codeUpper) });
  if (existing) throw new AppError(400, `Zone with code "${code}" already exists`);

  const [zone] = await db
    .insert(b2bZones)
    .values({ code: codeUpper, name, description: description ?? "" })
    .returning();
  res.status(201).json({ success: true, data: zone });
}

export async function handleUpdateB2bZone(req: Request, res: Response) {
  const patch = { ...req.body, updatedAt: new Date() } as Partial<typeof b2bZones.$inferInsert>;
  if (typeof patch.code === "string") patch.code = patch.code.toUpperCase();

  const [zone] = await db.update(b2bZones).set(patch).where(eq(b2bZones.id, req.params.id)).returning();
  if (!zone) throw new AppError(404, "Zone not found");
  res.json({ success: true, data: zone });
}

export async function handleDeleteB2bZone(req: Request, res: Response) {
  const [zone] = await db.delete(b2bZones).where(eq(b2bZones.id, req.params.id)).returning();
  if (!zone) throw new AppError(404, "Zone not found");
  res.json({ success: true, message: "Zone deleted" });
}

export async function handleToggleB2bZone(req: Request, res: Response) {
  const [zone] = await db
    .update(b2bZones)
    .set({ isActive: sql`NOT ${b2bZones.isActive}`, updatedAt: new Date() })
    .where(eq(b2bZones.id, req.params.id))
    .returning();
  if (!zone) throw new AppError(404, "Zone not found");
  res.json({ success: true, data: zone });
}

// ── PINCODES ──

export async function handleListB2bPincodes(req: Request, res: Response) {
  const {
    pincode,
    zone,
    courier,
    serviceProvider,
    isOda,
    isRemote,
    isCsd,
    isMall,
    isSez,
    isAirport,
    isHighSecurity,
  } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 50));

  const conditions = [] as Array<ReturnType<typeof eq>>;
  if (pincode) conditions.push(eq(b2bPincodes.pincode, String(pincode)));
  if (zone) conditions.push(eq(b2bPincodes.zoneId, String(zone)));
  if (courier) conditions.push(eq(b2bPincodes.courierId, String(courier)));
  if (serviceProvider) conditions.push(eq(b2bPincodes.serviceProvider, String(serviceProvider)));

  // Flag filters target keys inside the jsonb `flags` column.
  const flagCond = (key: string) =>
    sql`${b2bPincodes.flags} ->> ${key} = 'true'` as unknown as ReturnType<typeof eq>;
  if (isOda === "true") conditions.push(flagCond("isOda"));
  if (isRemote === "true") conditions.push(flagCond("isRemote"));
  if (isCsd === "true") conditions.push(flagCond("isCsd"));
  if (isMall === "true") conditions.push(flagCond("isMall"));
  if (isSez === "true") conditions.push(flagCond("isSez"));
  if (isAirport === "true") conditions.push(flagCond("isAirport"));
  if (isHighSecurity === "true") conditions.push(flagCond("isHighSecurity"));

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [rows, totalRow] = await Promise.all([
    db.query.b2bPincodes.findMany({
      where: whereClause,
      with: {
        zone: { columns: { code: true, name: true } },
        courier: { columns: { name: true, serviceProvider: true } },
      },
      orderBy: [asc(b2bPincodes.pincode)],
      offset: (page - 1) * limit,
      limit,
    }),
    db.select({ value: count() }).from(b2bPincodes).where(whereClause),
  ]);

  const total = totalRow[0]?.value ?? 0;

  res.json({
    success: true,
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function handleCreateB2bPincode(req: Request, res: Response) {
  // Frontend sends `zone` and `courier` (Mongoose-style ref ids). Map to FK columns.
  const body = req.body as Record<string, unknown>;
  const values = {
    ...body,
    zoneId: body.zoneId ?? body.zone,
    courierId: body.courierId ?? body.courier,
  } as typeof b2bPincodes.$inferInsert;
  delete (values as Record<string, unknown>).zone;
  delete (values as Record<string, unknown>).courier;

  const [pincode] = await db.insert(b2bPincodes).values(values).returning();
  res.status(201).json({ success: true, data: pincode });
}

export async function handleUpdateB2bPincode(req: Request, res: Response) {
  const body = req.body as Record<string, unknown>;
  const patch: Record<string, unknown> = { ...body, updatedAt: new Date() };
  if (patch.zone !== undefined) {
    patch.zoneId = patch.zone;
    delete patch.zone;
  }
  if (patch.courier !== undefined) {
    patch.courierId = patch.courier;
    delete patch.courier;
  }

  const [pincode] = await db
    .update(b2bPincodes)
    .set(patch as Partial<typeof b2bPincodes.$inferInsert>)
    .where(eq(b2bPincodes.id, req.params.id))
    .returning();
  if (!pincode) throw new AppError(404, "Pincode not found");
  res.json({ success: true, data: pincode });
}

export async function handleDeleteB2bPincode(req: Request, res: Response) {
  const [pincode] = await db.delete(b2bPincodes).where(eq(b2bPincodes.id, req.params.id)).returning();
  if (!pincode) throw new AppError(404, "Pincode not found");
  res.json({ success: true, message: "Pincode deleted" });
}

export async function handleBulkImportB2bPincodes(req: Request, res: Response) {
  const { pincodes } = req.body as { pincodes?: Array<Record<string, unknown>> };
  if (!Array.isArray(pincodes) || pincodes.length === 0) {
    throw new AppError(400, "pincodes array is required");
  }

  // Normalize legacy `zone`/`courier` keys into FK columns.
  const values = pincodes.map((p) => {
    const out = { ...p } as Record<string, unknown>;
    out.zoneId = out.zoneId ?? out.zone;
    out.courierId = out.courierId ?? out.courier;
    delete out.zone;
    delete out.courier;
    return out as typeof b2bPincodes.$inferInsert;
  });

  // Postgres has no insertMany "ordered:false ignore-dups" exactly — use
  // onConflictDoNothing on the (pincode, courier) unique index.
  const inserted = await db
    .insert(b2bPincodes)
    .values(values)
    .onConflictDoNothing()
    .returning({ id: b2bPincodes.id });

  res.json({ success: true, inserted: inserted.length, total: pincodes.length });
}

// ── ZONE RATES ──

export async function handleListB2bZoneRates(req: Request, res: Response) {
  const { courier, plan, originZone, destinationZone } = req.query;
  const conditions = [] as Array<ReturnType<typeof eq>>;
  if (courier) conditions.push(eq(b2bZoneRates.courierId, String(courier)));
  if (plan) conditions.push(eq(b2bZoneRates.plan, String(plan)));
  if (originZone) conditions.push(eq(b2bZoneRates.originZoneId, String(originZone)));
  if (destinationZone) conditions.push(eq(b2bZoneRates.destinationZoneId, String(destinationZone)));

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const rates = await db.query.b2bZoneRates.findMany({
    where: whereClause,
    with: {
      originZone: { columns: { code: true, name: true } },
      destinationZone: { columns: { code: true, name: true } },
      courier: { columns: { name: true, serviceProvider: true } },
    },
    // Mongoose used "originZone.code"/"destinationZone.code" — emulating that
    // ordering would need a join + ORDER BY; plan-only is a close-enough proxy.
    orderBy: [asc(b2bZoneRates.plan)],
  });

  res.json({ success: true, data: rates });
}

export async function handleUpsertB2bZoneRate(req: Request, res: Response) {
  const {
    plan,
    courier,
    courierId,
    originZone,
    originZoneId,
    destinationZone,
    destinationZoneId,
    ...rest
  } = req.body as Record<string, unknown>;

  const resolvedCourierId = (courierId ?? courier) as string;
  const resolvedOriginId = (originZoneId ?? originZone) as string;
  const resolvedDestId = (destinationZoneId ?? destinationZone) as string;

  const now = new Date();
  const values = {
    plan: plan as string,
    courierId: resolvedCourierId,
    originZoneId: resolvedOriginId,
    destinationZoneId: resolvedDestId,
    ...rest,
    updatedAt: now,
  } as typeof b2bZoneRates.$inferInsert;

  const [rate] = await db
    .insert(b2bZoneRates)
    .values(values)
    .onConflictDoUpdate({
      target: [
        b2bZoneRates.plan,
        b2bZoneRates.courierId,
        b2bZoneRates.originZoneId,
        b2bZoneRates.destinationZoneId,
      ],
      set: { ...rest, updatedAt: now } as Partial<typeof b2bZoneRates.$inferInsert>,
    })
    .returning();

  res.json({ success: true, data: rate });
}

export async function handleBatchUpsertB2bZoneRates(req: Request, res: Response) {
  const { rates } = req.body as { rates?: Array<Record<string, unknown>> };
  if (!Array.isArray(rates) || rates.length === 0) {
    throw new AppError(400, "rates array is required");
  }

  let upserted = 0;
  let modified = 0;

  for (const r of rates) {
    const courierId = (r.courierId ?? r.courier) as string;
    const originZoneId = (r.originZoneId ?? r.originZone) as string;
    const destinationZoneId = (r.destinationZoneId ?? r.destinationZone) as string;
    const plan = r.plan as string;

    const existing = await db.query.b2bZoneRates.findFirst({
      where: and(
        eq(b2bZoneRates.plan, plan),
        eq(b2bZoneRates.courierId, courierId),
        eq(b2bZoneRates.originZoneId, originZoneId),
        eq(b2bZoneRates.destinationZoneId, destinationZoneId),
      ),
    });

    const now = new Date();
    const values = {
      ...r,
      plan,
      courierId,
      originZoneId,
      destinationZoneId,
      updatedAt: now,
    } as typeof b2bZoneRates.$inferInsert;
    delete (values as Record<string, unknown>).courier;
    delete (values as Record<string, unknown>).originZone;
    delete (values as Record<string, unknown>).destinationZone;

    if (existing) {
      await db.update(b2bZoneRates).set(values).where(eq(b2bZoneRates.id, existing.id));
      modified++;
    } else {
      await db.insert(b2bZoneRates).values(values);
      upserted++;
    }
  }

  res.json({ success: true, upserted, modified });
}

export async function handleDeleteB2bZoneRate(req: Request, res: Response) {
  const [rate] = await db.delete(b2bZoneRates).where(eq(b2bZoneRates.id, req.params.id)).returning();
  if (!rate) throw new AppError(404, "Zone rate not found");
  res.json({ success: true, message: "Zone rate deleted" });
}

// ── ADDITIONAL CHARGES ──

export async function handleListB2bAdditionalCharges(req: Request, res: Response) {
  const { courier, plan } = req.query;
  const conditions = [] as Array<ReturnType<typeof eq>>;
  if (courier) conditions.push(eq(b2bAdditionalCharges.courierId, String(courier)));
  if (plan) conditions.push(eq(b2bAdditionalCharges.plan, String(plan)));

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const charges = await db.query.b2bAdditionalCharges.findMany({
    where: whereClause,
    with: {
      courier: { columns: { name: true, serviceProvider: true } },
    },
  });

  res.json({ success: true, data: charges });
}

export async function handleUpsertB2bAdditionalCharges(req: Request, res: Response) {
  const { plan, courier, courierId, ...rest } = req.body as Record<string, unknown>;
  const resolvedCourierId = (courierId ?? courier) as string;

  const now = new Date();
  const values = {
    plan: plan as string,
    courierId: resolvedCourierId,
    ...rest,
    updatedAt: now,
  } as typeof b2bAdditionalCharges.$inferInsert;

  const [charge] = await db
    .insert(b2bAdditionalCharges)
    .values(values)
    .onConflictDoUpdate({
      target: [b2bAdditionalCharges.plan, b2bAdditionalCharges.courierId],
      set: { ...rest, updatedAt: now } as Partial<typeof b2bAdditionalCharges.$inferInsert>,
    })
    .returning();

  res.json({ success: true, data: charge });
}

export async function handleDeleteB2bAdditionalCharge(req: Request, res: Response) {
  const [charge] = await db
    .delete(b2bAdditionalCharges)
    .where(eq(b2bAdditionalCharges.id, req.params.id))
    .returning();
  if (!charge) throw new AppError(404, "Additional charge not found");
  res.json({ success: true, message: "Additional charge deleted" });
}

// ── RATE CALCULATOR ──

export async function handleCalculateB2bRate(req: Request, res: Response) {
  const couriers = await fetchB2bAvailableCouriers({
    origin: req.body.origin,
    destination: req.body.destination,
    packages: req.body.packages,
    paymentType: req.body.paymentType,
    orderAmount: Number(req.body.orderAmount),
    plan: req.body.plan,
    declaredValue: req.body.declaredValue ? Number(req.body.declaredValue) : undefined,
    isInsurance: req.body.isInsurance ?? false,
    isTimeSpecificDelivery: req.body.isTimeSpecificDelivery ?? false,
    isHolidayPickup: req.body.isHolidayPickup ?? false,
  });

  res.json({ success: true, data: couriers });
}
