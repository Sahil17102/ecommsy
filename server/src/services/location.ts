import axios from "axios";
import { and, asc, count, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { locations } from "../db/schema.js";
import type { Pagination } from "../types/index.js";
import { externalUrls } from "../config/externalUrls.js";
import { AppError } from "../utils/AppError.js";

// Constants previously lived in models/Location.ts — inlined here.
export const VALID_TAGS = [
  "north",
  "south",
  "east",
  "west",
  "metro",
  "special_zone",
] as const;

export type LocationTag = (typeof VALID_TAGS)[number];

export class LocationError extends AppError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = "LocationError";
  }
}

type LocationRow = typeof locations.$inferSelect;
type LocationInsert = typeof locations.$inferInsert;

export interface LocationListItem {
  id: string;
  pincode: string;
  city: string;
  state: string;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toListItem(doc: LocationRow): LocationListItem {
  return {
    id: doc.id,
    pincode: doc.pincode,
    city: doc.city ?? "",
    state: doc.state ?? "",
    tags: doc.tags ?? [],
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface ListLocationsResult {
  locations: LocationListItem[];
  pagination: Pagination;
  stats: {
    total: number;
    active: number;
    inactive: number;
  };
}

export async function listLocations(opts?: {
  search?: string;
  state?: string;
  tag?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}): Promise<ListLocationsResult> {
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 50;
  const skip = (page - 1) * limit;

  const conditions = [] as Array<ReturnType<typeof eq>>;

  if (opts?.search) {
    const like = `%${opts.search}%`;
    const clause = or(
      ilike(locations.pincode, like),
      ilike(locations.city, like),
      ilike(locations.state, like),
    );
    if (clause) conditions.push(clause as unknown as ReturnType<typeof eq>);
  }

  if (opts?.state) {
    conditions.push(ilike(locations.state, opts.state));
  }

  if (opts?.tag) {
    // tags is a jsonb string[] — use ? operator
    conditions.push(sql`${locations.tags} ?? ${opts.tag}` as unknown as ReturnType<typeof eq>);
  }

  if (opts?.isActive !== undefined) {
    conditions.push(eq(locations.isActive, opts.isActive));
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [totalRow, docs, totalAllRow, activeRow, inactiveRow] = await Promise.all([
    db.select({ value: count() }).from(locations).where(whereClause).then((r) => r[0]?.value ?? 0),
    db
      .select()
      .from(locations)
      .where(whereClause)
      .orderBy(asc(locations.state), asc(locations.city), asc(locations.pincode))
      .offset(skip)
      .limit(limit),
    db.select({ value: count() }).from(locations).then((r) => r[0]?.value ?? 0),
    db.select({ value: count() }).from(locations).where(eq(locations.isActive, true)).then((r) => r[0]?.value ?? 0),
    db.select({ value: count() }).from(locations).where(eq(locations.isActive, false)).then((r) => r[0]?.value ?? 0),
  ]);

  const total = totalRow;

  return {
    locations: docs.map(toListItem),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    stats: {
      total: totalAllRow,
      active: activeRow,
      inactive: inactiveRow,
    },
  };
}

export async function createLocation(data: {
  pincode: string;
  city: string;
  state: string;
  tags?: LocationTag[];
  isActive?: boolean;
}): Promise<LocationRow> {
  try {
    const values: LocationInsert = {
      pincode: data.pincode,
      city: data.city,
      state: data.state,
      tags: (data.tags ?? []) as string[],
      isActive: data.isActive ?? true,
    };
    const [doc] = await db.insert(locations).values(values).returning();
    return doc;
  } catch (err: unknown) {
    // PG unique violation code is "23505"
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      throw new LocationError(409, "Pincode already exists");
    }
    throw err;
  }
}

export interface BulkCreateResult {
  inserted: number;
  duplicates: number;
}

export async function bulkCreateLocations(
  data: { pincode: string; city: string; state: string; tags?: string[] }[],
): Promise<BulkCreateResult> {
  if (data.length === 0) return { inserted: 0, duplicates: 0 };

  const values: LocationInsert[] = data.map((d) => ({
    pincode: d.pincode,
    city: d.city,
    state: d.state,
    tags: d.tags ?? [],
    isActive: true,
  }));

  const inserted = await db
    .insert(locations)
    .values(values)
    .onConflictDoNothing()
    .returning({ id: locations.id });

  return {
    inserted: inserted.length,
    duplicates: values.length - inserted.length,
  };
}

export async function deleteLocation(id: string): Promise<void> {
  const [doc] = await db.delete(locations).where(eq(locations.id, id)).returning({ id: locations.id });
  if (!doc) throw new LocationError(404, "Location not found");
}

export async function bulkDeleteLocations(
  ids: string[],
): Promise<{ deletedCount: number }> {
  if (ids.length === 0) return { deletedCount: 0 };
  const deleted = await db
    .delete(locations)
    .where(inArray(locations.id, ids))
    .returning({ id: locations.id });
  return { deletedCount: deleted.length };
}

export async function toggleLocation(id: string): Promise<LocationRow> {
  const existing = await db.query.locations.findFirst({ where: eq(locations.id, id) });
  if (!existing) throw new LocationError(404, "Location not found");

  const [updated] = await db
    .update(locations)
    .set({ isActive: !existing.isActive, updatedAt: new Date() })
    .where(eq(locations.id, id))
    .returning();
  return updated;
}

const PINCODE_API_BASE_URL = externalUrls.pincode.lookupApi;

export async function getDistinctStates() {
  const rows = await db
    .selectDistinct({ state: locations.state })
    .from(locations)
    .where(eq(locations.isActive, true));
  const states = rows.map((r) => r.state).filter((s): s is string => !!s);
  return states.sort();
}

export async function getCitiesByState(state: string) {
  const rows = await db
    .selectDistinct({ city: locations.city })
    .from(locations)
    .where(and(eq(locations.state, state), eq(locations.isActive, true)));
  const cities = rows.map((r) => r.city).filter((c): c is string => !!c);
  return cities.sort();
}

export async function lookupPincode(
  pincode: string,
): Promise<{ city: string; state: string }> {
  try {
    const { data } = await axios.get(
      `${PINCODE_API_BASE_URL}/pincode/${pincode}`,
    );

    if (!data?.[0]?.PostOffice?.length) {
      throw new LocationError(404, "Invalid pincode");
    }

    const info = data[0].PostOffice[0];
    return { city: info.District, state: info.State };
  } catch (err) {
    if (err instanceof LocationError) throw err;
    throw new LocationError(502, "Pincode lookup service unavailable");
  }
}
