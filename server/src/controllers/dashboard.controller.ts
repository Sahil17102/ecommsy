import type { Request, Response } from "express";
import { and, eq, gte, inArray, lte, sql, desc, count } from "drizzle-orm";
import { db } from "../config/db.js";
import { orders, b2cZones, codRemittances } from "../db/schema.js";
import logger from "../config/logger.js";

const TAG = "[DashboardController]";

// Mongoose `rate.*` fields now live inside `rateSnapshot` jsonb. The avg
// delivery-days computation also needs a custom SQL because `shippedAt` was
// removed from the columns and only lives in metadata; we fall back to the
// nearest schema column we have — `pickedUpAt` — which is the closest analogue.

const RTO_STATUSES = ["rto_initiated", "rto_in_transit", "rto_delivered"] as const;
const ACTIVE_STATUSES = [
  "created",
  "processing",
  "booked",
  "pickup_initiated",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "ndr",
  "rto_initiated",
  "rto_in_transit",
] as const;

/**
 * GET /dashboard/summary — Seller dashboard analytics.
 */
export async function handleSellerDashboard(req: Request, res: Response) {
  const userId = req.userId!;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // ── Date range ──
  const { from, to, days, orderType } = req.query;
  let periodDays = 30;
  let periodStart: Date;
  let periodEnd: Date = now;

  if (from && typeof from === "string") {
    periodStart = new Date(from);
    periodEnd = to && typeof to === "string" ? new Date(to + "T23:59:59.999Z") : now;
    periodDays = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / 86400000));
  } else if (days && typeof days === "string") {
    periodDays = Math.min(Math.max(Number(days) || 30, 1), 365);
    periodStart = new Date(todayStart);
    periodStart.setDate(periodStart.getDate() - periodDays);
  } else {
    periodStart = new Date(todayStart);
    periodStart.setDate(periodStart.getDate() - 30);
  }

  const prevPeriodStart = new Date(periodStart);
  prevPeriodStart.setDate(prevPeriodStart.getDate() - periodDays);

  // ── Order type filter ──
  // schema's orderType is lowercase varchar (b2b/b2c).
  const orderTypeCond =
    orderType && typeof orderType === "string" && ["B2B", "B2C"].includes(orderType)
      ? eq(orders.orderType, orderType.toLowerCase())
      : undefined;

  const baseUserCond = eq(orders.userId, userId);
  const currentWhere = and(
    baseUserCond,
    gte(orders.createdAt, periodStart),
    lte(orders.createdAt, periodEnd),
    orderTypeCond,
  );
  const previousWhere = and(
    baseUserCond,
    gte(orders.createdAt, prevPeriodStart),
    sql`${orders.createdAt} < ${periodStart}`,
    orderTypeCond,
  );
  const userOnlyWhere = and(baseUserCond, orderTypeCond);

  // SQL helpers
  const totalChargeExpr = sql<number>`coalesce((${orders.rateSnapshot}->>'totalCharge')::numeric, 0)`;
  const avgCostExpr = sql<number>`avg((${orders.rateSnapshot}->>'totalCharge')::numeric)`;
  const avgDeliveryDaysExpr = sql<number>`avg(
    case
      when ${orders.deliveredAt} is not null and ${orders.pickedUpAt} is not null
      then extract(epoch from (${orders.deliveredAt} - ${orders.pickedUpAt})) / 86400.0
      else null
    end
  )`;
  const deliveredCountExpr = sql<number>`sum(case when ${orders.status} = 'delivered' then 1 else 0 end)`;
  const rtoCountExpr = sql<number>`sum(case when ${orders.status} in ('rto_initiated','rto_in_transit','rto_delivered') then 1 else 0 end)`;

  try {
    const [
      zoneList,
      currentKpisRows,
      previousKpisRows,
      pipelineRows,
      dailyTrendRows,
      courierScorecardRows,
      zonePerformanceRows,
      paymentSplitRows,
      topCitiesRows,
      codPendingRows,
    ] = await Promise.all([
      db
        .select({ code: b2cZones.code, name: b2cZones.name })
        .from(b2cZones)
        .where(eq(b2cZones.isActive, true)),

      // 1. Current period KPIs
      db
        .select({
          totalOrders: count(),
          delivered: deliveredCountExpr,
          rto: rtoCountExpr,
          totalCost: sql<number>`coalesce(sum((${orders.rateSnapshot}->>'totalCharge')::numeric), 0)`,
          avgDeliveryDays: avgDeliveryDaysExpr,
        })
        .from(orders)
        .where(currentWhere),

      // 2. Previous period KPIs
      db
        .select({
          totalOrders: count(),
          delivered: deliveredCountExpr,
          rto: rtoCountExpr,
          avgDeliveryDays: avgDeliveryDaysExpr,
        })
        .from(orders)
        .where(previousWhere),

      // 3. Live pipeline (no date filter, only active statuses)
      db
        .select({ status: orders.status, count: count() })
        .from(orders)
        .where(and(userOnlyWhere, inArray(orders.status, ACTIVE_STATUSES as unknown as string[])))
        .groupBy(orders.status),

      // 4. Daily trend
      db
        .select({
          day: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM-DD')`.as("day"),
          orders: count(),
          delivered: deliveredCountExpr,
          rto: rtoCountExpr,
        })
        .from(orders)
        .where(currentWhere)
        .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`),

      // 5. Courier scorecard
      db
        .select({
          serviceProvider: orders.serviceProvider,
          totalOrders: count(),
          delivered: deliveredCountExpr,
          rto: rtoCountExpr,
          totalCost: sql<number>`coalesce(sum((${orders.rateSnapshot}->>'totalCharge')::numeric), 0)`,
          avgDeliveryDays: avgDeliveryDaysExpr,
        })
        .from(orders)
        .where(currentWhere)
        .groupBy(orders.serviceProvider)
        .orderBy(desc(count())),

      // 6. Zone performance (rateSnapshot.zone)
      db
        .select({
          zone: sql<string>`${orders.rateSnapshot}->>'zone'`.as("zone"),
          totalOrders: count(),
          delivered: deliveredCountExpr,
          rto: rtoCountExpr,
          avgCost: avgCostExpr,
          avgDeliveryDays: avgDeliveryDaysExpr,
        })
        .from(orders)
        .where(currentWhere)
        .groupBy(sql`${orders.rateSnapshot}->>'zone'`)
        .orderBy(desc(count())),

      // 7. Payment split — `paymentMode` is the schema-native column.
      db
        .select({
          paymentMode: orders.paymentMode,
          totalOrders: count(),
          delivered: deliveredCountExpr,
          totalAmount: sql<number>`coalesce(sum(coalesce(${orders.declaredValue}::numeric, 0)), 0)`,
          codAmount: sql<number>`coalesce(sum(coalesce(${orders.codAmount}::numeric, 0)), 0)`,
        })
        .from(orders)
        .where(currentWhere)
        .groupBy(orders.paymentMode),

      // 8. Top cities — city lives in `deliveryAddress` jsonb
      db
        .select({
          city: sql<string>`${orders.deliveryAddress}->>'city'`.as("city"),
          orders: count(),
          delivered: deliveredCountExpr,
        })
        .from(orders)
        .where(currentWhere)
        .groupBy(sql`${orders.deliveryAddress}->>'city'`)
        .orderBy(desc(count()))
        .limit(10),

      // 9. COD pending
      db
        .select({
          pendingAmount: sql<number>`coalesce(sum(${codRemittances.remittableAmount}::numeric), 0)`,
          pendingCount: count(),
        })
        .from(codRemittances)
        .where(and(eq(codRemittances.userId, userId), eq(codRemittances.status, "pending"))),
    ]);

    const round1 = (n: number) => Math.round(n * 10) / 10;
    const round2 = (n: number) => Math.round(n * 100) / 100;

    // ── Zone code → name map ──
    const zoneNameMap: Record<string, string> = {};
    zoneList.forEach((z) => { zoneNameMap[z.code] = z.name; });

    // ── KPIs ──
    const curr = currentKpisRows[0] ?? { totalOrders: 0, delivered: 0, rto: 0, totalCost: 0, avgDeliveryDays: null };
    const prev = previousKpisRows[0] ?? { totalOrders: 0, delivered: 0, rto: 0, avgDeliveryDays: null };
    const currTotal = Number(curr.totalOrders ?? 0);
    const currDelivered = Number(curr.delivered ?? 0);
    const currRto = Number(curr.rto ?? 0);
    const currCost = Number(curr.totalCost ?? 0);
    const currAvgDeliveryDays = curr.avgDeliveryDays !== null && curr.avgDeliveryDays !== undefined ? Number(curr.avgDeliveryDays) : null;
    const prevTotal = Number(prev.totalOrders ?? 0);
    const prevDelivered = Number(prev.delivered ?? 0);
    const prevRto = Number(prev.rto ?? 0);
    const prevAvgDeliveryDays = prev.avgDeliveryDays !== null && prev.avgDeliveryDays !== undefined ? Number(prev.avgDeliveryDays) : null;

    const currDeliveryRate = currTotal ? (currDelivered / currTotal) * 100 : 0;
    const prevDeliveryRate = prevTotal ? (prevDelivered / prevTotal) * 100 : 0;
    const currRtoRate = currTotal ? (currRto / currTotal) * 100 : 0;
    const prevRtoRate = prevTotal ? (prevRto / prevTotal) * 100 : 0;

    // ── Pipeline ──
    const pipelineMap: Record<string, number> = {};
    pipelineRows.forEach((p) => { pipelineMap[p.status] = Number(p.count); });

    // ── Couriers ──
    const couriers = courierScorecardRows.map((c) => {
      const t = Number(c.totalOrders);
      const d = Number(c.delivered);
      const r = Number(c.rto);
      const cost = Number(c.totalCost);
      const avg = c.avgDeliveryDays !== null && c.avgDeliveryDays !== undefined ? Number(c.avgDeliveryDays) : null;
      return {
        courier: c.serviceProvider as string,
        totalOrders: t,
        delivered: d,
        successRate: round1(t ? (d / t) * 100 : 0),
        rtoRate: round1(t ? (r / t) * 100 : 0),
        avgDeliveryDays: avg ? round1(avg) : null,
        avgCost: round2(t ? cost / t : 0),
      };
    });

    // ── Zones (with readable names) ──
    const zones = zonePerformanceRows.map((z) => {
      const t = Number(z.totalOrders);
      const d = Number(z.delivered);
      const r = Number(z.rto);
      const avg = z.avgDeliveryDays !== null && z.avgDeliveryDays !== undefined ? Number(z.avgDeliveryDays) : null;
      return {
        zone: z.zone,
        zoneName: zoneNameMap[z.zone] ?? z.zone,
        totalOrders: t,
        successRate: round1(t ? (d / t) * 100 : 0),
        rtoRate: round1(t ? (r / t) * 100 : 0),
        avgCost: round2(Number(z.avgCost ?? 0)),
        avgDeliveryDays: avg ? round1(avg) : null,
      };
    });

    // ── Payment ──
    const paymentData: Record<string, { orders: number; delivered: number; totalAmount: number; codAmount: number }> = {};
    paymentSplitRows.forEach((p) => {
      if (!p.paymentMode) return;
      paymentData[p.paymentMode] = {
        orders: Number(p.totalOrders),
        delivered: Number(p.delivered),
        totalAmount: round2(Number(p.totalAmount ?? 0)),
        codAmount: round2(Number(p.codAmount ?? 0)),
      };
    });

    const codPend = codPendingRows[0] ?? { pendingAmount: 0, pendingCount: 0 };

    // ── Cities ──
    const cities = topCitiesRows.map((c) => {
      const o = Number(c.orders);
      const d = Number(c.delivered);
      return {
        city: c.city,
        orders: o,
        deliveryRate: round1(o ? (d / o) * 100 : 0),
      };
    });

    res.json({
      success: true,
      kpis: {
        deliveryRate: { current: round1(currDeliveryRate), previous: round1(prevDeliveryRate) },
        avgDeliveryDays: {
          current: currAvgDeliveryDays !== null ? round1(currAvgDeliveryDays) : null,
          previous: prevAvgDeliveryDays !== null ? round1(prevAvgDeliveryDays) : null,
        },
        rtoRate: { current: round1(currRtoRate), previous: round1(prevRtoRate) },
        totalOrders: { current: currTotal, previous: prevTotal },
        totalCost: round2(currCost),
      },
      pipeline: {
        created: pipelineMap["created"] ?? 0,
        processing: (pipelineMap["processing"] ?? 0) + (pipelineMap["booked"] ?? 0) + (pipelineMap["pickup_initiated"] ?? 0),
        inTransit: (pipelineMap["shipped"] ?? 0) + (pipelineMap["in_transit"] ?? 0),
        outForDelivery: pipelineMap["out_for_delivery"] ?? 0,
        ndr: pipelineMap["ndr"] ?? 0,
        rto: (pipelineMap["rto_initiated"] ?? 0) + (pipelineMap["rto_in_transit"] ?? 0),
      },
      trends: dailyTrendRows.map((d) => ({
        date: d.day,
        orders: Number(d.orders),
        delivered: Number(d.delivered),
        rto: Number(d.rto),
      })),
      courierScorecard: couriers,
      zonePerformance: zones,
      paymentSplit: {
        prepaid: paymentData["prepaid"] ?? { orders: 0, delivered: 0, totalAmount: 0, codAmount: 0 },
        cod: paymentData["cod"] ?? { orders: 0, delivered: 0, totalAmount: 0, codAmount: 0 },
      },
      codPending: { amount: round2(Number(codPend.pendingAmount ?? 0)), count: Number(codPend.pendingCount ?? 0) },
      topCities: cities,
    });
  } catch (err) {
    logger.error(`${TAG} Seller dashboard failed`, err);
    res.status(500).json({ success: false, error: "Failed to load dashboard" });
  }
}

// keep references used
void RTO_STATUSES;
