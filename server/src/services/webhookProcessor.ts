import { and, eq, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { orders, trackingEvents, ndrEvents, rtoEvents, wallets } from "../db/schema.js";
import { createWalletTransaction, TransactionType } from "./wallet.js";
import { dispatchWebhookEvent } from "./webhook.js";
import { buildOrderEventData } from "./webhookEvents.js";
import { notifyAsync } from "./notificationService.js";
import { resolveOrderStatus, statusToWebhookEvent } from "../config/courierStatusMap.js";
import { createCodRemittance } from "./codRemittance.js";
import logger from "../config/logger.js";

const TAG = "[WebhookProcessor]";

/**
 * Statuses no incoming courier scan may move an order out of.
 *
 * `cancelled` is terminal because couriers keep reporting scans on a shipment
 * after they accept its cancellation. Delhivery is the clearest case: it
 * records the cancellation as scan code DTUP-210 ("Seller cancelled the
 * order") while leaving `Status.Status` on "Manifested" — which resolves to
 * `booked` here and would silently resurrect a cancelled order into the
 * seller's active list, after we already refunded the freight.
 */
const TERMINAL_STATUSES = new Set<OrderStatus>(["cancelled"]);

type OrderRow = typeof orders.$inferSelect;
// Internal status union — mirrors the old OrderStatus type.
type OrderStatus = string;

// ── Normalized webhook payload ──

export interface NormalizedWebhookPayload {
  awb: string;
  provider: string;
  courierStatus: string;
  courierStatusCode?: string;
  remark?: string;
  location?: string;
  eventTimestamp?: string;
  chargedWeight?: number;
  rawPayload: Record<string, unknown>;
}

// ── Helpers for jsonb-stored fields ──

function readRate(o: OrderRow): { freightCharge: number; rto: number; totalCharge: number } {
  const r = (o.rateSnapshot ?? {}) as Record<string, number | undefined>;
  return {
    freightCharge: Number(r.freightCharge ?? 0),
    rto: Number(r.rto ?? 0),
    totalCharge: Number(r.totalCharge ?? 0),
  };
}

function readMetaFlag(o: OrderRow, key: string): unknown {
  const m = (o.metadata ?? {}) as Record<string, unknown>;
  return m[key];
}

// Patch jsonb `metadata` shallow-merging in JS, since the controller already
// reads the order doc fully.
function mergeMetadata(o: OrderRow, patch: Record<string, unknown>): Record<string, unknown> {
  const m = (o.metadata ?? {}) as Record<string, unknown>;
  return { ...m, ...patch };
}

// ── Main processor ──

export async function processWebhookEvent(
  payload: NormalizedWebhookPayload,
  source: "webhook" | "polling" = "webhook",
): Promise<{ processed: boolean; orderId?: string; newStatus?: string }> {
  const { awb, provider, courierStatus, courierStatusCode, remark, location, eventTimestamp, rawPayload } = payload;

  const startMs = Date.now();

  // 1. Find order
  const order = await db.query.orders.findFirst({ where: eq(orders.awb, awb) });
  if (!order) {
    logger.warn(`${TAG} Order not found for AWB=${awb} provider=${provider} courierStatus="${courierStatus}" — stale webhook?`, {
      awb, provider, courierStatus, source,
    });
    return { processed: false };
  }

  const orderId = order.id;
  const logCtx = { awb, orderId: order.orderId, provider, courierStatus, courierStatusCode, source };

  // 2. Resolve status
  const resolvedStatus = resolveOrderStatus(order.serviceProvider ?? "", courierStatus, remark || "", courierStatusCode);
  if (!resolvedStatus) {
    logger.info(`${TAG} Unmapped courier status — logging event only`, {
      ...logCtx, remark: remark?.slice(0, 200), location,
    });
    await logTrackingEvent(order, courierStatus, courierStatusCode, remark, location, eventTimestamp, rawPayload, source);
    return { processed: true, orderId };
  }

  // 3. Duplicate check — skip if already in this status (prevent double processing)
  if (order.status === resolvedStatus) {
    logger.info(`${TAG} Duplicate — AWB=${awb} already "${resolvedStatus}", event logged`, logCtx);
    await logTrackingEvent(order, courierStatus, courierStatusCode, remark, location, eventTimestamp, rawPayload, source);
    return { processed: true, orderId, newStatus: resolvedStatus };
  }

  // 3b. Terminal check — never move an order out of a terminal status. The
  //     event is still recorded so the tracking timeline stays complete.
  if (TERMINAL_STATUSES.has(order.status)) {
    logger.info(
      `${TAG} Ignoring "${resolvedStatus}" — AWB=${awb} is terminal at "${order.status}", event logged`,
      logCtx,
    );
    await logTrackingEvent(order, courierStatus, courierStatusCode, remark, location, eventTimestamp, rawPayload, source);
    return { processed: true, orderId, newStatus: order.status };
  }

  // 4. Build update object — the schema only has a subset of the legacy
  //    columns directly; everything else flows into `metadata` (jsonb).
  const updateFields: Record<string, unknown> = {
    status: resolvedStatus,
  };
  const metadataPatch: Record<string, unknown> = {};

  // 5. Handle special statuses
  await handleSpecialStatus(order, resolvedStatus, payload, updateFields, metadataPatch);

  // 6. Capture weight data if provided (no chargeableWeight column → metadata)
  if (payload.chargedWeight && payload.chargedWeight > 0) {
    metadataPatch.chargeableWeight = payload.chargedWeight;
  }

  // 7. Update order — fold metadataPatch into the row's metadata
  if (Object.keys(metadataPatch).length > 0) {
    updateFields.metadata = mergeMetadata(order, metadataPatch);
  }
  updateFields.updatedAt = new Date();
  // Conditional on the status we read at step 1. If a seller cancelled the
  // order while we were resolving this event, the row no longer matches and we
  // leave their cancellation standing instead of overwriting it.
  const updated = await db
    .update(orders)
    .set(updateFields)
    .where(and(eq(orders.id, order.id), eq(orders.status, order.status)))
    .returning();

  if (updated.length === 0) {
    logger.warn(
      `${TAG} Status changed underneath us — AWB=${awb} no longer "${order.status}", skipped update`,
      logCtx,
    );
    await logTrackingEvent(order, courierStatus, courierStatusCode, remark, location, eventTimestamp, rawPayload, source);
    return { processed: true, orderId };
  }

  // 8. Log tracking event
  await logTrackingEvent(order, courierStatus, courierStatusCode, remark, location, eventTimestamp, rawPayload, source);

  // 9. Dispatch outgoing webhook to merchant
  const webhookEvent = statusToWebhookEvent(resolvedStatus);
  if (webhookEvent) {
    const delivery = (order.deliveryAddress ?? {}) as Record<string, unknown>;
    dispatchWebhookEvent(
      order.userId,
      webhookEvent,
      buildOrderEventData(updated[0] ?? order, {
        status: resolvedStatus,
        previousStatus: order.status,
        courierStatus,
        courierStatusCode,
        location,
        remark,
        eventTimestamp,
        ndr:
          resolvedStatus === "ndr"
            ? { reason: remark ?? courierStatus ?? null, nextAction: null }
            : null,
      }),
    );

    notifyAsync({
      userId: order.userId,
      event: webhookEvent,
      data: {
        orderId: order.orderId,
        orderObjectId: order.id,
        awb: order.awb,
        courier: order.serviceProvider,
        location: location ?? "",
        reason: remark ?? "",
        city: (delivery.city as string | undefined) ?? "",
      },
    });
  }

  const durationMs = Date.now() - startMs;
  logger.info(`${TAG} AWB=${awb} status ${order.status} → ${resolvedStatus} (${durationMs}ms)`, {
    ...logCtx, previousStatus: order.status, newStatus: resolvedStatus,
    durationMs, remark: remark?.slice(0, 200), location,
  });
  return { processed: true, orderId, newStatus: resolvedStatus };
}

// ── Special status handlers ──

async function handleSpecialStatus(
  order: OrderRow,
  newStatus: OrderStatus,
  payload: NormalizedWebhookPayload,
  updateFields: Record<string, unknown>,
  metadataPatch: Record<string, unknown>,
): Promise<void> {
  const rate = readRate(order);
  // paymentMode is the schema-native field; old code referenced `paymentType`.
  const paymentMode = order.paymentMode ?? "";
  const isCod = paymentMode === "cod";

  switch (newStatus) {
    case "delivered":
      updateFields.deliveredAt = new Date();
      // COD: auto-create remittance record for tracking
      if (isCod && !readMetaFlag(order, "codCollected")) {
        metadataPatch.codCollected = false; // will be set to true by admin
        try {
          const codAmount = Number(order.codAmount ?? 0);
          // orderType in schema is varchar lowercase (b2b/b2c); the remittance
          // service expects uppercase. Coerce here.
          const orderTypeUpper = (order.orderType ?? "b2c").toUpperCase() as "B2B" | "B2C";
          await createCodRemittance({
            userId: order.userId,
            orderId: order.id,
            orderType: orderTypeUpper,
            orderNumber: order.orderId,
            awbNumber: order.awb ?? "",
            courierPartner: order.serviceProvider ?? "",
            codAmount,
          });
        } catch (err) {
          logger.error(`${TAG} Failed to create COD remittance for AWB=${order.awb}: ${(err as Error).message}`);
        }
      }
      break;

    case "ndr":
      // ndrReason / ndrAttemptedAt don't exist as columns → metadata
      metadataPatch.ndrReason = payload.remark || payload.courierStatus;
      metadataPatch.ndrAttemptedAt = new Date().toISOString();
      // Create NDR event record
      await db.insert(ndrEvents).values({
        orderId: order.id,
        userId: order.userId,
        awb: order.awb,
        status: payload.courierStatus,
        reason: payload.remark || payload.courierStatus || "Delivery failed",
        location: payload.location,
        attemptDate: payload.eventTimestamp ? new Date(payload.eventTimestamp) : new Date(),
        source: "webhook",
        rawPayload: payload.rawPayload,
      });
      break;

    case "rto_initiated":
      metadataPatch.rtoStatus = "initiated";
      // Debit wallet for RTO charges if not already billed
      if (!readMetaFlag(order, "rtoBilled") && rate.rto > 0) {
        try {
          const wallet = await db.query.wallets.findFirst({
            where: eq(wallets.userId, order.userId),
          });
          if (wallet) {
            await createWalletTransaction({
              walletId: wallet.id,
              amount: rate.rto,
              type: TransactionType.DEBIT,
              reason: "RTO Charges",
              ref: order.id,
              meta: {
                awb: order.awb,
                orderId: order.orderId,
                courier_name: order.serviceProvider,
                rto_charges: rate.rto,
              },
            });
            metadataPatch.rtoBilled = true;
            metadataPatch.rtoCharges = rate.rto;
          }
        } catch (err) {
          logger.error(`${TAG} Failed to debit RTO charges for AWB=${order.awb}: ${(err as Error).message}`);
        }
      }
      await db.insert(rtoEvents).values({
        orderId: order.id,
        userId: order.userId,
        awb: order.awb,
        status: payload.courierStatus,
        phase: "initiated",
        reason: payload.remark || "RTO initiated by courier",
        source: "webhook",
        rtoCharges: String(rate.rto || 0),
        rawPayload: payload.rawPayload,
      });
      break;

    case "rto_in_transit":
      metadataPatch.rtoStatus = "in_transit";
      await db.insert(rtoEvents).values({
        orderId: order.id,
        userId: order.userId,
        awb: order.awb,
        status: payload.courierStatus,
        phase: "in_transit",
        source: "webhook",
        rawPayload: payload.rawPayload,
      });
      break;

    case "rto_delivered":
      metadataPatch.rtoStatus = "delivered";
      metadataPatch.rtoReturnedAt = new Date().toISOString();
      await db.insert(rtoEvents).values({
        orderId: order.id,
        userId: order.userId,
        awb: order.awb,
        status: payload.courierStatus,
        phase: "delivered",
        source: "webhook",
        rawPayload: payload.rawPayload,
      });
      break;

    case "cancelled":
      updateFields.cancelledAt = new Date();
      // Refund freight to wallet
      try {
        const wallet = await db.query.wallets.findFirst({
          where: eq(wallets.userId, order.userId),
        });
        if (wallet) {
          const refundAmount = rate.freightCharge || rate.totalCharge || 0;
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
              },
            });
          }
        }
      } catch (err) {
        logger.error(`${TAG} Failed to refund freight for AWB=${order.awb}: ${(err as Error).message}`);
      }
      break;

    case "lost":
      // Credit wallet (platform liability)
      try {
        const wallet = await db.query.wallets.findFirst({
          where: eq(wallets.userId, order.userId),
        });
        if (wallet) {
          const creditAmount = rate.totalCharge || 0;
          if (creditAmount > 0) {
            await createWalletTransaction({
              walletId: wallet.id,
              amount: creditAmount,
              type: TransactionType.CREDIT,
              reason: "Shipment Lost - Platform Refund",
              ref: order.id,
              meta: {
                awb: order.awb,
                orderId: order.orderId,
                courier_name: order.serviceProvider,
              },
            });
          }
        }
      } catch (err) {
        logger.error(`${TAG} Failed to credit lost shipment refund for AWB=${order.awb}: ${(err as Error).message}`);
      }
      break;

    case "shipped":
    case "pickup_initiated":
      // No `shippedAt` column in the schema — record in metadata if not set.
      if (!readMetaFlag(order, "shippedAt")) {
        metadataPatch.shippedAt = new Date().toISOString();
      }
      break;
  }
}

