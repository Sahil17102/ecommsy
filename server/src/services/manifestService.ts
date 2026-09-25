import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { orders, pickupAddresses, trackingEvents } from "../db/schema.js";
import { getOrderLabel, getOrderInvoice, generateManifest as generateManifestPdf } from "./documents/index.js";
import { dispatchWebhookEvent } from "./webhook.js";
import { buildOrderEventData } from "./webhookEvents.js";
import { notifyAsync } from "./notificationService.js";
import { createProvider, resolveAccountForOrder, providerOrderType } from "./providers/index.js";
import { AppError } from "../utils/AppError.js";
import logger from "../config/logger.js";

const TAG = "[ManifestService]";

type OrderRow = typeof orders.$inferSelect;

export class ManifestError extends AppError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = "ManifestError";
  }
}

export interface ManifestResult {
  manifestUrl?: string;
  ordersProcessed: number;
  errors: Array<{ awb: string; error: string }>;
  /**
   * Orders that went through but NOT on a pickup of their own — e.g. Delhivery
   * answered `pr_exist` because the warehouse already has a pickup for that
   * date. The van is coming, but the courier will not show a fresh pickup for
   * these AWBs, so the UI must not report a plain success.
   */
  warnings: Array<{ awb: string; warning: string }>;
}

/**
 * Generate manifest for a list of orders.
 * This is THE key action after order creation — it does:
 * 1. Generate label (if missing)
 * 2. Generate invoice (if missing)
 * 3. Request pickup via courier API (if supported + not already requested)
 * 4. Update status → pickup_initiated (non-manual only)
 * 5. Generate manifest PDF
 */
/**
 * Concurrency for per-order manifest work. Each order does label + invoice
 * generation and a courier pickup API call, so we process a bounded number in
 * parallel — fast enough for hundreds of orders in one request without
 * hammering courier APIs (which can rate-limit) or exhausting DB connections.
 */
const MANIFEST_CONCURRENCY = 8;

/** Run `worker` over `items` with at most `concurrency` in flight at once. */
async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      await worker(items[idx]);
    }
  });
  await Promise.all(runners);
}

export async function manifestOrders(
  orderIds: string[],
  userId: string,
): Promise<ManifestResult> {
  if (orderIds.length === 0) {
    throw new ManifestError(400, "No order IDs provided");
  }

  const rows = await db
    .select()
    .from(orders)
    .where(and(inArray(orders.id, orderIds), eq(orders.userId, userId)));

  if (rows.length === 0) {
    throw new ManifestError(404, "No orders found");
  }

  const errors: Array<{ awb: string; error: string }> = [];
  const warnings: Array<{ awb: string; warning: string }> = [];
  const failedOrderIds = new Set<string>();
  let processedCount = 0;

  // Raise courier pickups FIRST, grouped by warehouse + date — see
  // requestPickupsForOrders. Doing it per order would fire N requests for the
  // same warehouse, and couriers (Delhivery included) reject all but the first.
  const pickupOutcomes = await requestPickupsForOrders(rows);

  // Process orders with bounded concurrency instead of one-at-a-time so a bulk
  // of hundreds completes in a fraction of the wall-clock time. Errors are
  // collected per order; one failure never aborts the batch.
  await mapWithConcurrency(rows, MANIFEST_CONCURRENCY, async (order) => {
    try {
      await processOrderForManifest(order, pickupOutcomes.get(order.id));
      processedCount++;
    } catch (err) {
      failedOrderIds.add(order.id);
      errors.push({
        awb: order.awb ?? "",
        error: (err as Error).message,
      });
      logger.error(`${TAG} Failed to manifest AWB=${order.awb}: ${(err as Error).message}`);
      return;
    }

    // Processed, but on somebody else's pickup — tell the caller instead of
    // folding it into the success count silently.
    const outcome = pickupOutcomes.get(order.id);
    if (outcome?.warning) {
      warnings.push({ awb: order.awb ?? "", warning: outcome.warning });
    }
  });

  // If every order failed, surface it as a real error response rather than a
  // 200 with ordersProcessed=0 — otherwise the client renders a success toast
  // for a manifest that never happened. Partial success (some processed, some
  // failed) still returns 200 below so the caller can show a per-order summary.
  if (processedCount === 0 && errors.length > 0) {
    throw new ManifestError(502, errors[0].error || "Manifest failed for all orders");
  }

  // Generate the manifest PDF for the successfully processed orders. The
  // document service splits it into one sheet per courier — a pickup manifest
  // is a per-carrier hand-off document, so a mixed-courier bulk must not print
  // as a single sheet with a "DTDC, DELHIVERY, …" carrier line.
  let manifestUrl: string | undefined;
  try {
    const successOrders = rows.filter((o) => !failedOrderIds.has(o.id));
    if (successOrders.length > 0) {
      await generateManifestPdf(successOrders.map((o) => o.id), userId);
      // generateManifestPdf returns { buffer, contentType } — it stores the
      // document key on each order itself.
      manifestUrl = `manifest-${Date.now()}`;
    }
  } catch (err) {
    logger.error(`${TAG} Failed to generate manifest PDF: ${(err as Error).message}`);
  }

  return { manifestUrl, ordersProcessed: processedCount, errors, warnings };
}

