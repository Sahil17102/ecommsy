import { and, eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { orders, wallets, trackingEvents } from "../db/schema.js";
import { createWalletTransaction, TransactionType } from "./wallet.js";
import { dispatchWebhookEvent } from "./webhook.js";
import { buildOrderEventData } from "./webhookEvents.js";
import { createProvider, resolveAccountForOrder, providerOrderType } from "./providers/index.js";
import { AppError } from "../utils/AppError.js";
import logger from "../config/logger.js";
import { notifyAsync } from "./notificationService.js";

const TAG = "[OrderCancellation]";

type OrderRow = typeof orders.$inferSelect;
type OrderStatus = OrderRow["status"];

const CANCELLABLE_STATUSES: OrderStatus[] = [
  "created",
  "processing",
  "booked",
  "pickup_initiated",
];

export class CancellationError extends AppError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = "CancellationError";
  }
}

/**
 * Cancel an order:
 * 1. Validate status is cancellable
 * 2. Call courier cancel API (if supported)
 * 3. Refund freight to wallet
 * 4. Update order status
 * 5. Log tracking event + dispatch webhook
 */
export async function cancelOrder(
  orderId: string,
  userId: string,
  reason?: string,
): Promise<OrderRow> {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
  });
  if (!order) throw new CancellationError(404, "Order not found");

  if (!CANCELLABLE_STATUSES.includes(order.status as OrderStatus)) {
    throw new CancellationError(
      400,
      `Cannot cancel order in "${order.status}" status. Cancellable statuses: ${CANCELLABLE_STATUSES.join(", ")}`,
    );
  }

  // Call courier cancel API via the account this order was shipped through
  const account = await resolveAccountForOrder(order);
  // Use the same B2B/B2C provider the order was booked through.
  const provider = account ? createProvider(account, providerOrderType(order.orderType)) : null;
  if (provider) {
    const result = await provider.cancelOrder(order.awb ?? "", order, reason);
    if (!result.success) {
      logger.warn(`${TAG} Courier cancel API failed for AWB=${order.awb} (${account?.name}): ${result.error}`);
      // Don't block cancellation — courier API failure shouldn't prevent local cancel
    }
  } else {
    logger.info(`${TAG} No provider for order "${order.id}" (slug=${order.serviceProvider}) — skipping cancel API`);
  }

  // Refund freight to wallet
  const wallet = await db.query.wallets.findFirst({ where: eq(wallets.userId, userId) });
  if (wallet) {
    const rateSnapshot = (order.rateSnapshot as { totalCharge?: number } | null) ?? null;
    const refundAmount = rateSnapshot?.totalCharge ?? 0;
    if (refundAmount > 0) {
      await createWalletTransaction({
        walletId: wallet.id,
        amount: refundAmount,
        type: TransactionType.CREDIT,
        reason: "Freight Refund - Order Cancelled",
        ref: order.id,
        meta: {
          awb: order.awb,
          orderId: order.orderId,
          courier_name: order.serviceProvider,
          refund_amount: refundAmount,
          cancel_reason: reason,
        },
      });
    }
  }

  // Update order
  const cancelledAt = new Date();
  const [updated] = await db
    .update(orders)
    .set({ status: "cancelled", cancelledAt, updatedAt: new Date() })
    .where(eq(orders.id, order.id))
    .returning();

  // Log tracking event
  await db.insert(trackingEvents).values({
    orderId: order.id,
    userId: order.userId,
    awb: order.awb,
    statusCode: "cancelled",
    statusText: "Order Cancelled",
    remarks: reason || "Cancelled by user",
    source: "system",
  });

  // Dispatch outgoing webhook
  dispatchWebhookEvent(
    userId,
    "order.cancelled",
    buildOrderEventData(updated, {
      previousStatus: order.status,
      eventTimestamp: cancelledAt,
      cancellation: { reason: reason ?? "Cancelled by user", cancelledAt },
    }),
  );

  notifyAsync({
    userId,
    event: "order.cancelled",
    data: {
      orderId: order.orderId,
      orderObjectId: order.id,
      awb: order.awb,
      reason: reason ?? "Cancelled by user",
    },
  });

  logger.info(`${TAG} Order ${order.orderId} (AWB=${order.awb}) cancelled`);
  return updated;
}
