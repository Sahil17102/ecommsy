import { Router, type Request, type Response, type NextFunction } from "express";
import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { orders, serviceProviders, trackingEvents } from "../db/schema.js";
import {
  processWebhookEvent,
  normalizeDelhiveryWebhook,
  normalizeDelhiveryB2bWebhook,
  normalizeEkartWebhook,
  normalizeXpressbeesWebhook,
  normalizeDtdcPush,
} from "../services/webhookProcessor.js";
import logger from "../config/logger.js";

const router = Router();
const TAG = "[CourierWebhook]";

// ── HMAC verification (Ekart Elite) ─────────────────────────────
//
// The Elite Ekart webhook docs state that the registered `secret` is used to
// "hash the webhook post body with for calculating h-mac". The header name and
// algorithm are not formally specified, so we accept the common conventions:
//   - `x-hmac`, `x-hmac-sha256`, `x-signature`, `x-ekart-signature`
//   - HMAC-SHA256 of the raw body, encoded as hex (lowercase)
//
// Behaviour:
//   - If EKART_WEBHOOK_SECRET is not set, verification is skipped (logged as a
//     warning) so dev/staging environments aren't broken before secrets are
//     provisioned.
//   - If a secret IS set but the signature is missing or mismatches, we reject
//     with 401.

const EKART_SIGNATURE_HEADERS = [
  "x-hmac",
  "x-hmac-sha256",
  "x-signature",
  "x-ekart-signature",
];

function verifyEkartHmac(req: Request): { ok: boolean; reason?: string } {
  const secret = process.env.EKART_WEBHOOK_SECRET;
  if (!secret) {
    logger.warn(`${TAG} EKART_WEBHOOK_SECRET not set — skipping HMAC verification`);
    return { ok: true };
  }

  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!rawBody) {
    return { ok: false, reason: "Missing raw body for HMAC verification" };
  }

  let provided: string | undefined;
  for (const h of EKART_SIGNATURE_HEADERS) {
    const v = req.headers[h];
    if (typeof v === "string" && v.length > 0) {
      provided = v.trim();
      break;
    }
  }
  if (!provided) {
    return { ok: false, reason: "Missing HMAC signature header" };
  }

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  // Strip optional "sha256=" prefix some senders include.
  const normalized = provided.toLowerCase().replace(/^sha256=/, "");

  const a = Buffer.from(normalized, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "HMAC signature mismatch" };
  }
  return { ok: true };
}

function ekartHmacMiddleware(req: Request, res: Response, next: NextFunction) {
  const result = verifyEkartHmac(req);
  if (!result.ok) {
    logger.warn(`${TAG} Ekart HMAC verification failed: ${result.reason}`, {
      provider: "ekart", ip: req.ip,
    });
    return res.status(401).json({ ok: false, error: result.reason });
  }
  return next();
}

/**
 * POST /courier-webhooks/delhivery
 * Receives push notifications from Delhivery.
 * Delhivery sends: { Shipment: { Status: {...}, AWB, ReferenceNo } }
 */
router.post("/delhivery", async (req: Request, res: Response) => {
  const startMs = Date.now();
  try {
    const awbHint = (req.body?.Shipment?.AWB as string) || "unknown";
    logger.info(`${TAG} Delhivery webhook received AWB=${awbHint}`, {
      provider: "delhivery", awb: awbHint, ip: req.ip,
    });
    const payload = normalizeDelhiveryWebhook(req.body);
    if (!payload) {
      logger.warn(`${TAG} Invalid Delhivery payload — missing Shipment or Status`, {
        provider: "delhivery", bodyKeys: Object.keys(req.body),
      });
      return res.status(200).json({ ok: true, message: "Invalid payload, skipped" });
    }

    const result = await processWebhookEvent(payload, "webhook");
    logger.info(`${TAG} Delhivery webhook processed in ${Date.now() - startMs}ms`, {
      provider: "delhivery", awb: payload.awb, ...result,
    });
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    logger.error(`${TAG} Delhivery webhook error after ${Date.now() - startMs}ms: ${(err as Error).message}`, {
      provider: "delhivery", error: (err as Error).message, stack: (err as Error).stack?.slice(0, 500),
    });
    return res.status(200).json({ ok: true, error: "Processing error" });
  }
});

