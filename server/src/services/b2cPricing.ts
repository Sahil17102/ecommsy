import { and, count, desc, eq, inArray, gte, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { b2cPricing, b2cZones, couriers } from "../db/schema.js";
import type { Pagination } from "../types/index.js";
import { AppError } from "../utils/AppError.js";

export class B2cPricingError extends AppError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = "B2cPricingError";
  }
}

type B2cPricingRow = typeof b2cPricing.$inferSelect;
type CourierRow = typeof couriers.$inferSelect;
type B2cZoneRow = typeof b2cZones.$inferSelect;

/**
 * Shape returned to consumers — mirrors the legacy populated Mongoose document:
 *   - `courier` is replaced with `{ id, name, serviceProvider }`
 *   - each `zoneRates[].zone` is replaced with `{ id, name, code }`
 *
 * We emit both `id` and `_id`: the admin UI (and the b2c-zones endpoint) key on
 * `id`, while `_id` is kept for any legacy Mongo-style consumer.
 */
type PopulatedZoneRate = {
  zone: { id: string; _id: string; name: string; code: string } | string;
  slabRates: Array<{ forward: number; rto: number; codCharges: number; codPercent: number }>;
};

export type PopulatedB2cPricing = Omit<B2cPricingRow, "zoneRates" | "courierId"> & {
  _id: string;
  courier: { id: string; _id: string; name: string; serviceProvider: string } | null;
  zoneRates: PopulatedZoneRate[];
};

export interface ListPricingResult {
  pricing: PopulatedB2cPricing[];
  pagination: Pagination;
}

export interface WeightSlabInput {
  minWeight: number;
  maxWeight: number | null;
}

export interface ZoneRateInput {
  zone: string;
  slabRates: {
    forward: number;
    rto: number;
    codCharges: number;
    codPercent: number;
  }[];
}

/** Look up all referenced b2c zones for `populate` emulation. */
async function resolveZoneLookup(rows: B2cPricingRow[]): Promise<Map<string, B2cZoneRow>> {
  const ids = new Set<string>();
  for (const row of rows) {
    for (const zr of row.zoneRates ?? []) {
      if (typeof zr?.zone === "string" && zr.zone) ids.add(zr.zone);
    }
  }
  if (ids.size === 0) return new Map();
  const zones = await db.select().from(b2cZones).where(inArray(b2cZones.id, Array.from(ids)));
  return new Map(zones.map((z) => [z.id, z]));
}

function shape(
  row: B2cPricingRow,
  courier: CourierRow | undefined,
  zoneLookup: Map<string, B2cZoneRow>,
): PopulatedB2cPricing {
  const zoneRates = (row.zoneRates ?? []).map((zr) => {
    const z = typeof zr.zone === "string" ? zoneLookup.get(zr.zone) : undefined;
    return {
      zone: z ? { id: z.id, _id: z.id, name: z.name, code: z.code } : zr.zone,
      slabRates: zr.slabRates ?? [],
    };
  });

  const { courierId: _courierId, zoneRates: _zoneRates, ...rest } = row;
  void _courierId;
  void _zoneRates;

  return {
    ...rest,
    _id: row.id,
    courier: courier
      ? { id: courier.id, _id: courier.id, name: courier.name, serviceProvider: courier.serviceProvider }
      : null,
    zoneRates,
  };
}

