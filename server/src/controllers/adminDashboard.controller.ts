import type { Request, Response } from "express";
import { and, eq, gte, inArray, lte, sql, desc, count } from "drizzle-orm";
import { db } from "../config/db.js";
import {
  orders,
  users,
  kycDocuments,
  bankAccounts,
  codRemittances,
} from "../db/schema.js";
import logger from "../config/logger.js";

const TAG = "[AdminDashboardController]";

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

function titleCase(s: string): string {
  if (!s) return s;
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

const FAILED_STATUSES = ["ndr", "rto_initiated", "rto_in_transit", "rto_delivered", "lost"] as const;
const RTO_STATUSES = ["rto_initiated", "rto_in_transit", "rto_delivered"] as const;

/**
 * GET /admin/dashboard — Admin platform-wide analytics.
 */
export async function handleAdminDashboard(req: Request, res: Response) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
  const serviceProvider = typeof req.query.serviceProvider === "string" ? req.query.serviceProvider : undefined;
  const paymentMode = typeof req.query.paymentType === "string" ? req.query.paymentType : undefined;

  const periodStart = new Date(todayStart);
  periodStart.setDate(periodStart.getDate() - days);
  const previousStart = new Date(todayStart);
  previousStart.setDate(previousStart.getDate() - days * 2);
  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Build dynamic conditions with optional filters
  const baseConditions: ReturnType<typeof eq>[] = [];
  if (serviceProvider) baseConditions.push(eq(orders.serviceProvider, serviceProvider));
  if (paymentMode) baseConditions.push(eq(orders.paymentMode, paymentMode));

  const currentWhere = and(gte(orders.createdAt, periodStart), ...baseConditions);
  const previousWhere = and(
    gte(orders.createdAt, previousStart),
    sql`${orders.createdAt} < ${periodStart}`,
    ...baseConditions,
  );
  const sevenDayWhere = and(gte(orders.createdAt, sevenDaysAgo), ...baseConditions);

  // SQL helpers
  const totalRevenueExpr = sql<number>`coalesce(sum((${orders.rateSnapshot}->>'totalCharge')::numeric), 0)`;
  const deliveredCountExpr = sql<number>`sum(case when ${orders.status} = 'delivered' then 1 else 0 end)`;
  const failedCountExpr = sql<number>`sum(case when ${orders.status} in ('ndr','rto_initiated','rto_in_transit','rto_delivered','lost') then 1 else 0 end)`;
  const rtoCountExpr = sql<number>`sum(case when ${orders.status} in ('rto_initiated','rto_in_transit','rto_delivered') then 1 else 0 end)`;
  // Use pickedUpAt as the available analogue for legacy shippedAt.
  const avgDeliveryDaysExpr = sql<number>`avg(
    case
      when ${orders.deliveredAt} is not null and ${orders.pickedUpAt} is not null
      then extract(epoch from (${orders.deliveredAt} - ${orders.pickedUpAt})) / 86400.0
      else null
    end
  )`;

  try {
    const [
      platformKpisRows,
      previousKpisRows,
      ordersTodayRow,
      activeSellersRow,
      courierInsightsRows,
      dailyTrendRows,
      revenueDataRows,
      sellerInsightsRows,
      failureSpikesRows,
      delayedShipmentsRow,
      ndrPendingRow,
      kycPendingRow,
      bankPendingRow,
      codPendingRow,
      topStatesRows,
      paymentSplitRows,
      statusDistributionRows,
    ] = await Promise.all([
      // 1. Platform KPIs (current period)
      db
        .select({
          totalOrders: count(),
          delivered: deliveredCountExpr,
          failed: failedCountExpr,
          totalRevenue: totalRevenueExpr,
          avgDeliveryDays: avgDeliveryDaysExpr,
        })
        .from(orders)
        .where(currentWhere),

      // 2. Previous period KPIs (for trend)
      db
        .select({
          totalOrders: count(),
          delivered: deliveredCountExpr,
          totalRevenue: totalRevenueExpr,
        })
        .from(orders)
        .where(previousWhere),

      // 3. Orders today
      db
        .select({ value: count() })
        .from(orders)
        .where(and(gte(orders.createdAt, todayStart), ...baseConditions)),

      // 4. Active sellers — teamRole is a plain text column
      db
        .select({ value: count() })
        .from(users)
        .where(and(eq(users.isActive, true), eq(users.role, "user"), eq(users.teamRole, "owner"))),

      // 5. Courier insights
      db
        .select({
          serviceProvider: orders.serviceProvider,
          totalOrders: count(),
          delivered: deliveredCountExpr,
          failed: failedCountExpr,
          revenue: totalRevenueExpr,
          avgDeliveryDays: avgDeliveryDaysExpr,
        })
        .from(orders)
        .where(currentWhere)
        .groupBy(orders.serviceProvider)
        .orderBy(desc(count())),

      // 6. Daily trend
      db
        .select({
          day: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM-DD')`.as("day"),
          orders: count(),
          delivered: deliveredCountExpr,
          rto: rtoCountExpr,
          revenue: totalRevenueExpr,
        })
        .from(orders)
        .where(currentWhere)
        .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`),

      // 7. Revenue & margins (by courier)
      db
        .select({
          serviceProvider: orders.serviceProvider,
          revenue: totalRevenueExpr,
          forwardCost: sql<number>`coalesce(sum((${orders.rateSnapshot}->>'forward')::numeric), 0)`,
          rtoCost: sql<number>`coalesce(sum((${orders.rateSnapshot}->>'rto')::numeric), 0)`,
          codCharges: sql<number>`coalesce(sum((${orders.rateSnapshot}->>'codCharges')::numeric), 0)`,
          otherCharges: sql<number>`coalesce(sum((${orders.rateSnapshot}->>'otherCharges')::numeric), 0)`,
          orderCount: count(),
        })
        .from(orders)
        .where(currentWhere)
        .groupBy(orders.serviceProvider)
        .orderBy(desc(totalRevenueExpr)),

      // 8. Seller insights (top 20 by volume)
      db
        .select({
          userId: orders.userId,
          totalOrders: count(),
          delivered: deliveredCountExpr,
          rto: rtoCountExpr,
          revenue: totalRevenueExpr,
          userName: users.name,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          businessName: users.businessName,
        })
        .from(orders)
        .innerJoin(users, eq(users.id, orders.userId))
        .where(currentWhere)
        .groupBy(orders.userId, users.name, users.firstName, users.lastName, users.email, users.businessName)
        .orderBy(desc(count()))
        .limit(20),

      // 9a. Failure spikes (>20% failure rate this week, min 5 orders)
      db
        .select({
          serviceProvider: orders.serviceProvider,
          total: count(),
          failed: failedCountExpr,
          failureRate: sql<number>`(sum(case when ${orders.status} in ('ndr','rto_initiated','rto_in_transit','rto_delivered','lost') then 1 else 0 end) * 100.0) / nullif(count(*), 0)`,
        })
        .from(orders)
        .where(sevenDayWhere)
        .groupBy(orders.serviceProvider)
        .having(
          sql`(sum(case when ${orders.status} in ('ndr','rto_initiated','rto_in_transit','rto_delivered','lost') then 1 else 0 end) * 100.0) / nullif(count(*), 0) > 20 and count(*) >= 5`,
        ),

      // 9b. Delayed shipments — pickedUpAt as the closest analogue to shippedAt
      db
        .select({ value: count() })
        .from(orders)
        .where(
          and(
            inArray(orders.status, ["shipped", "in_transit"]),
            lte(orders.pickedUpAt, new Date(now.getTime() - 5 * 86400000)),
            ...baseConditions,
          ),
        ),

      // 9c. Pending NDR
      db
        .select({ value: count() })
        .from(orders)
        .where(and(eq(orders.status, "ndr"), ...baseConditions)),

      // 10a. KYC pending
      db.select({ value: count() }).from(kycDocuments).where(eq(kycDocuments.status, "pending")),

      // 10b. Bank accounts pending
      db.select({ value: count() }).from(bankAccounts).where(eq(bankAccounts.status, "pending")),

      // 10c. COD pending
      db
        .select({ value: count() })
        .from(codRemittances)
        .where(eq(codRemittances.status, "pending")),

      // 11. Top states (deliveryAddress.state, normalised)
      db
        .select({
          state: sql<string>`lower(trim(coalesce(${orders.deliveryAddress}->>'state', '')))`.as("state"),
          orders: count(),
          delivered: deliveredCountExpr,
          revenue: totalRevenueExpr,
        })
        .from(orders)
        .where(currentWhere)
        .groupBy(sql`lower(trim(coalesce(${orders.deliveryAddress}->>'state', '')))`)
        .having(sql`lower(trim(coalesce(${orders.deliveryAddress}->>'state', ''))) <> ''`)
        .orderBy(desc(count()))
        .limit(10),

      // 12. Payment split
      db
        .select({
          paymentMode: orders.paymentMode,
          orders: count(),
          delivered: deliveredCountExpr,
          revenue: totalRevenueExpr,
          codAmount: sql<number>`coalesce(sum(coalesce(${orders.codAmount}::numeric, 0)), 0)`,
        })
        .from(orders)
        .where(currentWhere)
        .groupBy(orders.paymentMode),

      // 13. Status distribution
      db
        .select({ status: orders.status, count: count() })
        .from(orders)
        .where(currentWhere)
        .groupBy(orders.status)
        .orderBy(desc(count())),
    ]);

    const ordersToday = Number(ordersTodayRow[0]?.value ?? 0);
    const activeSellers = Number(activeSellersRow[0]?.value ?? 0);
    const delayedCount = Number(delayedShipmentsRow[0]?.value ?? 0);
    const ndrPending = Number(ndrPendingRow[0]?.value ?? 0);
    const kycPending = Number(kycPendingRow[0]?.value ?? 0);
    const bankPending = Number(bankPendingRow[0]?.value ?? 0);
    const codPendingCount = Number(codPendingRow[0]?.value ?? 0);

    // ── Process platform KPIs ──
    const curr = platformKpisRows[0] ?? { totalOrders: 0, delivered: 0, failed: 0, totalRevenue: 0, avgDeliveryDays: null };
    const prev = previousKpisRows[0] ?? { totalOrders: 0, delivered: 0, totalRevenue: 0 };
    const currTotal = Number(curr.totalOrders ?? 0);
    const currDelivered = Number(curr.delivered ?? 0);
    const currRevenue = Number(curr.totalRevenue ?? 0);
    const currAvgDeliveryDays = curr.avgDeliveryDays !== null && curr.avgDeliveryDays !== undefined ? Number(curr.avgDeliveryDays) : null;
    const prevTotal = Number(prev.totalOrders ?? 0);
    const prevDelivered = Number(prev.delivered ?? 0);
    const prevRevenue = Number(prev.totalRevenue ?? 0);
    const currDeliveryRate = currTotal ? (currDelivered / currTotal) * 100 : 0;
    const prevDeliveryRate = prevTotal ? (prevDelivered / prevTotal) * 100 : 0;

    // ── Process courier insights ──
    const couriers = courierInsightsRows.map((c) => {
      const t = Number(c.totalOrders);
      const d = Number(c.delivered);
      const f = Number(c.failed);
      const avg = c.avgDeliveryDays !== null && c.avgDeliveryDays !== undefined ? Number(c.avgDeliveryDays) : null;
      return {
        courier: c.serviceProvider as string,
        totalOrders: t,
        delivered: d,
        failed: f,
        successRate: round1(t ? (d / t) * 100 : 0),
        failureRate: round1(t ? (f / t) * 100 : 0),
        revenue: round2(Number(c.revenue ?? 0)),
        avgDeliveryDays: avg ? round1(avg) : null,
      };
    });

    // ── Revenue & margins ──
    const margins = revenueDataRows.map((r) => {
      const fwd = Number(r.forwardCost ?? 0);
      const rt = Number(r.rtoCost ?? 0);
      const cod = Number(r.codCharges ?? 0);
      const other = Number(r.otherCharges ?? 0);
      const rev = Number(r.revenue ?? 0);
      const oc = Number(r.orderCount ?? 0);
      const totalCost = fwd + rt + cod + other;
      const margin = rev - totalCost;
      return {
        courier: r.serviceProvider as string,
        revenue: round2(rev),
        cost: round2(totalCost),
        margin: round2(margin),
        marginPercent: rev ? round1((margin / rev) * 100) : 0,
        orderCount: oc,
        revenuePerOrder: oc ? round2(rev / oc) : 0,
      };
    });

    // ── Seller insights ──
    const formatSeller = (s: typeof sellerInsightsRows[number]) => {
      const totalOrders = Number(s.totalOrders);
      const delivered = Number(s.delivered);
      const rto = Number(s.rto);
      return {
        id: s.userId,
        name:
          s.businessName ||
          s.userName ||
          `${s.firstName || ""} ${s.lastName || ""}`.trim(),
        email: s.email,
        totalOrders,
        delivered,
        rto,
        revenue: round2(Number(s.revenue ?? 0)),
        rtoRate: totalOrders ? round1((rto / totalOrders) * 100) : 0,
      };
    };

    const topSellers = sellerInsightsRows.slice(0, 10).map(formatSeller);
    const highRtoSellers = [...sellerInsightsRows]
      .filter((s) => Number(s.totalOrders) >= 5)
      .sort((a, b) => {
        const ar = Number(a.rto) / Number(a.totalOrders);
        const br = Number(b.rto) / Number(b.totalOrders);
        return br - ar;
      })
      .slice(0, 10)
      .map(formatSeller);

    // ── Payment split ──
    const paymentMap: Record<string, { orders: number; delivered: number; revenue: number; codAmount: number }> = {};
    paymentSplitRows.forEach((p) => {
      if (!p.paymentMode) return;
      paymentMap[p.paymentMode] = {
        orders: Number(p.orders),
        delivered: Number(p.delivered),
        revenue: round2(Number(p.revenue ?? 0)),
        codAmount: round2(Number(p.codAmount ?? 0)),
      };
    });

    // ── Top states ──
    const states = topStatesRows.map((s) => {
      const o = Number(s.orders);
      const d = Number(s.delivered);
      return {
        state: titleCase(s.state ?? ""),
        orders: o,
        deliveryRate: round1(o ? (d / o) * 100 : 0),
        revenue: round2(Number(s.revenue ?? 0)),
      };
    });

    res.json({
      success: true,
      overview: {
        totalOrders: currTotal,
        previousOrders: prevTotal,
        ordersToday,
        activeSellers,
        revenue: round2(currRevenue),
        previousRevenue: round2(prevRevenue),
        deliveryRate: round1(currDeliveryRate),
        previousDeliveryRate: round1(prevDeliveryRate),
        avgDeliveryDays: currAvgDeliveryDays !== null ? round1(currAvgDeliveryDays) : null,
      },
      courierInsights: couriers,
      trends: dailyTrendRows.map((d) => ({
        date: d.day,
        orders: Number(d.orders),
        delivered: Number(d.delivered),
        rto: Number(d.rto),
        revenue: round2(Number(d.revenue ?? 0)),
      })),
      revenue: {
        margins,
        totalRevenue: margins.reduce((sum, m) => sum + m.revenue, 0),
        totalCost: margins.reduce((sum, m) => sum + m.cost, 0),
        totalMargin: margins.reduce((sum, m) => sum + m.margin, 0),
      },
      sellers: {
        topSellers,
        highRtoSellers,
      },
      alerts: {
        failureSpikes: failureSpikesRows.map((s) => ({
          courier: s.serviceProvider,
          total: Number(s.total),
          failed: Number(s.failed),
          failureRate: round1(Number(s.failureRate ?? 0)),
        })),
        delayedShipments: delayedCount,
        ndrPending,
        totalAlerts: failureSpikesRows.length + (delayedCount > 0 ? 1 : 0) + (ndrPending > 0 ? 1 : 0),
      },
      pendingActions: {
        kycPending,
        bankApprovalsPending: bankPending,
        codRemittancesPending: codPendingCount,
      },
      paymentSplit: {
        prepaid: paymentMap["prepaid"] ?? { orders: 0, delivered: 0, revenue: 0, codAmount: 0 },
        cod: paymentMap["cod"] ?? { orders: 0, delivered: 0, revenue: 0, codAmount: 0 },
      },
      topStates: states,
      statusDistribution: statusDistributionRows.map((s) => ({
        status: s.status,
        count: Number(s.count),
      })),
    });
  } catch (err) {
    logger.error(`${TAG} Admin dashboard failed`, err);
    res.status(500).json({ success: false, error: "Failed to load dashboard" });
  }
}

// keep references used
void FAILED_STATUSES;
void RTO_STATUSES;
