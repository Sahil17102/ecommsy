import { and, eq, inArray } from "drizzle-orm";
import { db } from "../config/db.js";
import { orders } from "../db/schema.js";
import {
  processWebhookEvent,
  normalizeShipexTracking,
  normalizeXpressbeesTracking,
  normalizeDelhiveryTracking,
  normalizeDelhiveryB2bTracking,
  normalizeDtdcTracking,
  type NormalizedWebhookPayload,
} from "./webhookProcessor.js";
import { createProvider, loadActiveAccounts, type BaseProvider, type ProviderAccount } from "./providers/index.js";
import logger from "../config/logger.js";

const TAG = "[TrackingPoller]";

// Inlined ORDER_STATUSES so we don't depend on the legacy models file.
type OrderStatus =
  | "created"
  | "processing"
  | "booked"
  | "pickup_initiated"
  | "shipped"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "ndr"
  | "rto_initiated"
  | "rto_in_transit"
  | "rto_delivered"
  | "cancelled"
  | "lost";

/**
 * Active statuses that need tracking updates.
 * Terminal statuses (delivered, cancelled, rto_delivered, lost) are excluded
 * so we don't waste API calls (and avoid hitting rate limits) on shipments
 * that are already in a final state.
 */
const ACTIVE_STATUSES: OrderStatus[] = [
  "booked",
  "pickup_initiated",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "ndr",
  "rto_initiated",
  "rto_in_transit",
];

/**
 * Provider slugs we actively poll. Each provider must have:
 *   - A `trackOrder(awb)` implementation that returns the raw tracking payload.
 *   - A normalize function that converts that payload to NormalizedWebhookPayload.
 */
const POLL_TARGETS: Array<{
  slug: string;
  normalize: (awb: string, data: Record<string, unknown>) => NormalizedWebhookPayload | null;
}> = [
  { slug: "shipexindia", normalize: normalizeShipexTracking },
  { slug: "ekart", normalize: normalizeEkartPayload },
  { slug: "xpressbees", normalize: normalizeXpressbeesTracking },
  { slug: "xpressbees_b2b", normalize: (awb, data) => {
    const payload = normalizeXpressbeesTracking(awb, data);
    if (payload) payload.provider = "xpressbees_b2b";
    return payload;
  } },
  { slug: "delhivery", normalize: normalizeDelhiveryTracking },
  { slug: "delhivery_b2b", normalize: normalizeDelhiveryB2bTracking },
  // DTDC has no real-time webhook — its "push" API is a 30-min DTDC-side cron
  // (see /courier-webhooks/dtdc). We ALSO pull here so status advances even if
  // DTDC hasn't been configured to push to us yet. Requires trackingUsername /
  // trackingPassword on the account credentials; without them trackOrder() no-ops.
  { slug: "dtdc", normalize: normalizeDtdcTracking },
];

/**
 * Poll tracking updates for all configured providers.
 *
 * Per provider:
 *   1. Find every order whose `status` is in ACTIVE_STATUSES.
 *   2. Call provider.trackOrder(awb) for each.
 *   3. Normalize the response and feed it through processWebhookEvent.
 */
export async function pollTrackingUpdates(): Promise<{
  polled: number;
  updated: number;
  errors: number;
}> {
  let polled = 0;
  let updated = 0;
  let errors = 0;

  const normalizeBySlug = new Map(POLL_TARGETS.map((t) => [t.slug, t.normalize]));
  const slugsWePoll = [...normalizeBySlug.keys()];

  // Load all active accounts once and group by slug
  const accounts = await loadActiveAccounts();
  const accountsBySlug = new Map<string, ProviderAccount[]>();
  const accountById = new Map<string, ProviderAccount>();
  for (const a of accounts) {
    accountById.set(a.id, a);
    const list = accountsBySlug.get(a.slug) ?? [];
    list.push(a);
    accountsBySlug.set(a.slug, list);
  }

  // Pull every active order whose slug we know how to poll
  const rows = await db
    .select({
      awb: orders.awb,
      serviceProvider: orders.serviceProvider,
      userId: orders.userId,
      metadata: orders.metadata,
    })
    .from(orders)
    .where(
      and(
        inArray(orders.serviceProvider, slugsWePoll),
        inArray(orders.status, ACTIVE_STATUSES),
      ),
    );

  logger.info(`${TAG} Polling ${rows.length} active order(s) across ${slugsWePoll.length} slug(s)`);

  // Cache provider instances per accountId — one auth + token cache per account
  const providerByAccount = new Map<string, BaseProvider>();

  for (const order of rows) {
    polled++;
    try {
      if (!order.awb || !order.serviceProvider) continue;

      const meta = (order.metadata ?? {}) as Record<string, unknown>;
      const explicitAccountId = typeof meta.serviceProviderId === "string" ? meta.serviceProviderId : null;

      // Resolve account: prefer the stored serviceProviderId; otherwise fall
      // back to the first active account for the slug (pre-multi-account orders).
      const account =
        (explicitAccountId ? accountById.get(explicitAccountId) : undefined) ??
        accountsBySlug.get(order.serviceProvider)?.[0];

      if (!account) continue;

      let provider = providerByAccount.get(account.id);
      if (!provider) {
        const created = createProvider(account);
        if (!created) {
          logger.warn(`${TAG} No provider class for slug "${account.slug}" — skipping ${account.name}`);
          continue;
        }
        provider = created;
        providerByAccount.set(account.id, provider);
      }

      const normalize = normalizeBySlug.get(order.serviceProvider);
      if (!normalize) continue;

      const data = await provider.trackOrder(order.awb);
      if (!data) continue;

      const payload = normalize(order.awb, data);
      if (!payload) continue;

      const result = await processWebhookEvent(payload, "polling");
      if (result.newStatus) updated++;
    } catch (err) {
      errors++;
      logger.error(`${TAG} ${order.serviceProvider} poll error AWB=${order.awb}: ${(err as Error).message}`);
    }
  }

  logger.info(`${TAG} Polling complete: polled=${polled} updated=${updated} errors=${errors}`);
  return { polled, updated, errors };
}

/**
 * Ekart's track response shape doesn't match either webhook or generic-tracking
 * normalizers, so it gets its own translator.
 */
function normalizeEkartPayload(
  awb: string,
  data: Record<string, unknown>,
): NormalizedWebhookPayload | null {
  const courierStatus = (data.status as string) || (data.tracking_status as string) || "";
  if (!courierStatus) return null;

  return {
    awb,
    provider: "ekart",
    courierStatus,
    courierStatusCode: (data.status_code as string) || undefined,
    remark: (data.remark as string) || (data.ndrStatus as string) || undefined,
    location: (data.current_location as string) || undefined,
    eventTimestamp: (data.updated_at as string) || (data.last_update as string) || undefined,
    rawPayload: data,
  };
}
