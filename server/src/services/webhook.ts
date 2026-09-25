import crypto from "crypto";
import axios from "axios";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { webhooks, webhookDeliveries } from "../db/schema.js";
import logger from "../config/logger.js";
import {
  WEBHOOK_API_VERSION,
  WEBHOOK_EVENTS,
  WEBHOOK_EVENT_CATALOGUE,
  WEBHOOK_PING_EVENT,
  isWebhookEvent,
  sampleOrderEventData,
  type WebhookEnvelope,
  type WebhookEventType,
  type WebhookOrderEventData,
} from "./webhookEvents.js";

export {
  WEBHOOK_API_VERSION,
  WEBHOOK_EVENTS,
  WEBHOOK_EVENT_CATALOGUE,
  WEBHOOK_PING_EVENT,
  isWebhookEvent,
};
export type { WebhookEventType, WebhookOrderEventData };

const TAG = "[Webhook]";

/** Total attempts (the immediate one + 4 retries) before a delivery is abandoned. */
export const MAX_ATTEMPTS = 5;

/**
 * Backoff before attempt N+1, indexed by attempts already made.
 * attempt 1 → +1m, 2 → +5m, 3 → +30m, 4 → +2h. After attempt 5 we stop.
 */
const RETRY_DELAYS_SECONDS = [60, 300, 1800, 7200];

/** How long a merchant endpoint gets to respond before we count it as a failure. */
const WEBHOOK_TIMEOUT_MS = 10_000;

/** A delivery left `retrying` for longer than this is assumed orphaned by a restart. */
const STALE_CLAIM_MINUTES = 10;

/** Longest response body we keep for the delivery log. */
const MAX_RESPONSE_BODY = 1_000;

export type DeliveryStatus = "pending" | "retrying" | "success" | "failed";

/* ─────────────────────────── Endpoint validation ────────────────────────── */

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^\[?::1\]?$/,
  /\.local$/i,
  /\.internal$/i,
];

export class WebhookConfigError extends Error {
  /** HTTP status the REST layer should map this to. */
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "WebhookConfigError";
    this.status = status;
  }
}

/**
 * Reject endpoints we must never POST to: non-HTTP schemes, and — outside
 * development — plain HTTP or hosts that resolve inside our own network.
 * Without this, a registered webhook is a server-side request forgery primitive.
 */
export function assertDeliverableUrl(raw: unknown): string {
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new WebhookConfigError("url is required");
  }
  const value = raw.trim();

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new WebhookConfigError("url must be a valid absolute URL, e.g. https://example.com/hooks/searchcraft");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new WebhookConfigError("url must use http or https");
  }
  if (value.length > 2_000) {
    throw new WebhookConfigError("url must be 2000 characters or fewer");
  }

  const isDev = process.env.NODE_ENV !== "production";
  if (!isDev) {
    if (parsed.protocol !== "https:") {
      throw new WebhookConfigError("url must use https");
    }
    if (PRIVATE_HOST_PATTERNS.some((re) => re.test(parsed.hostname))) {
      throw new WebhookConfigError("url must point at a publicly reachable host");
    }
  }

  return parsed.toString();
}

/**
 * Stored on every endpoint so the row still describes what it receives, even
 * though the set is no longer selectable.
 */
export function allWebhookEvents(): WebhookEventType[] {
  return [...WEBHOOK_EVENTS];
}