/**
 * Outcome of the courier pickup call for one order. `warning` is set when the
 * order is covered but no NEW pickup was raised for it — the caller reports
 * that as a warning, never as a clean success.
 */
type PickupOutcome = { success: boolean; error?: string; pickupId?: string; warning?: string };

/** Orders that still need a pickup raised (everything else is already covered). */
function needsPickup(order: OrderRow): boolean {
  const metadata = (order.metadata as Record<string, unknown> | null) ?? {};
  return !metadata.pickupRequestedAt;
}

/**
 * Raise courier pickups for a batch of orders, ONE request per
 * (account, warehouse, pickup date, pickup slot).
 *
 * Couriers schedule pickups per warehouse per day, not per shipment: Delhivery
 * answers a second request for the same warehouse/date with
 * `{ pr_exist: true, success: false }` — and does so over HTTP 201. Firing one
 * request per order therefore meant only the first shipment of the day was ever
 * really scheduled, and the rest were recorded as "pickup initiated" on the back
 * of a rejection. Grouping also lets us send the true `expected_package_count`
 * instead of a hardcoded 1.
 */
async function requestPickupsForOrders(rows: OrderRow[]): Promise<Map<string, PickupOutcome>> {
  const outcomes = new Map<string, PickupOutcome>();
  const pending = rows.filter(needsPickup);
  if (pending.length === 0) return outcomes;

  // Delhivery (and every other portal-registered courier) raises pickups against
  // the *registered warehouse name*, which we register as the pickup address
  // nickname (see pickupAddress.ts → registerPickupAddress). Resolve them all in
  // one query rather than per order.
  const addressIds = [...new Set(pending.map((o) => o.pickupAddressId).filter(Boolean))] as string[];
  const nicknameById = new Map<string, string>();
  if (addressIds.length > 0) {
    const addresses = await db
      .select({ id: pickupAddresses.id, nickname: pickupAddresses.nickname })
      .from(pickupAddresses)
      .where(inArray(pickupAddresses.id, addressIds));
    for (const a of addresses) nicknameById.set(a.id, a.nickname ?? "");
  }

  type PickupGroup = {
    orders: OrderRow[];
    pickupLocation?: string;
    pickupDate: string;
    pickupTime: string;
  };
  const groups = new Map<string, PickupGroup>();

  for (const order of pending) {
    const metadata = (order.metadata as Record<string, unknown> | null) ?? {};
    const pickupLocation = order.pickupAddressId ? nicknameById.get(order.pickupAddressId) : undefined;
    const pickupDate = (metadata.preferredPickupDate as string) ?? "";
    const pickupTime = (metadata.preferredPickupTime as string) ?? "";
    const key = [
      (metadata.serviceProviderId as string) ?? order.serviceProvider ?? "",
      providerOrderType(order.orderType),
      pickupLocation ?? "",
      pickupDate,
      pickupTime,
    ].join("|");

    const group = groups.get(key);
    if (group) group.orders.push(order);
    else groups.set(key, { orders: [order], pickupLocation, pickupDate, pickupTime });
  }

  for (const group of groups.values()) {
    const first = group.orders[0];
    const account = await resolveAccountForOrder(first);
    // Route heavy/B2B orders to their dedicated provider (e.g. Delhivery LTL),
    // matching how the order was booked. Without this, B2B pickups were raised
    // against the B2C courier API and never reached the carrier.
    const provider = account ? createProvider(account, providerOrderType(first.orderType)) : null;

    if (!provider) {
      logger.warn(
        `${TAG} No provider resolved for ${group.orders.length} order(s) (slug=${first.serviceProvider}) — skipping pickup request`,
      );
      for (const order of group.orders) outcomes.set(order.id, { success: true });
      continue;
    }

    const result = await provider.requestPickup(first.awb ?? "", {
      pickupDate: group.pickupDate,
      pickupTime: group.pickupTime,
      pickupLocation: group.pickupLocation,
      expectedPackageCount: group.orders.length,
    });

    if (!result.success) {
      logger.error(
        `${TAG} Pickup rejected by ${first.serviceProvider} for warehouse "${group.pickupLocation ?? "?"}" on ${group.pickupDate || "today"} — ${result.error ?? "Unknown error"}`,
      );
    }

    // No fresh pickup was raised — the courier reused one that already exists
    // for this warehouse/date, so it won't show a pickup against these AWBs.
    const warning = result.alreadyScheduled
      ? result.message ??
        `Courier reused an existing pickup for "${group.pickupLocation ?? "this warehouse"}"${result.pickupId ? ` (pickup ID ${result.pickupId})` : ""} — no new pickup was raised for this shipment`
      : undefined;
    if (warning) {
      logger.warn(`${TAG} ${first.serviceProvider}: ${warning} — ${group.orders.length} order(s) affected`);
    }

    for (const order of group.orders) {
      outcomes.set(order.id, {
        success: result.success,
        error: result.error,
        pickupId: result.pickupId,
        warning,
      });
    }
  }

  return outcomes;
}

