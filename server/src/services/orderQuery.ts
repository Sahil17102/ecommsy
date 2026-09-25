import type { Request } from "express";
import { and, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { orders } from "../db/schema.js";
import { parseQuery, QType, parseDateRange } from "../utils/parseQuery.js";

/**
 * The admin order-list filter set, in a plain serialisable shape.
 *
 * Kept as one type (and one where-clause builder) so the paginated list
 * endpoint and the background CSV export always select the *same* rows — an
 * export that silently disagrees with the table on screen is worse than no
 * export at all.
 */
export interface AdminOrderFilters {
  search?: string;
  status?: string;
  orderType?: string;
  paymentType?: string;
  serviceProvider?: string;
  /** couriers.id — the renamable courier, not the aggregator slug. */
  courierId?: string;
  userId?: string;
  /** ISO strings so the filter set survives a round-trip through JSONB. */
  startDate?: string;
  endDate?: string;
}

/** Read the filter set off a request (query string). */
export function parseAdminOrderFilters(req: Request): AdminOrderFilters {
  const { search, status, orderType, paymentType, serviceProvider, courierId, userId } = parseQuery(req, {
    search: QType.STRING,
    status: QType.STRING,
    orderType: QType.STRING,
    paymentType: QType.STRING,
    serviceProvider: QType.STRING,
    courierId: QType.STRING,
    userId: QType.STRING,
  });

  const { start, end } = parseDateRange(req);

  return {
    search,
    status,
    orderType,
    paymentType,
    serviceProvider,
    courierId,
    userId,
    startDate: start?.toISOString(),
    endDate: end?.toISOString(),
  };
}

/** Drop empty values so two equivalent filter sets compare equal. */
export function normalizeAdminOrderFilters(filters: AdminOrderFilters): AdminOrderFilters {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = String(value);
  }
  return out as AdminOrderFilters;
}

/**
 * Build the WHERE clause for an admin order query.
 *
 * `opts.extraSearch` lets a caller widen the free-text search with columns that
 * only matter on its screen (e.g. the NDR reason on the NDR table).
 */
export function buildAdminOrderWhere(
  filters: AdminOrderFilters,
  opts?: { extraSearch?: (pattern: string) => SQL[] },
): SQL | undefined {
  const conditions: SQL[] = [];

  if (filters.userId) conditions.push(eq(orders.userId, filters.userId));
  if (filters.status) conditions.push(eq(orders.status, filters.status));
  if (filters.orderType) conditions.push(eq(orders.orderType, filters.orderType.toLowerCase()));
  if (filters.paymentType) conditions.push(eq(orders.paymentMode, filters.paymentType));
  if (filters.serviceProvider) conditions.push(eq(orders.serviceProvider, filters.serviceProvider));
  if (filters.courierId) conditions.push(eq(orders.courierId, filters.courierId));

  const start = filters.startDate ? new Date(filters.startDate) : undefined;
  const end = filters.endDate ? new Date(filters.endDate) : undefined;
  if (start && !Number.isNaN(start.getTime())) conditions.push(gte(orders.createdAt, start));
  if (end && !Number.isNaN(end.getTime())) conditions.push(lte(orders.createdAt, end));

  if (filters.search) {
    const q = `%${filters.search}%`;
    const searchClause = or(
      ilike(orders.orderId, q),
      ilike(orders.awb, q),
      sql`(${orders.deliveryAddress}->>'contactName') ILIKE ${q}`,
      sql`(${orders.deliveryAddress}->>'city') ILIKE ${q}`,
      sql`(${orders.deliveryAddress}->>'email') ILIKE ${q}`,
      sql`(${orders.deliveryAddress}->>'phone') ILIKE ${q}`,
      ...(opts?.extraSearch?.(q) ?? []),
    );
    if (searchClause) conditions.push(searchClause);
  }

  return conditions.length ? and(...conditions) : undefined;
}

/** Human-readable one-liner for the export history panel. */
export function describeAdminOrderFilters(filters: AdminOrderFilters): string {
  const parts: string[] = [];
  if (filters.status) parts.push(`status: ${filters.status}`);
  if (filters.orderType) parts.push(`type: ${filters.orderType}`);
  if (filters.paymentType) parts.push(`payment: ${filters.paymentType}`);
  if (filters.search) parts.push(`search: "${filters.search}"`);
  if (filters.startDate || filters.endDate) {
    const fmt = (iso?: string) => (iso ? iso.slice(0, 10) : "…");
    parts.push(`${fmt(filters.startDate)} → ${fmt(filters.endDate)}`);
  }
  return parts.length ? parts.join(" · ") : "All orders";
}