// ── Tracking event logger ──

async function logTrackingEvent(
  order: OrderRow,
  courierStatus: string,
  courierStatusCode: string | undefined,
  remark: string | undefined,
  location: string | undefined,
  eventTimestamp: string | undefined,
  rawPayload: Record<string, unknown>,
  source: "webhook" | "polling",
): Promise<void> {
  try {
    // Dedup guard: polling re-fetches the same scan every cycle, so without this
    // a shipment sitting in one status accrues an identical row on every poll
    // (every 3h). Skip if an event for this order with the same courier scan
    // already exists. A genuinely new scan carries a new eventTimestamp (or a
    // changed status/code), so real progress is still logged.
    const parsedTs = eventTimestamp ? new Date(eventTimestamp) : undefined;
    const existing = await db.query.trackingEvents.findFirst({
      where: and(
        eq(trackingEvents.orderId, order.id),
        eq(trackingEvents.statusText, courierStatus),
        parsedTs
          ? eq(trackingEvents.eventTimestamp, parsedTs)
          : eq(trackingEvents.statusCode, courierStatusCode || courierStatus),
      ),
      columns: { id: true },
    });

    if (existing) {
      logger.info(`${TAG} Skipping duplicate tracking event for AWB=${order.awb} status="${courierStatus}"`);
      return;
    }

    await db.insert(trackingEvents).values({
      orderId: order.id,
      userId: order.userId,
      awb: order.awb,
      statusCode: courierStatusCode || courierStatus,
      statusText: courierStatus,
      location,
      remarks: remark,
      source,
      rawPayload,
      courierEventCode: courierStatusCode,
      eventTimestamp: parsedTs,
    });
  } catch (err) {
    logger.error(`${TAG} Failed to log tracking event for AWB=${order.awb}: ${(err as Error).message}`);
  }
}