// ── Ekart (Elite Ekart Logistics) ───────────────────────────────
//
// The Elite webhook supports three topics, all delivered as POST requests:
//   - track_updated      → status updates for a shipment
//   - shipment_created   → confirms shipment creation, gives Ekart tracking id
//   - shipment_recreated → re-shipped order, returns a NEW tracking id we must
//                          persist on the order or future track events miss
//
// Topics share the same URL when registered together, so we discriminate by
// payload shape:
//   - track_updated:    has `status` + `desc` + `ctime`
//   - created/recreated: has `vendor` + `channelId` (no `status`)
//
// Operators can also register one webhook per topic by pointing each topic at
// the explicit sub-paths (`/ekart/track`, `/ekart/created`, `/ekart/recreated`).

async function handleTrackUpdated(req: Request, res: Response, startMs: number) {
  const trackingHint = (req.body?.id as string) || (req.body?.wbn as string) || "unknown";
  logger.info(`${TAG} Ekart track_updated received id=${trackingHint} status="${req.body?.status}"`, {
    provider: "ekart", trackingId: trackingHint, status: req.body?.status, ip: req.ip,
  });
  const payload = normalizeEkartWebhook(req.body);
  if (!payload) {
    logger.warn(`${TAG} Invalid Ekart track_updated payload — missing id/wbn`, {
      provider: "ekart", bodyKeys: Object.keys(req.body),
    });
    return res.status(200).json({ ok: true, message: "Invalid payload, skipped" });
  }

  const result = await processWebhookEvent(payload, "webhook");
  logger.info(`${TAG} Ekart track_updated processed in ${Date.now() - startMs}ms`, {
    provider: "ekart", awb: payload.awb, ...result,
  });
  return res.status(200).json({ ok: true, ...result });
}

/**
 * Handle `shipment_created` and `shipment_recreated` payloads.
 * Both share the shape: { id, wbn, vendor, orderNumber, channelId }
 *
 * Looks up the order by orderNumber (= our internal `orderId`) and updates the
 * stored AWB to the new tracking id. Required for the recreated case so future
 * track_updated events for the new shipment can find the order.
 */
async function handleShipmentCreatedOrRecreated(
  req: Request,
  res: Response,
  startMs: number,
  topicHint: "shipment_created" | "shipment_recreated" | "auto",
) {
  const newAwb = (req.body?.id as string) || "";
  const orderNumber = (req.body?.orderNumber as string) || "";
  const wbn = (req.body?.wbn as string) || "";

  if (!newAwb || !orderNumber) {
    logger.warn(`${TAG} Invalid Ekart ${topicHint} payload — missing id/orderNumber`, {
      provider: "ekart", bodyKeys: Object.keys(req.body),
    });
    return res.status(200).json({ ok: true, message: "Invalid payload, skipped" });
  }

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.orderId, orderNumber), eq(orders.serviceProvider, "ekart")),
  });
  if (!order) {
    logger.warn(`${TAG} Ekart ${topicHint} — order not found for orderNumber=${orderNumber}`, {
      provider: "ekart", orderNumber, newAwb,
    });
    return res.status(200).json({ ok: true, message: "Order not found, skipped" });
  }

  const previousAwb = order.awb;
  const isRecreation = previousAwb && previousAwb !== newAwb;
  const resolvedTopic = topicHint === "auto" ? (isRecreation ? "shipment_recreated" : "shipment_created") : topicHint;

  if (previousAwb !== newAwb) {
    await db.update(orders).set({ awb: newAwb, updatedAt: new Date() }).where(eq(orders.id, order.id));
  }

  // Audit-log the creation/recreation event so the tracking timeline reflects it.
  try {
    await db.insert(trackingEvents).values({
      orderId: order.id,
      userId: order.userId,
      awb: newAwb,
      statusCode: resolvedTopic,
      statusText: isRecreation ? `Shipment recreated (was ${previousAwb})` : "Shipment created",
      remarks: `vendor=${req.body?.vendor || "EKART"} wbn=${wbn} channelId=${req.body?.channelId || ""}`,
      source: "webhook",
      rawPayload: req.body,
    });
  } catch (err) {
    logger.error(`${TAG} Failed to log Ekart ${resolvedTopic} tracking event: ${(err as Error).message}`);
  }

  logger.info(`${TAG} Ekart ${resolvedTopic} processed in ${Date.now() - startMs}ms`, {
    provider: "ekart", orderNumber, previousAwb, newAwb, isRecreation,
  });
  return res.status(200).json({
    ok: true,
    topic: resolvedTopic,
    orderId: order.id,
    previousAwb,
    newAwb,
  });
}

