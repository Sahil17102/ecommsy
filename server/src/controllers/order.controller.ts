import type { Request, Response } from "express";
import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { orders, couriers } from "../db/schema.js";
import { createOrder, type CreateOrderInput } from "../services/orderCreation.js";
import { bulkCreateB2COrders, bulkCreateB2BOrders } from "../services/bulkOrderCreation.js";
import { bulkManifestB2COrders } from "../services/bulkManifest.js";
import { parseSortParams, parseDateRange } from "../utils/parseQuery.js";
import { serializeOrder } from "../utils/orderSerializer.js";
import logger from "../config/logger.js";

const TAG = "[OrderController]";
const ORDER_SORT_FIELDS = ["createdAt", "orderAmount", "rate.totalCharge", "status"];

export async function handleCreateOrder(req: Request, res: Response) {
  const order = await createOrder({
    userId: req.userId!,
    orderId: req.body.orderId,
    orderDate: req.body.orderDate,
    orderType: req.body.orderType,
    paymentType: req.body.paymentType,
    buyerName: req.body.buyerName,
    buyerPhone: req.body.buyerPhone,
    buyerEmail: req.body.buyerEmail,
    address: req.body.address,
    address2: req.body.address2,
    city: req.body.city,
    state: req.body.state,
    pincode: req.body.pincode,
    weight: Number(req.body.weight),
    length: Number(req.body.length),
    breadth: Number(req.body.breadth),
    height: Number(req.body.height),
    chargeableWeight: Number(req.body.chargeableWeight),
    products: req.body.products,
    orderAmount: Number(req.body.orderAmount),
    codAmount: Number(req.body.codAmount),
    courierId: req.body.courierId,
    pickupAddressId: req.body.pickupAddressId,
    preferredPickupDate: req.body.preferredPickupDate,
    preferredPickupTime: req.body.preferredPickupTime,
    rate: req.body.rate,

    // B2B-specific fields
    ...(req.body.orderType === "B2B" && {
      companyName: req.body.companyName,
      companyGst: req.body.companyGst,
      packages: req.body.packages,
      invoices: req.body.invoices,
      chargesBreakdown: req.body.chargesBreakdown,
    }),
  });

  logger.info(`${TAG} Order created — ${order.id} (AWB: ${order.awb})`);
  res.status(201).json({ success: true, order: serializeOrder(order) });
}

// Normalise a raw request-body row into CreateOrderInput (numbers coerced).
function toCreateOrderInput(row: Record<string, unknown>): Omit<CreateOrderInput, "userId"> {
  return {
    orderId: row.orderId as string,
    orderDate: row.orderDate as string,
    orderType: row.orderType as "B2B" | "B2C",
    paymentType: row.paymentType as "prepaid" | "cod",
    buyerName: row.buyerName as string,
    buyerPhone: row.buyerPhone as string,
    buyerEmail: row.buyerEmail as string | undefined,
    address: row.address as string,
    address2: row.address2 as string | undefined,
    city: row.city as string,
    state: row.state as string,
    pincode: row.pincode as string,
    weight: Number(row.weight),
    length: Number(row.length),
    breadth: Number(row.breadth),
    height: Number(row.height),
    chargeableWeight: Number(row.chargeableWeight),
    products: row.products as CreateOrderInput["products"],
    orderAmount: Number(row.orderAmount),
    codAmount: Number(row.codAmount),
    courierId: row.courierId as string,
    pickupAddressId: row.pickupAddressId as string,
    preferredPickupDate: row.preferredPickupDate as string,
    preferredPickupTime: row.preferredPickupTime as string,
    rate: row.rate as CreateOrderInput["rate"],
  };
}

export async function handleBulkCreateB2COrders(req: Request, res: Response) {
  const userId = req.userId!;
  const rows = (req.body.orders as Array<Record<string, unknown>>).map(toCreateOrderInput);
  logger.info(`${TAG} Bulk B2C create — userId=${userId}, rows=${rows.length}`);
  const result = await bulkCreateB2COrders(rows, userId);
  res.status(200).json({
    success: result.failedCount === 0,
    ...result,
    results: result.results.map((r) => (r.order ? { ...r, order: serializeOrder(r.order) } : r)),
  });
}

