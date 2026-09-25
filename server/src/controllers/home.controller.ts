import type { Request, Response } from "express";
import { and, desc, eq, gte, inArray, sql, count } from "drizzle-orm";
import { db } from "../config/db.js";
import { orders, wallets, codRemittances } from "../db/schema.js";
import logger from "../config/logger.js";

const TAG = "[HomeController]";

/**
 * GET /dashboard/home — Lightweight seller home.
 */
export async function handleSellerHome(req: Request, res: Response) {
  const userId = req.userId!;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  try {
    const [
      ordersTodayRow,
      inTransitRow,
      ndrPendingRow,
      rtoPendingRow,
      walletData,
      codPendingRow,
      recentOrders,
      statusDistributionRows,
    ] = await Promise.all([
      db
        .select({ value: count() })
        .from(orders)
        .where(and(eq(orders.userId, userId), gte(orders.createdAt, todayStart))),
      db
        .select({ value: count() })
        .from(orders)
        .where(
          and(
            eq(orders.userId, userId),
            inArray(orders.status, ["shipped", "in_transit", "out_for_delivery"]),
          ),
        ),
      db
        .select({ value: count() })
        .from(orders)
        .where(and(eq(orders.userId, userId), eq(orders.status, "ndr"))),
      db
        .select({ value: count() })
        .from(orders)
        .where(
          and(
            eq(orders.userId, userId),
            inArray(orders.status, ["rto_initiated", "rto_in_transit"]),
          ),
        ),

      // Wallet balance
      db.query.wallets.findFirst({
        where: eq(wallets.userId, userId),
        columns: { balance: true },
      }),

      // COD pending
      db
        .select({
          amount: sql<number>`coalesce(sum(${codRemittances.remittableAmount}::numeric), 0)`,
          count: count(),
        })
        .from(codRemittances)
        .where(and(eq(codRemittances.userId, userId), eq(codRemittances.status, "pending"))),

      // Last 5 orders for quick glance
      db
        .select({
          id: orders.id,
          orderId: orders.orderId,
          awb: orders.awb,
          status: orders.status,
          serviceProvider: orders.serviceProvider,
          deliveryAddress: orders.deliveryAddress,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt))
        .limit(5),

      // Order status distribution (all of this user's orders)
      db
        .select({ status: orders.status, count: count() })
        .from(orders)
        .where(eq(orders.userId, userId))
        .groupBy(orders.status)
        .orderBy(desc(count())),
    ]);

    const codAmount = Number(codPendingRow[0]?.amount ?? 0);
    const codCount = Number(codPendingRow[0]?.count ?? 0);

    res.json({
      success: true,
      quickStats: {
        ordersToday: Number(ordersTodayRow[0]?.value ?? 0),
        inTransit: Number(inTransitRow[0]?.value ?? 0),
        ndrPending: Number(ndrPendingRow[0]?.value ?? 0),
        rtoPending: Number(rtoPendingRow[0]?.value ?? 0),
      },
      wallet: {
        balance: walletData ? Number(walletData.balance) : 0,
      },
      codPending: {
        amount: Math.round(codAmount * 100) / 100,
        count: codCount,
      },
      statusDistribution: statusDistributionRows.map((s) => ({
        status: s.status,
        count: Number(s.count),
      })),
      recentOrders: recentOrders.map((o) => {
        const delivery = (o.deliveryAddress ?? {}) as Record<string, unknown>;
        return {
          _id: o.id,
          orderId: o.orderId,
          awb: o.awb,
          status: o.status,
          serviceProvider: o.serviceProvider,
          city: (delivery.city as string | undefined) ?? "—",
          contactName: (delivery.contactName as string | undefined) ?? "—",
          createdAt: o.createdAt,
        };
      }),
    });
  } catch (err) {
    logger.error(`${TAG} Seller home failed`, err);
    res.status(500).json({ success: false, error: "Failed to load home data" });
  }
}