/**
 * POST /courier-webhooks/ekart
 * Generic Ekart webhook receiver — auto-detects topic by payload shape.
 * Use this when a single webhook URL is registered for all topics.
 */
router.post("/ekart", ekartHmacMiddleware, async (req: Request, res: Response) => {
  const startMs = Date.now();
  try {
    const body = (req.body || {}) as Record<string, unknown>;

    // Discriminate by payload shape:
    // shipment_created/recreated → has `vendor` and `channelId`, no `status`
    // track_updated              → has `status` (and `desc`/`ctime`)
    if (typeof body.status === "string" && (body.id || body.wbn)) {
      return await handleTrackUpdated(req, res, startMs);
    }
    if (body.vendor && body.channelId) {
      return await handleShipmentCreatedOrRecreated(req, res, startMs, "auto");
    }

    logger.warn(`${TAG} Unrecognised Ekart webhook payload shape`, {
      provider: "ekart", bodyKeys: Object.keys(body),
    });
    return res.status(200).json({ ok: true, message: "Unrecognised payload shape, skipped" });
  } catch (err) {
    logger.error(`${TAG} Ekart webhook error after ${Date.now() - startMs}ms: ${(err as Error).message}`, {
      provider: "ekart", error: (err as Error).message, stack: (err as Error).stack?.slice(0, 500),
    });
    return res.status(200).json({ ok: true, error: "Processing error" });
  }
});

/** POST /courier-webhooks/ekart/track — explicit `track_updated` endpoint. */
router.post("/ekart/track", ekartHmacMiddleware, async (req: Request, res: Response) => {
  const startMs = Date.now();
  try {
    return await handleTrackUpdated(req, res, startMs);
  } catch (err) {
    logger.error(`${TAG} Ekart track_updated error: ${(err as Error).message}`);
    return res.status(200).json({ ok: true, error: "Processing error" });
  }
});

/** POST /courier-webhooks/ekart/created — explicit `shipment_created` endpoint. */
router.post("/ekart/created", ekartHmacMiddleware, async (req: Request, res: Response) => {
  const startMs = Date.now();
  try {
    return await handleShipmentCreatedOrRecreated(req, res, startMs, "shipment_created");
  } catch (err) {
    logger.error(`${TAG} Ekart shipment_created error: ${(err as Error).message}`);
    return res.status(200).json({ ok: true, error: "Processing error" });
  }
});

/** POST /courier-webhooks/ekart/recreated — explicit `shipment_recreated` endpoint. */
router.post("/ekart/recreated", ekartHmacMiddleware, async (req: Request, res: Response) => {
  const startMs = Date.now();
  try {
    return await handleShipmentCreatedOrRecreated(req, res, startMs, "shipment_recreated");
  } catch (err) {
    logger.error(`${TAG} Ekart shipment_recreated error: ${(err as Error).message}`);
    return res.status(200).json({ ok: true, error: "Processing error" });
  }
});

// ── Delhivery B2B (LTL) ─────────────────────────────────────────
//
// Two endpoints:
//
//   1. POST /courier-webhooks/delhivery-b2b
//      Generic shipment status push (forward + return + lost). Uses the
//      `delhivery_b2b` status map for resolution.
//
//   2. POST /courier-webhooks/delhivery-b2b/manifest-callback
//      Async manifestation callback. Delhivery's manifest API returns a
//      Job ID synchronously and pushes the assigned LR + per-box AWBs to
//      this URL once the shipment is provisioned. The receiver looks up the
//      order by `JOB:<jobId>` placeholder AWB and replaces it with the real
//      LR number.
//
// IMPORTANT: register only `/courier-webhooks/delhivery-b2b` as the status
// push URL with Delhivery (lastmile-integration@delhivery.com), and the
// manifest callback URL via the `callback_url` field on the manifest API
// (or via the credentials.b2b.webhookCallbackUrl that the provider sends
// automatically). Delhivery needs 4-5 business days to wire the status push.

