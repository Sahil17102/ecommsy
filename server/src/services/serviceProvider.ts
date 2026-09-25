import { asc, count, eq, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { couriers, serviceProviders } from "../db/schema.js";
import type { Pagination } from "../types/index.js";
import { AppError } from "../utils/AppError.js";

// ── Custom Error ──

export class ServiceProviderError extends AppError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = "ServiceProviderError";
  }
}

// ── Types ──

interface CredentialStatus {
  configured: boolean;
  sameAsB2c?: boolean;
}

export interface ProviderListItem {
  id: string;
  serviceProvider: string;
  serviceProviderDisplayName: string;
  displayName: string;
  logoUrl: string;
  totalCouriers: number;
  enabledCouriers: number;
  isEnabled: boolean;
  b2c: CredentialStatus;
  b2b: CredentialStatus;
  status: "active" | "inactive";
  updatedAt: Date;
}

// ── Schema-derived shapes ──

type ServiceProviderRow = typeof serviceProviders.$inferSelect;

/**
 * The new `service_providers` schema stores credentials in a single jsonb blob.
 * We assume the shape:
 *   {
 *     b2c: { fields: [...], description: "", values: {...} },
 *     b2b: { fields: [...], description: "", values: {...}, sameAsB2c: bool }
 *   }
 * Anything that drifts from that shape is treated as missing/empty.
 */
interface CredentialBlock {
  fields?: Array<{ key: string; label: string; type: "text" | "password"; required: boolean }>;
  description?: string;
  values?: Record<string, string>;
}
interface B2bCredentialBlock extends CredentialBlock {
  sameAsB2c?: boolean;
}
interface CredentialsShape {
  b2c?: CredentialBlock;
  b2b?: B2bCredentialBlock;
}

// ── Helpers ──

interface CourierCounts {
  total: number;
  enabled: number;
}

async function getCourierCountsMap(): Promise<Record<string, CourierCounts>> {
  const rows = await db
    .select({
      serviceProvider: couriers.serviceProvider,
      total: count(),
      enabled: sql<number>`sum(case when ${couriers.isEnabled} then 1 else 0 end)::int`,
    })
    .from(couriers)
    .groupBy(couriers.serviceProvider);

  const map: Record<string, CourierCounts> = {};
  for (const row of rows) {
    map[row.serviceProvider] = { total: row.total, enabled: Number(row.enabled) };
  }
  return map;
}

function hasValues(values: Record<string, string> | undefined): boolean {
  if (!values) return false;
  return Object.keys(values).length > 0 && Object.values(values).some((v) => v !== "");
}

function extractCredentials(doc: ServiceProviderRow): CredentialsShape {
  return (doc.credentials as CredentialsShape | null) ?? {};
}

interface ProviderDocWithConfigured {
  id: string;
  serviceProvider: string;
  displayName: string;
  logoUrl: string;
  isEnabled: boolean;
  status: "active" | "inactive";
  b2cConfigured: boolean;
  b2bConfigured: boolean;
  sameAsB2c: boolean;
  updatedAt: Date;
}

function projectProvider(doc: ServiceProviderRow): ProviderDocWithConfigured {
  const creds = extractCredentials(doc);
  return {
    id: doc.id,
    serviceProvider: doc.slug,
    displayName: doc.name,
    logoUrl: doc.logoUrl ?? "",
    isEnabled: doc.isActive,
    // status isn't a column either — derived from isActive.
    status: doc.isActive ? "active" : "inactive",
    b2cConfigured: hasValues(creds.b2c?.values),
    b2bConfigured: hasValues(creds.b2b?.values),
    sameAsB2c: creds.b2b?.sameAsB2c ?? false,
    updatedAt: doc.updatedAt,
  };
}

function toListItem(
  doc: ProviderDocWithConfigured,
  counts: CourierCounts,
): ProviderListItem {
  const b2bConfigured = doc.sameAsB2c ? doc.b2cConfigured : doc.b2bConfigured;

  return {
    id: doc.id,
    serviceProvider: doc.serviceProvider,
    serviceProviderDisplayName: doc.displayName,
    displayName: doc.displayName,
    logoUrl: doc.logoUrl,
    totalCouriers: counts.total,
    enabledCouriers: counts.enabled,
    isEnabled: doc.isEnabled,
    b2c: { configured: doc.b2cConfigured },
    b2b: { configured: b2bConfigured, sameAsB2c: doc.sameAsB2c },
    status: doc.status,
    updatedAt: doc.updatedAt,
  };
}