export function generateSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString("hex")}`;
}

/* ────────────────────────────── Signing ─────────────────────────────────── */

/**
 * Signature scheme v1: HMAC-SHA256 over `${unixSeconds}.${rawBody}`.
 *
 * Binding the timestamp into the signed string is what makes a captured
 * delivery non-replayable — subscribers reject anything older than their
 * tolerance window and the attacker cannot re-sign a fresher timestamp.
 */
export function signV1(rawBody: string, secret: string, timestampSeconds: number): string {
  return crypto.createHmac("sha256", secret).update(`${timestampSeconds}.${rawBody}`).digest("hex");
}

/** Pre-v1 signature: bare HMAC over the body. Still sent so old consumers keep working. */
function signLegacy(rawBody: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

/* ───────────────────────────── Dispatch ─────────────────────────────────── */

function buildEnvelope(event: string, data: unknown): WebhookEnvelope {
  return {
    id: `evt_${crypto.randomUUID()}`,
    event,
    api_version: WEBHOOK_API_VERSION,
    created_at: new Date().toISOString(),
    data,
  };
}

/**
 * Fan an order lifecycle event out to every active endpoint subscribed to it.
 *
 * Fire-and-forget by design: a merchant's endpoint being slow or down must
 * never slow down or fail the request that produced the event. Callers should
 * NOT await the returned promise inside a database transaction.
 */
export async function dispatchWebhookEvent(
  userId: string,
  event: WebhookEventType,
  data: WebhookOrderEventData,
): Promise<void> {
  try {
    if (!isWebhookEvent(event)) {
      logger.error(`${TAG} Refusing to dispatch unknown event "${event}" (userId: ${userId})`);
      return;
    }

    // Every active endpoint receives every order status change. There is no
    // per-event subscription: a seller registers a URL and gets the whole
    // lifecycle, which is what integrators expect from a shipping API.
    const matching = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.userId, userId), eq(webhooks.isActive, true)));

    if (matching.length === 0) {
      logger.debug(`${TAG} No endpoint registered (userId: ${userId})`);
      return;
    }

    const envelope = buildEnvelope(event, data);
    logger.info(
      `${TAG} ${event} ${envelope.id} → ${matching.length} endpoint(s) (userId: ${userId})`,
    );

    // Claim each delivery up front so a crash between the insert and the first
    // attempt still leaves a row the retry cron can recover.
    const rows = await db
      .insert(webhookDeliveries)
      .values(
        matching.map((w) => ({
          webhookId: w.id,
          userId,
          event,
          url: w.url,
          payload: envelope as unknown as Record<string, unknown>,
          status: "retrying" as DeliveryStatus,
          attempts: 0,
          nextRetryAt: new Date(),
        })),
      )
      .returning({ id: webhookDeliveries.id, webhookId: webhookDeliveries.webhookId, url: webhookDeliveries.url });

    const secretById = new Map(matching.map((w) => [w.id, w.secret ?? ""]));

    // Detached on purpose — the caller returns immediately.
    void Promise.allSettled(
      rows.map((row) =>
        attemptDelivery({
          deliveryId: row.id,
          url: row.url,
          secret: secretById.get(row.webhookId) ?? "",
          event,
          envelope,
          attemptsSoFar: 0,
        }),
      ),
    );
  } catch (err) {
    logger.error(`${TAG} Failed to dispatch ${event} — ${(err as Error).message}`);
  }
}

interface AttemptInput {
  deliveryId: string;
  url: string;
  secret: string;
  event: string;
  envelope: WebhookEnvelope;
  attemptsSoFar: number;
}

/**
 * Make one HTTP attempt and record the outcome.
 *
 * Retries are never scheduled in-process: a failed attempt only writes
 * `next_retry_at`, and the webhook-retry cron picks the row back up. That is
 * what makes the backoff survive a deploy or a crash.
 */
async function attemptDelivery(input: AttemptInput): Promise<void> {
  const { deliveryId, url, secret, event, envelope } = input;
  const attempt = input.attemptsSoFar + 1;

  const rawBody = JSON.stringify(envelope);
  const timestampSeconds = Math.floor(Date.now() / 1000);
  const sentAt = new Date(timestampSeconds * 1000).toISOString();
  const legacyPrefix = ["X-Box", "And-Beyond"].join("-");
  const signature = `t=${timestampSeconds},v1=${signV1(rawBody, secret, timestampSeconds)}`;

  try {
    const response = await axios.post(url, rawBody, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Searchcraft-Webhooks/1.0",
        "X-Searchcraft-Event": event,
        "X-Searchcraft-Event-Id": envelope.id,
        "X-Searchcraft-Delivery-Id": deliveryId,
        "X-Searchcraft-Attempt": String(attempt),
        "X-Searchcraft-Timestamp": sentAt,
        "X-Searchcraft-Signature": signature,
        [`${legacyPrefix}-Event`]: event,
        [`${legacyPrefix}-Event-Id`]: envelope.id,
        [`${legacyPrefix}-Delivery-Id`]: deliveryId,
        [`${legacyPrefix}-Attempt`]: String(attempt),
        [`${legacyPrefix}-Timestamp`]: sentAt,
        [`${legacyPrefix}-Signature`]: signature,
        // Pre-v1 headers — deprecated, removed once every subscriber is on v1.
        "X-Webhook-Event": event,
        "X-Webhook-Timestamp": sentAt,
        "X-Webhook-Signature": signLegacy(rawBody, secret),
      },
      timeout: WEBHOOK_TIMEOUT_MS,
      maxRedirects: 0,
      validateStatus: () => true,
      transformRequest: [(body) => body],
    });

    const ok = response.status >= 200 && response.status < 300;
    const body =
      typeof response.data === "string"
        ? response.data
        : (() => {
            try {
              return JSON.stringify(response.data);
            } catch {
              return "";
            }
          })();

    await recordOutcome({
      deliveryId,
      attempt,
      ok,
      responseStatus: response.status,
      responseBody: body.slice(0, MAX_RESPONSE_BODY),
      error: ok ? null : `Endpoint responded HTTP ${response.status}`,
      url,
      event,
    });
  } catch (err) {
    await recordOutcome({
      deliveryId,
      attempt,
      ok: false,
      responseStatus: null,
      responseBody: null,
      error: (err as Error).message,
      url,
      event,
    });
  }
}

interface OutcomeInput {
  deliveryId: string;
  attempt: number;
  ok: boolean;
  responseStatus: number | null;
  responseBody: string | null;
  error: string | null;
  url: string;
  event: string;
}

async function recordOutcome(o: OutcomeInput): Promise<void> {
  const exhausted = o.attempt >= MAX_ATTEMPTS;
  const status: DeliveryStatus = o.ok ? "success" : exhausted ? "failed" : "pending";

  const delaySeconds = RETRY_DELAYS_SECONDS[o.attempt - 1];
  const nextRetryAt =
    !o.ok && !exhausted && delaySeconds != null ? new Date(Date.now() + delaySeconds * 1000) : null;

  await db
    .update(webhookDeliveries)
    .set({
      attempts: o.attempt,
      status,
      responseStatus: o.responseStatus,
      responseBody: o.responseBody,
      error: o.error,
      nextRetryAt,
      updatedAt: new Date(),
    })
    .where(eq(webhookDeliveries.id, o.deliveryId));

  if (o.ok) {
    logger.info(`${TAG} ${o.event} delivered to ${o.url} — HTTP ${o.responseStatus} (attempt ${o.attempt})`);
  } else if (status === "pending") {
    logger.warn(
      `${TAG} ${o.event} attempt ${o.attempt}/${MAX_ATTEMPTS} failed for ${o.url} — ${o.error}; retrying in ${delaySeconds}s`,
    );
  } else {
    logger.error(
      `${TAG} ${o.event} ABANDONED after ${MAX_ATTEMPTS} attempts — ${o.url} — ${o.error}`,
    );
  }
}

/* ─────────────────────────────── Retry worker ───────────────────────────── */

interface DueRow {
  id: string;
  webhook_id: string;
  url: string;
  event: string;
  payload: WebhookEnvelope;
  attempts: number;
}

/**
 * Claim and re-send every delivery whose backoff has elapsed.
 *
 * The claim is a single `UPDATE ... FOR UPDATE SKIP LOCKED`, so running two
 * server instances never double-fires a webhook.
 */
export async function deliverDueWebhooks(limit = 100): Promise<{ claimed: number; delivered: number; failed: number }> {
  // Recover rows a restart left mid-flight.
  await db.execute(sql`
    UPDATE webhook_deliveries
    SET status = 'pending', updated_at = now()
    WHERE status = 'retrying'
      AND updated_at < now() - make_interval(mins => ${STALE_CLAIM_MINUTES})
  `);

  const claimed = await db.execute(sql`
    WITH due AS (
      SELECT d.id
      FROM webhook_deliveries d
      WHERE d.status = 'pending'
        AND d.next_retry_at IS NOT NULL
        AND d.next_retry_at <= now()
      ORDER BY d.next_retry_at ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE webhook_deliveries d
    SET status = 'retrying', updated_at = now()
    FROM due
    WHERE d.id = due.id
    RETURNING d.id, d.webhook_id, d.url, d.event, d.payload, d.attempts
  `);

  const rows = (claimed as unknown as { rows: DueRow[] }).rows ?? [];
  if (rows.length === 0) return { claimed: 0, delivered: 0, failed: 0 };

  // One lookup for every secret in this batch.
  const webhookIds = Array.from(new Set(rows.map((r) => r.webhook_id)));
  const endpoints = await db
    .select({ id: webhooks.id, secret: webhooks.secret, isActive: webhooks.isActive })
    .from(webhooks)
    .where(inArray(webhooks.id, webhookIds));
  const endpointById = new Map(endpoints.map((e) => [e.id, e]));

  let delivered = 0;
  // Anything that did not end this pass in `success` — whether it will retry
  // again or has exhausted its attempts.
  let failed = 0;

  // Bounded concurrency — a large backlog must not open 100 sockets at once.
  const CONCURRENCY = 10;
  const queue = [...rows];
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    for (let row = queue.shift(); row; row = queue.shift()) {
      const endpoint = endpointById.get(row.webhook_id);

      // The endpoint was deleted or switched off after the event was queued.
      if (!endpoint || !endpoint.isActive) {
        await db
          .update(webhookDeliveries)
          .set({
            status: "failed",
            error: endpoint ? "Endpoint disabled before retry" : "Endpoint deleted before retry",
            nextRetryAt: null,
            updatedAt: new Date(),
          })
          .where(eq(webhookDeliveries.id, row.id));
        failed += 1;
        continue;
      }

      const before = row.attempts;
      await attemptDelivery({
        deliveryId: row.id,
        url: row.url,
        secret: endpoint.secret ?? "",
        event: row.event,
        envelope: row.payload,
        attemptsSoFar: before,
      });

      const [after] = await db
        .select({ status: webhookDeliveries.status })
        .from(webhookDeliveries)
        .where(eq(webhookDeliveries.id, row.id));
      if (after?.status === "success") delivered += 1;
      else failed += 1;
    }
  });

  await Promise.all(workers);
  return { claimed: rows.length, delivered, failed };
}

/* ──────────────────────── Operator-facing helpers ───────────────────────── */

/**
 * Send a test delivery to one endpoint so a seller can verify it end-to-end.
 *
 * With no `event` this sends `webhook.ping` — a pure reachability check. Pass a
 * lifecycle event instead and the endpoint receives a realistic payload for
 * that status, which is what you want when testing your own handler rather
 * than just your firewall.
 */
export async function sendTestWebhook(
  webhookId: string,
  userId: string,
  event?: string,
): Promise<string> {
  const endpoint = await db.query.webhooks.findFirst({
    where: and(eq(webhooks.id, webhookId), eq(webhooks.userId, userId)),
  });
  if (!endpoint) throw new WebhookConfigError("Webhook not found", 404);

  if (event !== undefined && event !== WEBHOOK_PING_EVENT && !isWebhookEvent(event)) {
    throw new WebhookConfigError(`Unknown event "${event}"`);
  }

  const testEvent = event && event !== WEBHOOK_PING_EVENT ? event : WEBHOOK_PING_EVENT;

  const envelope =
    testEvent === WEBHOOK_PING_EVENT
      ? buildEnvelope(WEBHOOK_PING_EVENT, {
          message: "This is a test event from Searchcraft. Your endpoint is reachable.",
          sample: sampleOrderEventData(),
        })
      : buildEnvelope(testEvent, {
          ...sampleOrderEventData(),
          // Keep `status` consistent with the event being simulated so the
          // sample exercises the same branch a real delivery would.
          status: testEvent.replace(/^order\./, ""),
          // Unmistakably a drill, so a test never lands in real order data.
          order_id: "TEST-ORDER-0001",
        });

  const [row] = await db
    .insert(webhookDeliveries)
    .values({
      webhookId: endpoint.id,
      userId,
      event: testEvent,
      url: endpoint.url,
      payload: envelope as unknown as Record<string, unknown>,
      status: "retrying",
      attempts: 0,
      nextRetryAt: new Date(),
    })
    .returning({ id: webhookDeliveries.id });

  // Awaited — the caller wants the result of this one synchronously.
  await attemptDelivery({
    deliveryId: row.id,
    url: endpoint.url,
    secret: endpoint.secret ?? "",
    event: testEvent,
    envelope,
    attemptsSoFar: 0,
  });

  // A ping is a one-shot check, never a retry candidate.
  await db
    .update(webhookDeliveries)
    .set({ nextRetryAt: null, updatedAt: new Date() })
    .where(and(eq(webhookDeliveries.id, row.id), eq(webhookDeliveries.status, "pending")));

  return row.id;
}

/** Queue an already-recorded delivery for an immediate fresh attempt. */
export async function scheduleRedelivery(deliveryId: string, userId: string): Promise<void> {
  const existing = await db.query.webhookDeliveries.findFirst({
    where: and(eq(webhookDeliveries.id, deliveryId), eq(webhookDeliveries.userId, userId)),
  });
  if (!existing) throw new WebhookConfigError("Delivery not found", 404);

  const endpoint = await db.query.webhooks.findFirst({ where: eq(webhooks.id, existing.webhookId) });
  if (!endpoint) throw new WebhookConfigError("The endpoint for this delivery no longer exists", 404);
  if (!endpoint.isActive) throw new WebhookConfigError("Enable the endpoint before redelivering", 409);

  // Attempts reset so a redelivery gets the full retry budget of its own.
  await db
    .update(webhookDeliveries)
    .set({
      status: "pending",
      attempts: 0,
      error: null,
      responseStatus: null,
      responseBody: null,
      nextRetryAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(webhookDeliveries.id, deliveryId));
}
