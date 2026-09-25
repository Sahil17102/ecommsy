import { and, asc, count, eq, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { couriers, serviceProviders } from "../db/schema.js";
import type { Pagination } from "../types/index.js";
import { brandFor } from "../config/courierBrands.js";
import { AppError } from "../utils/AppError.js";

export class CourierError extends AppError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = "CourierError";
  }
}

type CourierRow = typeof couriers.$inferSelect;

export interface CourierListItem {
  id: string;
  name: string;
  serviceProvider: string;
  serviceProviderDisplayName: string;
  courierType: "delivery";
  businessType: string[];
  isEnabled: boolean;
  logo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toListItem(doc: CourierRow): CourierListItem {
  const brand = brandFor(doc.serviceProvider);
  return {
    id: doc.id,
    name: doc.name,
    serviceProvider: doc.serviceProvider,
    serviceProviderDisplayName: brand.name,
    // courierType isn't a column on the new schema; default to "delivery".
    courierType: (doc.courierType as "delivery" | null) ?? "delivery",
    businessType: doc.businessType ?? [],
    isEnabled: doc.isEnabled,
    logo: doc.logo || brand.logoUrl || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface CourierStats {
  total: number;
  enabled: number;
  disabled: number;
  delivery: number;
}

export interface ListCouriersResult {
  couriers: CourierListItem[];
  pagination: Pagination;
  stats: CourierStats;
}

export async function listCouriers(opts?: {
  serviceProvider?: string;
  businessType?: string;
  isEnabled?: boolean;
  page?: number;
  limit?: number;
}): Promise<ListCouriersResult> {
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 50;
  const skip = (page - 1) * limit;

  const conditions = [] as ReturnType<typeof eq>[];
  if (opts?.serviceProvider) conditions.push(eq(couriers.serviceProvider, opts.serviceProvider));
  if (opts?.businessType) {
    // businessType is jsonb<string[]> — use `?` containment operator.
    conditions.push(sql`${couriers.businessType} ? ${opts.businessType}` as unknown as ReturnType<typeof eq>);
  }
  if (opts?.isEnabled !== undefined) conditions.push(eq(couriers.isEnabled, opts.isEnabled));

  const whereClause = conditions.length ? and(...conditions) : undefined;
  const enabledWhere = conditions.length
    ? and(...conditions, eq(couriers.isEnabled, true))
    : eq(couriers.isEnabled, true);

  const [totalRow, docs, enabledCountRow] = await Promise.all([
    db.select({ value: count() }).from(couriers).where(whereClause).then((r) => r[0]?.value ?? 0),
    db
      .select()
      .from(couriers)
      .where(whereClause)
      .orderBy(asc(couriers.serviceProvider), asc(couriers.name))
      .offset(skip)
      .limit(limit),
    db.select({ value: count() }).from(couriers).where(enabledWhere).then((r) => r[0]?.value ?? 0),
  ]);

  const total = totalRow;
  const enabledCount = enabledCountRow;

  return {
    couriers: docs.map((doc) => toListItem(doc)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    stats: {
      total,
      enabled: enabledCount,
      disabled: total - enabledCount,
      delivery: total,
    },
  };
}

export async function createCourier(data: {
  name: string;
  serviceProviderId?: string;
  serviceProvider?: string;
  businessType?: string[];
  isEnabled?: boolean;
  logo?: string | null;
}): Promise<CourierRow> {
  // Resolve the specific service-provider *account* this courier binds to.
  // Prefer the account id (slugs/names can be shared across multiple accounts,
  // e.g. two "delhivery" accounts). Fall back to slug for legacy callers,
  // but only when the slug maps to exactly one account.
  let sp;
  if (data.serviceProviderId) {
    sp = await db.query.serviceProviders.findFirst({
      where: eq(serviceProviders.id, data.serviceProviderId),
    });
    if (!sp) throw new CourierError(400, `Service provider account "${data.serviceProviderId}" does not exist`);
  } else if (data.serviceProvider) {
    const matches = await db.query.serviceProviders.findMany({
      where: eq(serviceProviders.slug, data.serviceProvider),
    });
    if (matches.length === 0) {
      throw new CourierError(400, `Service provider "${data.serviceProvider}" does not exist`);
    }
    if (matches.length > 1) {
      throw new CourierError(
        400,
        `Multiple accounts exist for "${data.serviceProvider}" — send serviceProviderId to pick one`,
      );
    }
    sp = matches[0];
  } else {
    throw new CourierError(400, "serviceProviderId is required");
  }

  if (!sp.isActive) {
    throw new CourierError(400, `Service provider account "${sp.name}" is inactive`);
  }

  const [doc] = await db
    .insert(couriers)
    .values({
      name: data.name,
      // Store the slug for grouping/branding, and bind the account via metaData.
      serviceProvider: sp.slug,
      courierType: "delivery",
      businessType: data.businessType ?? ["b2c"],
      isEnabled: data.isEnabled ?? true,
      logo: data.logo ?? null,
      metaData: { serviceProviderId: sp.id },
    })
    .returning();

  return doc;
}

export async function deleteCourier(id: string): Promise<void> {
  const [doc] = await db.delete(couriers).where(eq(couriers.id, id)).returning();
  if (!doc) throw new CourierError(404, "Courier not found");
}

export async function toggleCourier(id: string): Promise<CourierRow> {
  const doc = await db.query.couriers.findFirst({ where: eq(couriers.id, id) });
  if (!doc) throw new CourierError(404, "Courier not found");

  const [updated] = await db
    .update(couriers)
    .set({ isEnabled: !doc.isEnabled, updatedAt: new Date() })
    .where(eq(couriers.id, id))
    .returning();
  return updated;
}

/**
 * Rename a courier (the seller-facing display name). Only the `name` is
 * editable here — the service-provider binding is immutable post-creation.
 */
export async function updateCourier(id: string, data: { name?: string }): Promise<CourierRow> {
  const doc = await db.query.couriers.findFirst({ where: eq(couriers.id, id) });
  if (!doc) throw new CourierError(404, "Courier not found");

  const name = data.name?.trim();
  if (!name) throw new CourierError(400, "Courier name cannot be empty");

  const [updated] = await db
    .update(couriers)
    .set({ name, updatedAt: new Date() })
    .where(eq(couriers.id, id))
    .returning();
  return updated;
}