export async function handleBulkCreateB2BOrders(req: Request, res: Response) {
  const userId = req.userId!;
  const rows = (req.body.orders as Array<Record<string, unknown>>).map((row) => {
    const base = toCreateOrderInput(row);
    // Pull B2B-only fields that toCreateOrderInput doesn't carry.
    return {
      ...base,
      companyName: row.companyName as string | undefined,
      companyGst: row.companyGst as string | undefined,
      packages: row.packages as CreateOrderInput["packages"],
      invoices: row.invoices as CreateOrderInput["invoices"],
      chargesBreakdown: row.chargesBreakdown as CreateOrderInput["chargesBreakdown"],
    };
  });
  logger.info(`${TAG} Bulk B2B create — userId=${userId}, rows=${rows.length}`);
  const result = await bulkCreateB2BOrders(rows, userId);
  res.status(200).json({
    success: result.failedCount === 0,
    ...result,
    results: result.results.map((r) => (r.order ? { ...r, order: serializeOrder(r.order) } : r)),
  });
}

export async function handleBulkManifest(req: Request, res: Response) {
  const userId = req.userId!;
  const orderIds = req.body.orderIds as string[];
  const result = await bulkManifestB2COrders(orderIds, userId);
  res.json(result);
}

const BULK_TEMPLATE_HEADERS = [
  "orderId",
  "orderDate",
  "paymentType",
  "buyerName",
  "buyerPhone",
  "buyerEmail",
  "address",
  "address2",
  "city",
  "state",
  "pincode",
  "weight_grams",
  "length_cm",
  "breadth_cm",
  "height_cm",
  "productName",
  "productUnitPrice",
  "productQuantity",
  "productHsn",
  "productTaxRate",
  "orderAmount",
  "codAmount",
  "pickupAddressId",
  "courierId",
  "preferredPickupDate",
  "preferredPickupTime",
];

const BULK_TEMPLATE_EXAMPLE = [
  "ORD-1001",
  new Date().toISOString().slice(0, 10),
  "prepaid",
  "Jane Customer",
  "9876543210",
  "jane@example.com",
  "221B Baker Street",
  "",
  "Mumbai",
  "Maharashtra",
  "400001",
  "500",
  "20",
  "15",
  "10",
  "T-Shirt",
  "499",
  "1",
  "61091000",
  "5",
  "499",
  "0",
  "<pickupAddressId>",
  "<courierId>",
  new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  "10:00",
];

export function handleBulkTemplate(_req: Request, res: Response) {
  const csv = [BULK_TEMPLATE_HEADERS.join(","), BULK_TEMPLATE_EXAMPLE.join(",")].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="b2c-bulk-upload-template.csv"');
  res.send(csv);
}