// keep sql reference (unused otherwise)
void sql;

// ── Courier-specific payload normalizers (unchanged from Mongoose version) ──

export function normalizeDelhiveryWebhook(body: Record<string, unknown>): NormalizedWebhookPayload | null {
  const shipment = body.Shipment as Record<string, unknown> | undefined;
  if (!shipment) return null;

  const status = shipment.Status as Record<string, unknown> | undefined;
  if (!status) return null;

  return {
    awb: (shipment.AWB as string) || "",
    provider: "delhivery",
    courierStatus: (status.Status as string) || "",
    courierStatusCode: (status.StatusType as string) || undefined,
    remark: (status.Instructions as string) || undefined,
    location: (status.StatusLocation as string) || undefined,
    eventTimestamp: (status.StatusDateTime as string) || undefined,
    rawPayload: body,
  };
}

export function normalizeDelhiveryB2bWebhook(body: Record<string, unknown>): NormalizedWebhookPayload | null {
  const lr =
    (body.lrn as string) ||
    (body.LRN as string) ||
    (body.lr_number as string) ||
    (body.lrNumber as string) ||
    (body.awb as string) ||
    (body.AWB as string);

  if (!lr) return null;

  const status =
    (body.status as string) ||
    (body.Status as string) ||
    (body.current_status as string) ||
    "";

  const statusType =
    (body.status_type as string) ||
    (body.StatusType as string) ||
    (body.statusType as string) ||
    undefined;

  return {
    awb: lr,
    provider: "delhivery_b2b",
    courierStatus: status,
    courierStatusCode: statusType,
    remark: (body.remarks as string) || (body.Remarks as string) || (body.instructions as string) || undefined,
    location: (body.location as string) || (body.Location as string) || undefined,
    eventTimestamp:
      (body.scan_datetime as string) ||
      (body.EventDateTime as string) ||
      (body.event_time as string) ||
      undefined,
    rawPayload: body,
  };
}

