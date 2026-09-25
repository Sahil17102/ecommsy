import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { users } from "../db/schema.js";
import { fetchAvailableCouriers } from "../services/courierAvailability.js";
import logger from "../config/logger.js";

export async function handleFetchAvailableCouriers(req: Request, res: Response) {
  const {
    origin,
    destination,
    weight,
    length,
    breadth,
    height,
    paymentType,
    orderAmount,
    orderType,
    plan: requestedPlan,
  } = req.body;

  // Resolve user's plan from their profile (admins can override via body.plan)
  let plan = requestedPlan as string | undefined;
  if (!plan) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, (req as unknown as { userId: string }).userId),
      columns: { plan: true },
    });
    plan = user?.plan ?? "basic";
  }

  const couriers = await fetchAvailableCouriers({
    origin,
    destination,
    weight: Number(weight),
    length: length ? Number(length) : undefined,
    breadth: breadth ? Number(breadth) : undefined,
    height: height ? Number(height) : undefined,
    paymentType,
    orderAmount: orderAmount ? Number(orderAmount) : undefined,
    orderType: orderType || undefined,
    plan,
  });

  logger.info(`[CourierAvailability] Responding with ${couriers.length} courier(s) for ${origin} → ${destination}`);
  res.json({ success: true, data: couriers });
}