export async function handleGetOrders(req: Request, res: Response) {
  const userId = req.userId!;
  const { search, status, orderType, paymentType, pickupAddressId, courierId } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  // Cap at 500 so the "500 / page" option in the orders table returns a full
  // page (not a silently-truncated 100, which would desync antd's pager).
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 20));

  const { start: startDate, end: endDate } = parseDateRange(req);

  // Build filter conditions (list — userId-scoped)
  const listConditions = [eq(orders.userId, userId)];
  if (status && typeof status === "string") listConditions.push(eq(orders.status, status));
  if (startDate) listConditions.push(gte(orders.createdAt, startDate));
  if (endDate) listConditions.push(lte(orders.createdAt, endDate));
  if (orderType && typeof orderType === "string") {
    listConditions.push(eq(orders.orderType, orderType.toLowerCase()));
  }
  if (paymentType && typeof paymentType === "string") {
    listConditions.push(eq(orders.paymentMode, paymentType));
  }
  if (pickupAddressId && typeof pickupAddressId === "string") {
    listConditions.push(eq(orders.pickupAddressId, pickupAddressId));
  }
  // Courier filter runs in SQL (not on the loaded page) so it spans every page
  // of the result set and the total/pagination stay honest.
  if (courierId && typeof courierId === "string") {
    listConditions.push(eq(orders.courierId, courierId));
  }
  if (search && typeof search === "string") {
    const q = `%${search.trim()}%`;
    const searchClause = or(
      ilike(orders.orderId, q),
      ilike(orders.awb, q),
      sql`(${orders.deliveryAddress}->>'contactName') ILIKE ${q}`,
      sql`(${orders.deliveryAddress}->>'city') ILIKE ${q}`,
      sql`(${orders.deliveryAddress}->>'email') ILIKE ${q}`,
      sql`(${orders.deliveryAddress}->>'phone') ILIKE ${q}`,
    );
    if (searchClause) listConditions.push(searchClause as unknown as ReturnType<typeof eq>);
  }
  const listWhere = and(...listConditions);

  // Stats use the same filter set excluding `status` and `search`
  // (mirrors original behaviour — stats spans all statuses for the user).
  const statsConditions = [eq(orders.userId, userId)];
  if (orderType && typeof orderType === "string") {
    statsConditions.push(eq(orders.orderType, orderType.toLowerCase()));
  }
  if (paymentType && typeof paymentType === "string") {
    statsConditions.push(eq(orders.paymentMode, paymentType));
  }
  if (pickupAddressId && typeof pickupAddressId === "string") {
    statsConditions.push(eq(orders.pickupAddressId, pickupAddressId));
  }
  if (courierId && typeof courierId === "string") {
    statsConditions.push(eq(orders.courierId, courierId));
  }
  if (startDate) statsConditions.push(gte(orders.createdAt, startDate));
  if (endDate) statsConditions.push(lte(orders.createdAt, endDate));
  const statsWhere = and(...statsConditions);

  // Determine sort
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

  // Status group-by aggregation
  const [statusRows, revenueRow, totalRow, rows] = await Promise.all([
    db
      .select({ status: orders.status, count: count() })
      .from(orders)
      .where(statsWhere)
      .groupBy(orders.status),
    db
      .select({
        totalRevenue: sql<number>`coalesce(sum((${orders.rateSnapshot}->>'totalCharge')::numeric), 0)`,
      })
      .from(orders)
      .where(statsWhere),
    db.select({ value: count() }).from(orders).where(listWhere),
    db
      .select()
      .from(orders)
      .where(listWhere)
      .orderBy(sortFn(sortCol))
      .offset((page - 1) * limit)
      .limit(limit),
  ]);

  const statsByStatus: Record<string, number> = {};
  let totalCount = 0;
  for (const r of statusRows) {
    statsByStatus[r.status] = Number(r.count);
    totalCount += Number(r.count);
  }

  const stats = {
    total: totalCount,
    draft: statsByStatus["draft"] ?? 0,
    created: statsByStatus["created"] ?? 0,
    processing: statsByStatus["processing"] ?? 0,
    booked: statsByStatus["booked"] ?? 0,
    pickup_initiated: statsByStatus["pickup_initiated"] ?? 0,
    shipped: statsByStatus["shipped"] ?? 0,
    in_transit: statsByStatus["in_transit"] ?? 0,
    out_for_delivery: statsByStatus["out_for_delivery"] ?? 0,
    delivered: statsByStatus["delivered"] ?? 0,
    ndr: statsByStatus["ndr"] ?? 0,
    rto_initiated: statsByStatus["rto_initiated"] ?? 0,
    rto_in_transit: statsByStatus["rto_in_transit"] ?? 0,
    rto_delivered: statsByStatus["rto_delivered"] ?? 0,
    cancelled: statsByStatus["cancelled"] ?? 0,
    lost: statsByStatus["lost"] ?? 0,
    totalRevenue: Number(revenueRow[0]?.totalRevenue ?? 0),
  };

  const total = totalRow[0]?.value ?? 0;

  // Resolve seller-facing (renamable) courier names for this page of orders.
  const courierIds = Array.from(
    new Set(rows.map((r) => r.courierId).filter((id): id is string => !!id)),
  );
  const courierRows = courierIds.length
    ? await db
        .select({ id: couriers.id, name: couriers.name })
        .from(couriers)
        .where(inArray(couriers.id, courierIds))
    : [];
  const courierNameById = new Map(courierRows.map((c) => [c.id, c.name]));

  res.json({
    success: true,
    orders: rows.map((r) => ({
      ...serializeOrder(r),
      courierName: r.courierId ? courierNameById.get(r.courierId) ?? null : null,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    stats,
  });
}

/**
 * GET /orders/courier-options — the couriers this seller has actually shipped
 * with, for the orders-page courier filter.
 *
 * Derived from the seller's own orders (not the global courier catalogue) so
 * the dropdown never offers a courier that would return zero rows, and never
 * leaks couriers the seller has no access to. Names come from `couriers.name`
 * (the renamable, seller-facing name) — never the aggregator slug.
 */
export async function handleGetOrderCourierOptions(req: Request, res: Response) {
  const userId = req.userId!;
  const { orderType } = req.query;

  const conditions = [eq(orders.userId, userId)];
  if (orderType && typeof orderType === "string") {
    conditions.push(eq(orders.orderType, orderType.toLowerCase()));
  }

  const rows = await db
    .selectDistinct({ id: couriers.id, name: couriers.name })
    .from(orders)
    .innerJoin(couriers, eq(couriers.id, orders.courierId))
    .where(and(...conditions))
    .orderBy(asc(couriers.name));

  res.json({ success: true, couriers: rows });
}

export async function handleGetOrderById(req: Request, res: Response) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, req.params.id), eq(orders.userId, req.userId!)),
  });

  if (!order) {
    res.status(404).json({ success: false, error: "Order not found" });
    return;
  }

  res.json({ success: true, order: serializeOrder(order) });
}