router.post("/delhivery-b2b", async (req: Request, res: Response) => {
  const startMs = Date.now();
  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const lrHint = (body.lrn || body.LRN || body.lr_number || body.awb || "unknown") as string;
    logger.info(`${TAG} Delhivery B2B webhook received LR=${lrHint} status="${body.status || body.Status}"`, {
      provider: "delhivery_b2b", lr: lrHint, status: body.status || body.Status, ip: req.ip,
    });

    const payload = normalizeDelhiveryB2bWebhook(body);
    if (!payload) {
      logger.warn(`${TAG} Invalid Delhivery B2B payload — missing LR/status`, {
        provider: "delhivery_b2b", bodyKeys: Object.keys(body),
      });
      return res.status(200).json({ ok: true, message: "Invalid payload, skipped" });
    }

    const result = await processWebhookEvent(payload, "webhook");
    logger.info(`${TAG} Delhivery B2B webhook processed in ${Date.now() - startMs}ms`, {
      provider: "delhivery_b2b", awb: payload.awb, ...result,
    });
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    logger.error(`${TAG} Delhivery B2B webhook error after ${Date.now() - startMs}ms: ${(err as Error).message}`, {
      provider: "delhivery_b2b", error: (err as Error).message, stack: (err as Error).stack?.slice(0, 500),
    });
    return res.status(200).json({ ok: true, error: "Processing error" });
  }
});

/**
 * POST /courier-webhooks/delhivery-b2b/manifest-callback
 *
 * Receives the async LR/AWB allocation result for a previously-manifested
 * shipment. The expected payload (per Delhivery LTL docs) is roughly:
 *   { job_id, lrn, waybills: ["...", "..."], status: "success" }
 *
 * We look up the order by the `JOB:<jobId>` placeholder AWB stored at
 * manifest time and replace it with the real LR number. The per-box waybills
 * are not stored separately yet — the LR is the master tracking ID.
 */