export function normalizeEkartWebhook(body: Record<string, unknown>): NormalizedWebhookPayload | null {
  const trackingId = (body.id as string) || (body.wbn as string);
  if (!trackingId) return null;

  const ctime = body.ctime as number | string | undefined;
  const eventTimestamp =
    typeof ctime === "number"
      ? new Date(ctime).toISOString()
      : typeof ctime === "string" && ctime
        ? ctime
        : undefined;

  return {
    awb: String(trackingId),
    provider: "ekart",
    courierStatus: (body.status as string) || "",
    remark: (body.desc as string) || undefined,
    location: (body.location as string) || undefined,
    eventTimestamp,
    rawPayload: body,
  };
}

export function normalizeXpressbeesWebhook(body: Record<string, unknown>): NormalizedWebhookPayload | null {
  const awb = (body.awb_number as string) || (body.awb as string);
  if (!awb) return null;

  return {
    awb,
    provider: "xpressbees",
    courierStatus: (body.status as string) || "",
    courierStatusCode: (body.status_code as string) || undefined,
    remark: (body.message as string) || (body.remark as string) || undefined,
    location: (body.location as string) || undefined,
    eventTimestamp: (body.event_time as string) || undefined,
    rawPayload: body,
  };
}

export function normalizeShipexTracking(
  awb: string,
  trackingData: Record<string, unknown>,
): NormalizedWebhookPayload | null {
  const tracking = trackingData.tracking as Array<Record<string, unknown>> | undefined;
  const latestEvent = tracking?.[tracking.length - 1];

  return {
    awb,
    provider: "shipexindia",
    courierStatus: (trackingData.status as string) || (latestEvent?.status as string) || "",
    remark: (latestEvent?.instructions as string) || undefined,
    location: (latestEvent?.location as string) || undefined,
    eventTimestamp: (latestEvent?.dateTime as string) || undefined,
    rawPayload: trackingData,
  };
}

