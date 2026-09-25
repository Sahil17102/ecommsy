import { and, eq, inArray } from "drizzle-orm";
import { db } from "../config/db.js";
import { orders } from "../db/schema.js";
import { manifestOrders, type ManifestResult } from "./manifestService.js";
import { AppError } from "../utils/AppError.js";

// Safety ceiling per request — matches the bulk-create cap. This is an
// abuse/timeout guard, NOT a product restriction: the old "max 5, single
// courier" limits are gone. Mixed couriers are fully supported — manifestOrders
// processes each order against its own courier account and emits one manifest
// PDF per courier.
export const BULK_MANIFEST_MAX = 500;

/**
 * Bulk manifest / initiate-pickup for a seller's B2C orders.
 *
 * No courier-uniformity constraint: orders may span any mix of couriers. Each
 * order is resolved to its own service-provider account inside manifestOrders,
 * so pickups are raised against the correct carrier per order, and manifest PDFs
 * are grouped per courier.
 */
export async function bulkManifestB2COrders(
  orderIds: string[],
  userId: string,
): Promise<ManifestResult> {
  if (orderIds.length === 0) {
    throw new AppError(400, "No order IDs provided");
  }
  if (orderIds.length > BULK_MANIFEST_MAX) {
    throw new AppError(400, `Bulk manifest is limited to ${BULK_MANIFEST_MAX} orders per request`);
  }

  const rows = await db
    .select({
      id: orders.id,
      orderType: orders.orderType,
    })
    .from(orders)
    .where(and(inArray(orders.id, orderIds), eq(orders.userId, userId)));

  if (rows.length !== orderIds.length) {
    throw new AppError(404, "One or more orders were not found");
  }

  // orderType is lowercase varchar (b2c / b2b) in the new schema.
  const nonB2C = rows.find((o) => o.orderType !== "b2c");
  if (nonB2C) {
    throw new AppError(400, "Bulk manifest currently supports B2C orders only");
  }

  return manifestOrders(orderIds, userId);
}