router.post("/delhivery-b2b/manifest-callback", async (req: Request, res: Response) => {
  const startMs = Date.now();
  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const jobId = (body.job_id || body.jobId || body.JobId) as string | undefined;
    const lrn = (body.lrn || body.LRN || body.lr_number) as string | undefined;
    const waybills = (body.waybills || body.AWBs || body.awbs) as string[] | undefined;

    logger.info(`${TAG} Delhivery B2B manifest callback received jobId=${jobId} lrn=${lrn}`, {
      provider: "delhivery_b2b", jobId, lrn, boxes: waybills?.length, ip: req.ip,
    });

    if (!jobId || !lrn) {
      logger.warn(`${TAG} Invalid Delhivery B2B manifest callback — missing job_id or lrn`, {
        provider: "delhivery_b2b", bodyKeys: Object.keys(body),
      });
      return res.status(200).json({ ok: true, message: "Invalid payload, skipped" });
    }

    const placeholder = `JOB:${jobId}`;
    const order = await db.query.orders.findFirst({
      where: and(eq(orders.awb, placeholder), eq(orders.serviceProvider, "delhivery_b2b")),
    });
    if (!order) {
      logger.warn(`${TAG} No order found for placeholder ${placeholder}`, {
        provider: "delhivery_b2b", jobId,
      });
      return res.status(200).json({ ok: true, message: "Order not found, skipped" });
    }

    await db
      .update(orders)
      .set({ awb: lrn, updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    // Audit-log the resolution event so the timeline reflects it.
    try {
      await db.insert(trackingEvents).values({
        orderId: order.id,
        userId: order.userId,
        awb: lrn,
        statusCode: "manifest_resolved",
        statusText: "LR allocated",
        remarks: `JobId=${jobId} → LR=${lrn}${waybills?.length ? ` (boxes: ${waybills.length})` : ""}`,
        source: "webhook",
        rawPayload: body,
      });
    } catch (err) {
      logger.error(`${TAG} Failed to log manifest resolution event: ${(err as Error).message}`);
    }

    logger.info(`${TAG} Delhivery B2B manifest resolved in ${Date.now() - startMs}ms — ${placeholder} → LR=${lrn}`, {
      provider: "delhivery_b2b", orderId: order.id, jobId, lrn,
    });
    return res.status(200).json({ ok: true, orderId: order.id, lrn });
  } catch (err) {
    logger.error(`${TAG} Delhivery B2B manifest callback error after ${Date.now() - startMs}ms: ${(err as Error).message}`, {
      provider: "delhivery_b2b", error: (err as Error).message, stack: (err as Error).stack?.slice(0, 500),
    });
    return res.status(200).json({ ok: true, error: "Processing error" });
  }
});

// ── Xpressbees ──────────────────────────────────────────────────
//
// Xpressbees signs each webhook with the account's secret:
//   X-Hmac-SHA256: base64(hmac_sha256(rawBody, secret))
//
// We support multiple Xpressbees accounts (e.g. "Xpressbees" + "Expressbees-2"),
// each with its own secret. The account is identified by the `:accountId` URL
// segment so verification is unambiguous (one HMAC computation per request, no
// trying-all). Configure the URL on each Xpressbees portal as:
//   https://<host>/courier-webhooks/xpressbees/<service_providers.id>
//
// Secret lives at `service_providers.credentials.webhookSecret`.

const XPRESSBEES_SIGNATURE_HEADER = "x-hmac-sha256";

async function verifyXpressbeesSignature(
  req: Request,
  accountId: string,
): Promise<{ ok: boolean; reason?: string; accountName?: string }> {
  const account = await db.query.serviceProviders.findFirst({
    where: and(eq(serviceProviders.id, accountId), eq(serviceProviders.slug, "xpressbees")),
  });
  if (!account) return { ok: false, reason: "Unknown Xpressbees account" };

  const credentials = (account.credentials ?? {}) as Record<string, unknown>;
  const secret = typeof credentials.webhookSecret === "string" ? credentials.webhookSecret : "";
  if (!secret) {
    return { ok: false, reason: `No webhookSecret stored for account ${account.name}`, accountName: account.name };
  }

  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!rawBody) return { ok: false, reason: "Missing raw body", accountName: account.name };

  const provided = req.headers[XPRESSBEES_SIGNATURE_HEADER];
  const providedStr = typeof provided === "string" ? provided.trim() : "";
  if (!providedStr) {
    return { ok: false, reason: `Missing ${XPRESSBEES_SIGNATURE_HEADER} header`, accountName: account.name };
  }

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  const a = Buffer.from(providedStr);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "HMAC signature mismatch", accountName: account.name };
  }
  return { ok: true, accountName: account.name };
}

/**
 * POST /courier-webhooks/xpressbees/:accountId
 * Receives push notifications from Xpressbees for a specific account.
 * Verifies the X-Hmac-SHA256 header using the account's stored webhookSecret.
 */
router.post("/xpressbees/:accountId", async (req: Request, res: Response) => {
  const startMs = Date.now();
  const accountId = req.params.accountId;

  try {
    const verification = await verifyXpressbeesSignature(req, accountId);
    if (!verification.ok) {
      logger.warn(`${TAG} Xpressbees signature verification failed: ${verification.reason}`, {
        provider: "xpressbees", accountId, account: verification.accountName, ip: req.ip,
      });
      return res.status(401).json({ ok: false, error: verification.reason });
    }

    const awbHint = (req.body?.awb_number as string) || (req.body?.awb as string) || "unknown";
    logger.info(`${TAG} Xpressbees webhook received AWB=${awbHint} status="${req.body?.status}" account=${verification.accountName}`, {
      provider: "xpressbees", awb: awbHint, status: req.body?.status, accountId, account: verification.accountName, ip: req.ip,
    });

    const payload = normalizeXpressbeesWebhook(req.body);
    if (!payload) {
      logger.warn(`${TAG} Invalid Xpressbees payload — missing awb_number`, {
        provider: "xpressbees", bodyKeys: Object.keys(req.body),
      });
      return res.status(200).json({ ok: true, message: "Invalid payload, skipped" });
    }

    const result = await processWebhookEvent(payload, "webhook");
    logger.info(`${TAG} Xpressbees webhook processed in ${Date.now() - startMs}ms`, {
      provider: "xpressbees", awb: payload.awb, account: verification.accountName, ...result,
    });
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    logger.error(`${TAG} Xpressbees webhook error after ${Date.now() - startMs}ms: ${(err as Error).message}`, {
      provider: "xpressbees", accountId, error: (err as Error).message, stack: (err as Error).stack?.slice(0, 500),
    });
    return res.status(200).json({ ok: true, error: "Processing error" });
  }
});

