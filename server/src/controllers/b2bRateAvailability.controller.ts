import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { users } from "../db/schema.js";
import { fetchB2bAvailableCouriers } from "../services/b2bRateCalculation.js";
import logger from "../config/logger.js";

export async function handleFetchB2bAvailableCouriers(req: Request, res: Response) {
  const {
    origin,
    destination,
    packages,
    paymentType,
    orderAmount,
    declaredValue,
    isInsurance,
    isTimeSpecificDelivery,
    isHolidayPickup,
    plan: requestedPlan,
  } = req.body;

  // Resolve user's plan from their profile (admins can override via body.plan)
  let plan = requestedPlan as string | undefined;
  if (!plan) {
    const userId = (req as unknown as { userId: string }).userId;
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { plan: true },
    });
    plan = user?.plan ?? "basic";
  }

  const couriers = await fetchB2bAvailableCouriers({
    origin,
    destination,
    packages,
    paymentType,
    orderAmount: Number(orderAmount),
    plan,
    declaredValue: declaredValue ? Number(declaredValue) : undefined,
    isInsurance: isInsurance ?? false,
    isTimeSpecificDelivery: isTimeSpecificDelivery ?? false,
    isHolidayPickup: isHolidayPickup ?? false,
  });

  logger.info(`[B2bRateAvailability] Responding with ${couriers.length} B2B courier(s) for ${origin} → ${destination}`);
  res.json({ success: true, data: couriers });
}
