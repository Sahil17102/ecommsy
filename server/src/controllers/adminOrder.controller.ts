import type { Request, Response } from "express";
import { asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { couriers, orders, pickupAddresses, users } from "../db/schema.js";
import { parseQuery, QType, parseSortParams } from "../utils/parseQuery.js";
import { serializeOrder } from "../utils/orderSerializer.js";
import { buildAdminOrderWhere, parseAdminOrderFilters } from "../services/orderQuery.js";

const ORDER_SORT_FIELDS = ["createdAt", "orderAmount", "rate.totalCharge", "status"];

export async function handleAdminListOrders(req: Request, res: Response) {
  const { page, limit } = parseQuery(req, {
    page: QType.NUMBER,
    limit: QType.NUMBER,
  });

  const currentPage = page ?? 1;
  const perPage = limit ?? 20;

  // Shared with the background CSV export so the file and the table can never
  // disagree about which orders match. Courier = the named, renamable courier
  // (e.g. "DTDC Priority (SL2850)"); `serviceProvider` stays supported for the
  // coarser aggregator-level filter.
  const whereClause = buildAdminOrderWhere(parseAdminOrderFilters(req));

  // Sort resolution
  const sort = parseSortParams(req, ORDER_SORT_FIELDS);
  const [sortField, sortDir] = Object.entries(sort)[0] ?? ["createdAt", -1];
  const sortCol =
    sortField === "status"
      ? orders.status
      : sortField === "orderAmount"
        ? orders.declaredValue
        : sortField === "rate.totalCharge"
          ? sql`(${orders.rateSnapshot}->>'totalCharge')::numeric`
          : orders.createdAt;
  const sortFn = sortDir === 1 ? asc : desc;

  // Group-by status counts + total revenue
  const [rows, totalRow, statusRows, revenueRow] = await Promise.all([
    db
      .select({
        order: orders,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          businessName: users.businessName,
        },
      })
      .from(orders)
      .leftJoin(users, eq(users.id, orders.userId))
      .where(whereClause)
      .orderBy(sortFn(sortCol))
      .offset((currentPage - 1) * perPage)
      .limit(perPage),
    db.select({ value: count() }).from(orders).where(whereClause),
    db
      .select({ status: orders.status, count: count() })
      .from(orders)
      .where(whereClause)
      .groupBy(orders.status),
    db
      .select({
        totalRevenue: sql<number>`coalesce(sum((${orders.rateSnapshot}->>'totalCharge')::numeric), 0)`,
      })
      .from(orders)
      .where(whereClause),
  ]);

  // Resolve the renamable courier names for this page so the table and the CSV
  // export can show "DTDC Priority (SL2850)" rather than the provider slug.
  const pageCourierIds = [
    ...new Set(rows.map((r) => r.order.courierId).filter((id): id is string => !!id)),
  ];
  const courierRows = pageCourierIds.length
    ? await db
        .select({ id: couriers.id, name: couriers.name })
        .from(couriers)
        .where(inArray(couriers.id, pageCourierIds))
    : [];
  const courierNameById = new Map(courierRows.map((c) => [c.id, c.name]));

  // Reshape rows so the user is nested on the order (mirror old populate behaviour).
  const shapedOrders = rows.map((r) => ({
    ...serializeOrder(r.order),
    user: r.user,
    courierName: r.order.courierId ? courierNameById.get(r.order.courierId) ?? null : null,
  }));

  const statsByStatus: Record<string, number> = {};
  let totalCount = 0;
  for (const r of statusRows) {
    statsByStatus[r.status] = Number(r.count);
    totalCount += Number(r.count);
  }

  res.json({
    orders: shapedOrders,
    pagination: {
      page: currentPage,
      limit: perPage,
      total: totalRow[0]?.value ?? 0,
      totalPages: Math.ceil((totalRow[0]?.value ?? 0) / perPage),
    },
    stats: {
      total: totalCount,
      created: statsByStatus["created"] ?? 0,
      processing: statsByStatus["processing"] ?? 0,
      shipped: statsByStatus["shipped"] ?? 0,
      in_transit: statsByStatus["in_transit"] ?? 0,
      out_for_delivery: statsByStatus["out_for_delivery"] ?? 0,
      delivered: statsByStatus["delivered"] ?? 0,
      rto_initiated: statsByStatus["rto_initiated"] ?? 0,
      rto_delivered: statsByStatus["rto_delivered"] ?? 0,
      cancelled: statsByStatus["cancelled"] ?? 0,
      totalRevenue: Number(revenueRow[0]?.totalRevenue ?? 0),
    },
  });
}

export async function handleAdminGetOrderById(req: Request, res: Response) {
  const rows = await db
    .select({
      order: orders,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        businessName: users.businessName,
      },
    })
    .from(orders)
    .leftJoin(users, eq(users.id, orders.userId))
    .where(eq(orders.id, req.params.id))
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const order = { ...serializeOrder(rows[0].order), user: rows[0].user };

  // Fetch pickup address
  const pickupAddress = order.pickupAddressId
    ? await db
        .select({
          id: pickupAddresses.id,
          nickname: pickupAddresses.nickname,
          contactName: pickupAddresses.contactName,
          phone: pickupAddresses.phone,
          addressLine1: pickupAddresses.addressLine1,
          addressLine2: pickupAddresses.addressLine2,
          city: pickupAddresses.city,
          state: pickupAddresses.state,
          pincode: pickupAddresses.pincode,
        })
        .from(pickupAddresses)
        .where(eq(pickupAddresses.id, order.pickupAddressId))
        .limit(1)
        .then((r) => r[0] ?? null)
    : null;

  res.json({ order, pickupAddress });
}