export function normalizeXpressbeesTracking(
  awb: string,
  trackingData: Record<string, unknown>,
): NormalizedWebhookPayload | null {
  const root =
    (trackingData.data as Record<string, unknown> | undefined) ??
    trackingData;

  const history =
    (root.history as Array<Record<string, unknown>> | undefined) ??
    (root.tracking as Array<Record<string, unknown>> | undefined) ??
    (root.scans as Array<Record<string, unknown>> | undefined);

  const latest = history?.[history.length - 1];

  const status =
    (root.current_status as string) ||
    (root.status as string) ||
    (latest?.status as string) ||
    "";

  if (!status) return null;

  return {
    awb,
    provider: "xpressbees",
    courierStatus: status,
    courierStatusCode: (root.status_code as string) || (latest?.status_code as string) || undefined,
    remark: (latest?.message as string) || (latest?.remark as string) || undefined,
    location: (latest?.location as string) || undefined,
    eventTimestamp:
      (latest?.event_time as string) ||
      (latest?.date_time as string) ||
      (latest?.scan_datetime as string) ||
      undefined,
    rawPayload: trackingData,
  };
}

export function normalizeDelhiveryTracking(
  awb: string,
  trackingData: Record<string, unknown>,
): NormalizedWebhookPayload | null {
  const shipments = trackingData.ShipmentData as Array<Record<string, unknown>> | undefined;
  const first = shipments?.[0];
  const shipment = (first?.Shipment as Record<string, unknown> | undefined) ?? undefined;
  if (!shipment) return null;

  const status = shipment.Status as Record<string, unknown> | undefined;
  if (!status) return null;

  return {
    awb,
    provider: "delhivery",
    courierStatus: (status.Status as string) || "",
    courierStatusCode: (status.StatusType as string) || undefined,
    remark: (status.Instructions as string) || undefined,
    location: (status.StatusLocation as string) || undefined,
    eventTimestamp: (status.StatusDateTime as string) || undefined,
    rawPayload: trackingData,
  };
}