// ── DTDC (PX / B2C) ─────────────────────────────────────────────
//
// DTDC does NOT offer a real-time webhook. Instead they run a server-side cron
// ("Push API") that POSTs incremental scan events to a URL we register with
// them, roughly every 30 minutes. The payload shape (see DTDC "Push API
// Document: Tracking Status"):
//
//   {
//     "shipment": { "strShipmentNo": "<AWB>", "strRefNo", "strCNTypeCode", ... },
//     "shipmentStatus": [
//       { "strAction": "DLV",           // <-- scan CODE (not the description!)
//         "strActionDesc": "Delivered", // <-- human description
//         "strOrigin": "...", "strRemarks": "...",
//         "strActionDate": "DDMMYYYY", "strActionTime": "HHMMSS", ... }
//     ]
//   }
//
// The push is complemented by the pull-based poller (see trackingPoller.ts) so
// status still advances if DTDC hasn't provisioned the push for this DP code.
//
// Auth: DTDC lets the customer optionally supply an auth token for the push.
// If DTDC_PUSH_TOKEN is set we require it (checked against common header names
// and a `?token=` query param); if unset, verification is skipped so the
// endpoint works before a token is agreed with DTDC.

const DTDC_PUSH_TOKEN_HEADERS = [
  "x-access-token",
  "authorization",
  "api-key",
  "token",
];

function verifyDtdcPushToken(req: Request): boolean {
  const expected = process.env.DTDC_PUSH_TOKEN;
  if (!expected) return true; // not configured — accept (logged by caller)

  for (const h of DTDC_PUSH_TOKEN_HEADERS) {
    const v = req.headers[h];
    if (typeof v === "string" && v.replace(/^Bearer\s+/i, "").trim() === expected) {
      return true;
    }
  }
  const q = req.query.token;
  return typeof q === "string" && q === expected;
}

/**
 * POST /courier-webhooks/dtdc
 * Receives DTDC's cron-based push tracking events.
 */
router.post("/dtdc", async (req: Request, res: Response) => {
  const startMs = Date.now();
  try {
    if (!process.env.DTDC_PUSH_TOKEN) {
      logger.warn(`${TAG} DTDC_PUSH_TOKEN not set — accepting DTDC push without auth`);
    } else if (!verifyDtdcPushToken(req)) {
      logger.warn(`${TAG} DTDC push token verification failed`, { provider: "dtdc", ip: req.ip });
      return res.status(401).json({ ok: false, error: "Invalid token" });
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const awbHint =
      ((body.shipment as Record<string, unknown> | undefined)?.strShipmentNo as string) ||
      (body.strShipmentNo as string) ||
      "unknown";
    logger.info(`${TAG} DTDC push received AWB=${awbHint}`, {
      provider: "dtdc", awb: awbHint, ip: req.ip,
    });

    const payload = normalizeDtdcPush(body);
    if (!payload) {
      logger.warn(`${TAG} Invalid DTDC push payload — missing shipment/shipmentStatus`, {
        provider: "dtdc", bodyKeys: Object.keys(body),
      });
      return res.status(200).json({ ok: true, message: "Invalid payload, skipped" });
    }

    const result = await processWebhookEvent(payload, "webhook");
    logger.info(`${TAG} DTDC push processed in ${Date.now() - startMs}ms`, {
      provider: "dtdc", awb: payload.awb, ...result,
    });
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    logger.error(`${TAG} DTDC push error after ${Date.now() - startMs}ms: ${(err as Error).message}`, {
      provider: "dtdc", error: (err as Error).message, stack: (err as Error).stack?.slice(0, 500),
    });
    return res.status(200).json({ ok: true, error: "Processing error" });
  }
});

export default router;