/**
 * Process a single order for manifest:
 * 1. Generate label if missing
 * 2. Generate invoice if missing
 * 3. Apply the pickup outcome from {@link requestPickupsForOrders}
 * 4. Update status
 */
async function processOrderForManifest(order: OrderRow, pickup?: PickupOutcome): Promise<void> {
  const awb = order.awb ?? "";
  const isTemporaryAwb = awb.startsWith("TEMP-") || awb.startsWith("SHIP-") || awb.startsWith("MAN");

  if (!order.labelUrl && !isTemporaryAwb) {
    try {
      await getOrderLabel(order);
      logger.info(`${TAG} Label generated for AWB=${awb}`);
    } catch (err) {
      logger.warn(`${TAG} Label generation failed for AWB=${awb}: ${(err as Error).message}`);
    }
  }

  const metadata = (order.metadata as Record<string, unknown> | null) ?? {};
  const invoiceUrl = metadata.invoiceUrl as string | undefined;
  if (!invoiceUrl) {
    try {
      await getOrderInvoice(order);
      logger.info(`${TAG} Invoice generated for AWB=${awb}`);
    } catch (err) {
      logger.warn(`${TAG} Invoice generation failed for AWB=${awb}: ${(err as Error).message}`);
    }
  }

  const pickupRequestedAt = metadata.pickupRequestedAt as string | undefined;
  if (!pickupRequestedAt && pickup && !pickup.success) {
    // Abort the manifest for this order — do NOT advance to pickup_initiated
    // when the courier rejected the pickup. Otherwise our DB shows "manifested"
    // while the courier portal still has the shipment in "ready to ship".
    // The outer loop records this as an error and leaves the order in its
    // previous status so the user can retry.
    throw new ManifestError(
      502,
      `Pickup request rejected by ${order.serviceProvider}: ${pickup.error ?? "Unknown error"}`,
    );
  }

  // One timestamp shared by the DB row, the tracking event and the webhook, so
  // a subscriber's `manifested_at` matches what the panel shows.
  const manifestedAt = new Date();

  const [manifestedOrder] = await db
    .update(orders)
    .set({
      status: "pickup_initiated",
      manifestUrl: `manifested-${Date.now()}`,
      metadata: sql`COALESCE(${orders.metadata}, '{}'::jsonb) || ${JSON.stringify({
        pickupRequestedAt: manifestedAt.toISOString(),
        // Courier-side pickup id — the receipt that proves the pickup exists on
        // their portal, and what support quotes when a pickup is disputed.
        ...(pickup?.pickupId ? { courierPickupId: pickup.pickupId } : {}),
      })}::jsonb`,
      updatedAt: manifestedAt,
    })
    .where(eq(orders.id, order.id))
    .returning();

  await db.insert(trackingEvents).values({
    orderId: order.id,
    userId: order.userId,
    awb: order.awb,
    statusCode: "pickup_initiated",
    statusText: "Manifest Generated - Pickup Initiated",
    source: "system",
  });

  dispatchWebhookEvent(
    order.userId,
    "order.pickup_initiated",
    buildOrderEventData(manifestedOrder ?? order, {
      status: "pickup_initiated",
      previousStatus: order.status,
      eventTimestamp: manifestedAt,
      manifestedAt,
    }),
  );

  notifyAsync({
    userId: order.userId,
    event: "order.pickup_initiated",
    data: {
      orderId: order.orderId,
      orderObjectId: order.id,
      awb: order.awb,
      courier: order.serviceProvider,
    },
  });
}