export async function listPricing(opts?: {
  page?: number;
  limit?: number;
  plan?: string;
  courier?: string;
  serviceProvider?: string;
  mode?: string;
  minWeight?: number;
}): Promise<ListPricingResult> {
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 50;
  const skip = (page - 1) * limit;

  const conditions = [] as Array<ReturnType<typeof eq>>;
  if (opts?.plan) conditions.push(eq(b2cPricing.plan, opts.plan));
  if (opts?.mode) conditions.push(eq(b2cPricing.mode, opts.mode));
  if (opts?.minWeight !== undefined) {
    conditions.push(
      gte(
        sql<number>`((${b2cPricing.weightSlabs} -> 0) ->> 'minWeight')::numeric`,
        opts.minWeight,
      ) as unknown as ReturnType<typeof eq>,
    );
  }

  if (opts?.courier) {
    conditions.push(eq(b2cPricing.courierId, opts.courier));
  } else if (opts?.serviceProvider) {
    const courierRows = await db
      .select({ id: couriers.id })
      .from(couriers)
      .where(eq(couriers.serviceProvider, opts.serviceProvider));
    const courierIds = courierRows.map((c) => c.id);
    if (courierIds.length === 0) {
      return {
        pricing: [],
        pagination: { page, limit, total: 0, totalPages: 1 },
      };
    }
    conditions.push(inArray(b2cPricing.courierId, courierIds));
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [totalRow, docs] = await Promise.all([
    db.select({ value: count() }).from(b2cPricing).where(whereClause),
    db
      .select()
      .from(b2cPricing)
      .where(whereClause)
      .orderBy(desc(b2cPricing.updatedAt))
      .offset(skip)
      .limit(limit),
  ]);

  const total = totalRow[0]?.value ?? 0;

  // Resolve courier + zone references in batch.
  const courierIds = Array.from(new Set(docs.map((d) => d.courierId)));
  const courierRows = courierIds.length
    ? await db.select().from(couriers).where(inArray(couriers.id, courierIds))
    : [];
  const courierMap = new Map(courierRows.map((c) => [c.id, c]));
  const zoneLookup = await resolveZoneLookup(docs);

  return {
    pricing: docs.map((d) => shape(d, courierMap.get(d.courierId), zoneLookup)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getPricingByCourier(
  courierId: string,
  plan?: string,
): Promise<PopulatedB2cPricing | PopulatedB2cPricing[] | null> {
  if (plan) {
    const doc = await db.query.b2cPricing.findFirst({
      where: and(eq(b2cPricing.courierId, courierId), eq(b2cPricing.plan, plan)),
    });
    if (!doc) return null;
    const [courier] = await db.select().from(couriers).where(eq(couriers.id, doc.courierId));
    const zoneLookup = await resolveZoneLookup([doc]);
    return shape(doc, courier, zoneLookup);
  }

  const docs = await db.select().from(b2cPricing).where(eq(b2cPricing.courierId, courierId));
  if (docs.length === 0) return [];
  const [courier] = await db.select().from(couriers).where(eq(couriers.id, courierId));
  const zoneLookup = await resolveZoneLookup(docs);
  return docs.map((d) => shape(d, courier, zoneLookup));
}

export async function upsertPricing(data: {
  courierId: string;
  plan: string;
  mode: "air" | "surface";
  otherCharges: number;
  weightSlabs: WeightSlabInput[];
  zoneRates: ZoneRateInput[];
}): Promise<PopulatedB2cPricing> {
  validateZoneSlabAlignment(data.weightSlabs.length, data.zoneRates);

  const now = new Date();
  const values = {
    courierId: data.courierId,
    plan: data.plan,
    mode: data.mode,
    otherCharges: String(data.otherCharges),
    weightSlabs: data.weightSlabs,
    zoneRates: data.zoneRates,
    updatedAt: now,
  } satisfies typeof b2cPricing.$inferInsert;

  const [doc] = await db
    .insert(b2cPricing)
    .values(values)
    .onConflictDoUpdate({
      target: [b2cPricing.courierId, b2cPricing.plan],
      set: {
        mode: values.mode,
        otherCharges: values.otherCharges,
        weightSlabs: values.weightSlabs,
        zoneRates: values.zoneRates,
        updatedAt: now,
      },
    })
    .returning();

  const [courier] = await db.select().from(couriers).where(eq(couriers.id, doc.courierId));
  const zoneLookup = await resolveZoneLookup([doc]);
  return shape(doc, courier, zoneLookup);
}

export async function batchUpsertPricing(data: {
  courierId: string;
  mode: "air" | "surface";
  otherCharges: number;
  weightSlabs: WeightSlabInput[];
  planRates: Record<string, ZoneRateInput[]>;
}): Promise<{ saved: number }> {
  const planSlugs = Object.keys(data.planRates);
  let saved = 0;

  for (const plan of planSlugs) {
    await upsertPricing({
      courierId: data.courierId,
      plan,
      mode: data.mode,
      otherCharges: data.otherCharges,
      weightSlabs: data.weightSlabs,
      zoneRates: data.planRates[plan],
    });
    saved++;
  }

  return { saved };
}

export async function deletePricing(id: string): Promise<void> {
  const [doc] = await db.delete(b2cPricing).where(eq(b2cPricing.id, id)).returning();
  if (!doc) throw new B2cPricingError(404, "Pricing entry not found");
}

function validateZoneSlabAlignment(
  slabCount: number,
  zoneRates: ZoneRateInput[],
): void {
  for (const zr of zoneRates) {
    if (zr.slabRates.length !== slabCount) {
      throw new B2cPricingError(
        400,
        `Zone rate must have ${slabCount} slab rate(s) — got ${zr.slabRates.length}`,
      );
    }
  }
}
