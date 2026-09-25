import { Router, type Request, type Response } from "express";
import { desc, eq, or } from "drizzle-orm";
import { db } from "../config/db.js";
import { orders, trackingEvents, pickupAddresses, couriers } from "../db/schema.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

/**
 * Public shipment tracking — no auth. Powers the marketing-site "Track Shipment"
 * page. Deliberately exposes only city/state + status events (never customer
 * names, phone numbers or full addresses), matching what courier public-tracking
 * pages reveal.
 */
export const publicTrackingRouter = Router();

interface JsonAddress {
  city?: string | null;
  state?: string | null;
}

function cityState(a: JsonAddress | null | undefined): string | null {
  if (!a) return null;
  const parts = [a.city, a.state].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/** GET /track?q=<awb-or-orderId> — public shipment status + timeline. */
publicTrackingRouter.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const q = String(req.query.q ?? "").trim();
    if (q.length < 4) {
      res.status(400).json({ found: false, message: "Enter a valid AWB number or Order ID" });
      return;
    }

    const order = await db.query.orders.findFirst({
      where: or(eq(orders.awb, q), eq(orders.orderId, q)),
    });

    if (!order) {
      res.json({ found: false, message: "No shipment found for this AWB / Order ID" });
      return;
    }

    const [events, pickup, courier] = await Promise.all([
      db
        .select()
        .from(trackingEvents)
        .where(eq(trackingEvents.orderId, order.id))
        .orderBy(desc(trackingEvents.createdAt)),
      order.pickupAddressId
        ? db.query.pickupAddresses.findFirst({ where: eq(pickupAddresses.id, order.pickupAddressId) })
        : Promise.resolve(undefined),
      order.courierId
        ? db.query.couriers.findFirst({ where: eq(couriers.id, order.courierId) })
        : Promise.resolve(undefined),
    ]);

    const delivery = (order.deliveryAddress as JsonAddress | null) ?? null;

    res.json({
      found: true,
      awb: order.awb,
      orderId: order.orderId,
      status: order.status,
      courierStatus: order.courierStatus,
      courier: courier?.name ?? order.serviceProvider ?? null,
      origin: cityState(pickup),
      destination: cityState(delivery),
      weightKg: order.weight ? Number(order.weight) / 1000 : null,
      events: events.map((e) => ({
        statusText: e.statusText,
        statusCode: e.statusCode,
        location: e.location,
        remarks: e.remarks,
        timestamp: e.eventTimestamp ?? e.createdAt,
      })),
    });
  }),
);