// ── Result Types ──

export interface ListProvidersResult {
  providers: ProviderListItem[];
  stats: {
    total: number;
    active: number;
    b2cConfigured: number;
  };
  pagination: Pagination;
}

// ── Public API ──

export async function listProviders(opts?: {
  page?: number;
  limit?: number;
  configured?: boolean;
}): Promise<ListProvidersResult> {
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 50;
  const skip = (page - 1) * limit;

  const [rawDocs, countsMap] = await Promise.all([
    db.select().from(serviceProviders).orderBy(asc(serviceProviders.slug)),
    getCourierCountsMap(),
  ]);

  const allDocs = rawDocs.map(projectProvider);

  // Apply configured filter if provided
  const filteredDocs = opts?.configured !== undefined
    ? allDocs.filter((doc) => (opts.configured ? doc.b2cConfigured : !doc.b2cConfigured))
    : allDocs;

  // Stats computed from full dataset
  const stats = {
    total: allDocs.length,
    active: allDocs.filter((d) => d.status === "active").length,
    b2cConfigured: allDocs.filter((d) => d.b2cConfigured).length,
  };

  // Paginate
  const paginatedDocs = filteredDocs.slice(skip, skip + limit);
  const providers = paginatedDocs.map((doc) => {
    const counts = countsMap[doc.serviceProvider] ?? { total: 0, enabled: 0 };
    return toListItem(doc, counts);
  });

  return {
    providers,
    stats,
    pagination: {
      page,
      limit,
      total: filteredDocs.length,
      totalPages: Math.ceil(filteredDocs.length / limit),
    },
  };
}

export async function createProvider(data: {
  slug: string;
  name: string;
  baseUrl?: string;
  logoUrl?: string;
  credentials?: CredentialsShape;
  isActive?: boolean;
}): Promise<ProviderListItem> {

  const [inserted] = await db
    .insert(serviceProviders)
    .values({
      slug: data.slug,
      name: data.name,
      baseUrl: data.baseUrl ?? null,
      logoUrl: data.logoUrl ?? null,
      credentials: data.credentials ?? {},
      isActive: data.isActive ?? true,
    })
    .returning();

  return toListItem(projectProvider(inserted), { total: 0, enabled: 0 });
}

export async function updateProviderLogo(id: string, logoUrl: string): Promise<void> {
  const doc = await db.query.serviceProviders.findFirst({ where: eq(serviceProviders.id, id) });
  if (!doc) throw new ServiceProviderError(404, "Service provider not found");

  await db
    .update(serviceProviders)
    .set({ logoUrl, updatedAt: new Date() })
    .where(eq(serviceProviders.id, id));
}

export async function getProviderById(id: string): Promise<ProviderListItem> {
  const doc = await db.query.serviceProviders.findFirst({ where: eq(serviceProviders.id, id) });
  if (!doc) throw new ServiceProviderError(404, "Service provider not found");

  const [countsRow] = await db
    .select({
      total: count(),
      enabled: sql<number>`sum(case when ${couriers.isEnabled} then 1 else 0 end)::int`,
    })
    .from(couriers)
    .where(eq(couriers.serviceProvider, doc.slug));

  const counts: CourierCounts = countsRow
    ? { total: countsRow.total, enabled: Number(countsRow.enabled ?? 0) }
    : { total: 0, enabled: 0 };

  return toListItem(projectProvider(doc), counts);
}

