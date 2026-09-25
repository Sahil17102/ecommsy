import { and, asc, count, eq, or, ilike, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { b2cZones } from "../db/schema.js";
import type { Pagination } from "../types/index.js";
import { AppError } from "../utils/AppError.js";

export class B2cZoneError extends AppError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = "B2cZoneError";
  }
}

type B2cZoneRow = typeof b2cZones.$inferSelect;

export interface ZoneListItem {
  id: string;
  name: string;
  description: string;
  code: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toListItem(doc: B2cZoneRow): ZoneListItem {
  return {
    id: doc.id,
    name: doc.name,
    description: doc.description ?? "",
    code: doc.code,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface ListZonesResult {
  zones: ZoneListItem[];
  pagination: Pagination;
  stats: {
    total: number;
    active: number;
    inactive: number;
  };
}

export async function listZones(opts?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<ListZonesResult> {
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 50;
  const skip = (page - 1) * limit;

  const conditions = [] as Array<ReturnType<typeof eq>>;
  if (opts?.search) {
    const like = `%${opts.search}%`;
    const searchClause = or(
      ilike(b2cZones.name, like),
      ilike(b2cZones.code, like),
      ilike(b2cZones.description, like),
    );
    if (searchClause) conditions.push(searchClause as unknown as ReturnType<typeof eq>);
  }
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [totalRow, docs, totalAllRow, activeRow, inactiveRow] = await Promise.all([
    db.select({ value: count() }).from(b2cZones).where(whereClause),
    db
      .select()
      .from(b2cZones)
      .where(whereClause)
      .orderBy(asc(b2cZones.code))
      .offset(skip)
      .limit(limit),
    db.select({ value: count() }).from(b2cZones),
    db.select({ value: count() }).from(b2cZones).where(eq(b2cZones.isActive, true)),
    db.select({ value: count() }).from(b2cZones).where(eq(b2cZones.isActive, false)),
  ]);

  const total = totalRow[0]?.value ?? 0;
  const totalAll = totalAllRow[0]?.value ?? 0;
  const activeCount = activeRow[0]?.value ?? 0;
  const inactiveCount = inactiveRow[0]?.value ?? 0;

  return {
    zones: docs.map(toListItem),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    stats: {
      total: totalAll,
      active: activeCount,
      inactive: inactiveCount,
    },
  };
}

function isUniqueViolation(err: unknown): boolean {
  return !!(
    err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code: string | number }).code === "23505"
  );
}

export async function createZone(data: {
  name: string;
  description?: string;
  code: string;
}): Promise<B2cZoneRow> {
  try {
    const [doc] = await db
      .insert(b2cZones)
      .values({
        name: data.name,
        description: data.description ?? "",
        code: data.code.toUpperCase(),
      })
      .returning();
    return doc;
  } catch (err: unknown) {
    if (isUniqueViolation(err)) {
      throw new B2cZoneError(409, "Zone code already exists");
    }
    throw err;
  }
}

export async function updateZone(
  id: string,
  data: { name?: string; description?: string; code?: string },
): Promise<B2cZoneRow> {
  const existing = await db.query.b2cZones.findFirst({ where: eq(b2cZones.id, id) });
  if (!existing) throw new B2cZoneError(404, "Zone not found");

  const patch: Partial<typeof b2cZones.$inferInsert> = { updatedAt: new Date() };
  if (data.name !== undefined) patch.name = data.name;
  if (data.description !== undefined) patch.description = data.description;
  if (data.code !== undefined) patch.code = data.code.toUpperCase();

  try {
    const [doc] = await db.update(b2cZones).set(patch).where(eq(b2cZones.id, id)).returning();
    return doc;
  } catch (err: unknown) {
    if (isUniqueViolation(err)) {
      throw new B2cZoneError(409, "Zone code already exists");
    }
    throw err;
  }
}

export async function deleteZone(id: string): Promise<void> {
  const [doc] = await db.delete(b2cZones).where(eq(b2cZones.id, id)).returning();
  if (!doc) throw new B2cZoneError(404, "Zone not found");
}

export async function toggleZone(id: string): Promise<B2cZoneRow> {
  const [doc] = await db
    .update(b2cZones)
    .set({ isActive: sql`NOT ${b2cZones.isActive}`, updatedAt: new Date() })
    .where(eq(b2cZones.id, id))
    .returning();
  if (!doc) throw new B2cZoneError(404, "Zone not found");
  return doc;
}