/**
 * Parse DTDC's split date/time into an ISO string.
 * DTDC sends the date as `DDMMYYYY` (e.g. "29052025") and the time as either
 * `HHMM` (e.g. "1143") or `HHMMSS` (e.g. "141424"). Interpreted as IST since
 * DTDC's scan timestamps are local. Returns undefined if the date is unusable.
 */
function parseDtdcDateTime(dateStr?: string, timeStr?: string): string | undefined {
  const d = (dateStr || "").trim();
  if (!/^\d{8}$/.test(d)) return undefined;
  const day = d.slice(0, 2);
  const month = d.slice(2, 4);
  const year = d.slice(4, 8);

  const t = (timeStr || "").trim().padStart(4, "0");
  const hh = t.slice(0, 2);
  const mm = t.slice(2, 4);
  const ss = t.length >= 6 ? t.slice(4, 6) : "00";

  // Build an IST wall-clock time and convert to a real instant via the +05:30 offset.
  const iso = `${year}-${month}-${day}T${hh}:${mm}:${ss}+05:30`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

/**
 * Normalize a DTDC **Pull** tracking response (from `DtdcProvider.trackOrder`)
 * into a NormalizedWebhookPayload.
 *
 * DTDC's response carries two surfaces:
 *   • `trackHeader`   — coarse, current summary status (strStatus, strStatusTransOn…)
 *   • `trackDetails[]`— the full scan history, chronological ascending, each with
 *                       a stable scan CODE (`strCode` — BKD/OUTDLV/DLV/RTOIPMF…),
 *                       a description (`strAction`), location (`strOrigin`),
 *                       remark (`sTrRemarks`), and split date/time.
 *
 * We drive off the LATEST scan (max timestamp, falling back to array order) so a
 * fresh event is picked up each poll. `courierStatusCode` = the scan code (the
 * authoritative signal the resolver keys on); `courierStatus` = the description.
 */
export function normalizeDtdcTracking(
  awb: string,
  trackingData: Record<string, unknown>,
): NormalizedWebhookPayload | null {
  const details = trackingData.trackDetails as Array<Record<string, unknown>> | undefined;
  const header = trackingData.trackHeader as Record<string, unknown> | undefined;

  // Prefer the most recent scan from the detail history.
  let latest: Record<string, unknown> | undefined;
  if (Array.isArray(details) && details.length > 0) {
    latest = details.reduce((best, cur) => {
      const bt = parseDtdcDateTime(best.strActionDate as string, best.strActionTime as string) ?? "";
      const ct = parseDtdcDateTime(cur.strActionDate as string, cur.strActionTime as string) ?? "";
      // >= so that on ties the later array entry (DTDC appends chronologically) wins.
      return ct >= bt ? cur : best;
    });
  }

  if (latest) {
    const code = (latest.strCode as string) || undefined;
    const action = (latest.strAction as string) || "";
    return {
      awb,
      provider: "dtdc",
      // Feed the description as the human-readable status, the scan code as the
      // authoritative code. If the description is blank, fall back to the code.
      courierStatus: action || code || "",
      courierStatusCode: code,
      remark:
        (latest.sTrRemarks as string) ||
        (latest.strRemarks as string) ||
        undefined,
      location: (latest.strOrigin as string) || undefined,
      eventTimestamp: parseDtdcDateTime(
        latest.strActionDate as string,
        latest.strActionTime as string,
      ),
      rawPayload: trackingData,
    };
  }

  // No scan history yet — fall back to the header summary if present.
  if (header) {
    const status = (header.strStatus as string) || "";
    if (!status) return null;
    return {
      awb,
      provider: "dtdc",
      courierStatus: status,
      remark: (header.strRemarks as string) || undefined,
      location: (header.strDestination as string) || (header.strOrigin as string) || undefined,
      eventTimestamp: parseDtdcDateTime(
        header.strStatusTransOn as string,
        header.strStatusTransTime as string,
      ),
      rawPayload: trackingData,
    };
  }

  return null;
}

/**
 * Normalize a DTDC **Push** tracking payload (POST'd by DTDC's cron-based push
 * service to /courier-webhooks/dtdc).
 *
 * NOTE the field semantics DIFFER from the Pull API: on the push payload the
 * scan CODE lives in `shipmentStatus[].strAction` (e.g. "DLV", "NONDLV") and the
 * human description lives in `strActionDesc`. AWB comes from `shipment.strShipmentNo`.
 */
export function normalizeDtdcPush(
  body: Record<string, unknown>,
): NormalizedWebhookPayload | null {
  const shipment = body.shipment as Record<string, unknown> | undefined;
  const statusArr = body.shipmentStatus as Array<Record<string, unknown>> | undefined;

  const awb =
    (shipment?.strShipmentNo as string) ||
    (body.strShipmentNo as string) ||
    "";
  if (!awb) return null;

  // Push events are incremental; a payload usually carries one status entry, but
  // if several arrive, pick the most recent by timestamp.
  let evt: Record<string, unknown> | undefined;
  if (Array.isArray(statusArr) && statusArr.length > 0) {
    evt = statusArr.reduce((best, cur) => {
      const bt = parseDtdcDateTime(best.strActionDate as string, best.strActionTime as string) ?? "";
      const ct = parseDtdcDateTime(cur.strActionDate as string, cur.strActionTime as string) ?? "";
      return ct >= bt ? cur : best;
    });
  }
  if (!evt) return null;

  const code = (evt.strAction as string) || undefined;       // push: strAction = CODE
  const desc = (evt.strActionDesc as string) || "";          // push: strActionDesc = description

  return {
    awb,
    provider: "dtdc",
    courierStatus: desc || code || "",
    courierStatusCode: code,
    remark: (evt.strRemarks as string) || undefined,
    location: (evt.strOrigin as string) || undefined,
    eventTimestamp: parseDtdcDateTime(
      evt.strActionDate as string,
      evt.strActionTime as string,
    ),
    rawPayload: body,
  };
}

export function normalizeDelhiveryB2bTracking(
  awb: string,
  trackingData: Record<string, unknown>,
): NormalizedWebhookPayload | null {
  const root =
    (trackingData.data as Record<string, unknown> | undefined) ??
    trackingData;

  const status =
    (root.status as string) ||
    (root.current_status as string) ||
    (root.Status as string) ||
    "";

  if (!status) return null;

  const statusType =
    (root.status_type as string) ||
    (root.StatusType as string) ||
    (root.statusType as string) ||
    undefined;

  const scans = root.scans as Array<Record<string, unknown>> | undefined;
  const latest = scans?.[scans.length - 1];

  return {
    awb,
    provider: "delhivery_b2b",
    courierStatus: status,
    courierStatusCode: statusType,
    remark:
      (latest?.remarks as string) ||
      (root.remarks as string) ||
      (root.instructions as string) ||
      undefined,
    location:
      (latest?.location as string) ||
      (root.current_location as string) ||
      (root.location as string) ||
      undefined,
    eventTimestamp:
      (latest?.scan_datetime as string) ||
      (root.last_scan_datetime as string) ||
      (root.scan_datetime as string) ||
      undefined,
    rawPayload: trackingData,
  };
}