export async function updateProvider(
  id: string,
  data: {
    status?: "active" | "inactive";
    isEnabled?: boolean;
    b2bSameAsB2c?: boolean;
  },
): Promise<ServiceProviderRow> {
  const doc = await db.query.serviceProviders.findFirst({ where: eq(serviceProviders.id, id) });
  if (!doc) throw new ServiceProviderError(404, "Service provider not found");

  const creds = extractCredentials(doc);
  const patch: Partial<typeof serviceProviders.$inferInsert> = { updatedAt: new Date() };

  // status / isEnabled both collapse to the schema's single `isActive` column.
  if (data.status !== undefined) patch.isActive = data.status === "active";
  if (data.isEnabled !== undefined) patch.isActive = data.isEnabled;

  if (data.b2bSameAsB2c !== undefined) {
    const nextB2b: B2bCredentialBlock = {
      ...(creds.b2b ?? {}),
      sameAsB2c: data.b2bSameAsB2c,
    };
    if (data.b2bSameAsB2c) nextB2b.values = {};
    patch.credentials = { ...creds, b2b: nextB2b };
  }

  const [updated] = await db
    .update(serviceProviders)
    .set(patch)
    .where(eq(serviceProviders.id, id))
    .returning();

  return updated;
}

export async function updateCredentials(
  id: string,
  type: "b2c" | "b2b",
  credentials: Record<string, string>,
): Promise<void> {
  const doc = await db.query.serviceProviders.findFirst({ where: eq(serviceProviders.id, id) });
  if (!doc) throw new ServiceProviderError(404, "Service provider not found");

  const creds = extractCredentials(doc);

  if (type === "b2b" && creds.b2b?.sameAsB2c) {
    throw new ServiceProviderError(400, "B2B is set to use B2C credentials. Unlink first.");
  }

  const block: CredentialBlock = type === "b2c" ? (creds.b2c ?? {}) : (creds.b2b ?? {});
  block.values = credentials;

  // Ensure every saved key has a matching field definition so the UI can render it
  const fields = block.fields ?? [];
  const existingKeys = new Set(fields.map((f) => f.key));
  for (const key of Object.keys(credentials)) {
    if (!existingKeys.has(key)) {
      const isSecret = /password|secret|token|key/i.test(key);
      const label = key
        .replace(/([A-Z])/g, " $1")
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
      fields.push({ key, label, type: isSecret ? "password" : "text", required: false });
    }
  }
  block.fields = fields;

  const nextCreds: CredentialsShape =
    type === "b2c"
      ? { ...creds, b2c: block }
      : { ...creds, b2b: { ...(creds.b2b ?? {}), ...block } };

  await db
    .update(serviceProviders)
    .set({ credentials: nextCreds, updatedAt: new Date() })
    .where(eq(serviceProviders.id, id));
}

export async function getCredentials(id: string) {
  const doc = await db.query.serviceProviders.findFirst({ where: eq(serviceProviders.id, id) });
  if (!doc) throw new ServiceProviderError(404, "Service provider not found");

  const creds = (doc.credentials as CredentialsShape | null) ?? {};

  const b2cValues = creds.b2c?.values ?? {};
  const sameAsB2c = creds.b2b?.sameAsB2c ?? false;
  const b2bValues = sameAsB2c ? b2cValues : (creds.b2b?.values ?? {});

  return {
    b2c: {
      fields: creds.b2c?.fields ?? [],
      description: creds.b2c?.description ?? "",
      values: b2cValues,
    },
    b2b: {
      fields: creds.b2b?.fields ?? [],
      description: creds.b2b?.description ?? "",
      values: b2bValues,
      sameAsB2c,
    },
  };
}

export async function getProviderCredentials(
  slug: string,
  type: "b2c" | "b2b",
): Promise<Record<string, string>> {
  const doc = await db.query.serviceProviders.findFirst({ where: eq(serviceProviders.slug, slug) });
  if (!doc) throw new ServiceProviderError(404, `Provider "${slug}" not configured`);
  if (!doc.isActive) throw new ServiceProviderError(400, `Provider "${slug}" is inactive`);

  const creds = (doc.credentials as CredentialsShape | null) ?? {};
  const resolvedType = type === "b2b" && creds.b2b?.sameAsB2c ? "b2c" : type;
  const values = resolvedType === "b2c" ? creds.b2c?.values : creds.b2b?.values;

  if (!values || !hasValues(values)) {
    throw new ServiceProviderError(400, `No ${type.toUpperCase()} credentials configured for "${slug}"`);
  }

  return values;
}
