import type { orders } from "../db/schema.js";

/**
 * Outbound (merchant-facing) webhook contract.
 *
 * Everything a subscriber sees — the event names, the envelope and the `data`
 * block — is defined here so the dispatcher, the REST API and the published
 * OpenAPI docs can never drift apart.
 */

type OrderRow = typeof orders.$inferSelect;

/** Envelope version. Bumped only on a breaking change to `data`. */
export const WEBHOOK_API_VERSION = "v1";

/** Canonical catalogue — the single source of truth for valid event names. */
export const WEBHOOK_EVENT_CATALOGUE = [
  {
    event: "order.created",
    summary: "Order accepted",
    description:
      "Searchcraft has validated and stored the order. Fired by POST /orders, immediately before `order.booked`.",
  },
  {
    event: "order.booked",
    summary: "AWB assigned",
    description:
      "The courier accepted the booking and returned an AWB. This is the first event that carries `data.awb`.",
  },
  {
    event: "order.pickup_initiated",
    summary: "Pickup requested",
    description: "The shipment was manifested and a pickup was raised with the courier.",
  },
  {
    event: "order.shipped",
    summary: "Picked up",
    description: "The courier has physically collected the shipment from the pickup address.",
  },
  {
    event: "order.in_transit",
    summary: "In transit",
    description: "The shipment moved between courier facilities. May fire many times per shipment.",
  },
  {
    event: "order.out_for_delivery",
    summary: "Out for delivery",
    description: "The shipment is with the delivery agent for a delivery attempt.",
  },
  {
    event: "order.delivered",
    summary: "Delivered",
    description: "Terminal success state. `data.event_timestamp` is the courier's delivery scan time.",
  },
  {
    event: "order.ndr",
    summary: "Delivery attempt failed (NDR)",
    description:
      "A delivery attempt failed. `data.ndr` carries the courier reason, the attempt number and the pending action.",
  },
  {
    event: "order.rto_initiated",
    summary: "Return to origin started",
    description: "The shipment was converted into a return leg, either by the courier or by an NDR action.",
  },
  {
    event: "order.rto_in_transit",
    summary: "Return in transit",
    description: "The return shipment is moving back toward the pickup address.",
  },
  {
    event: "order.rto_delivered",
    summary: "Return delivered",
    description: "Terminal return state — the shipment is back with the seller.",
  },
  {
    event: "order.cancelled",
    summary: "Cancelled",
    description:
      "The order was cancelled (by you, by an admin, or by the courier). `data.cancellation` carries the reason.",
  },
  {
    event: "order.lost",
    summary: "Lost or damaged",
    description: "The courier reported the shipment as lost, damaged or destroyed.",
  },
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_CATALOGUE)[number]["event"];

export const WEBHOOK_EVENTS: readonly WebhookEventType[] = WEBHOOK_EVENT_CATALOGUE.map((e) => e.event);

const EVENT_SET: ReadonlySet<string> = new Set(WEBHOOK_EVENT_CATALOGUE.map((e) => e.event));

export function isWebhookEvent(value: unknown): value is WebhookEventType {
  return typeof value === "string" && EVENT_SET.has(value);
}

/**
 * `webhook.ping` is deliberately NOT in the catalogue: it is never emitted by
 * the order lifecycle and cannot be subscribed to. It is only produced by
 * POST /webhooks/:id/test so an endpoint can be verified before go-live.
 */
export const WEBHOOK_PING_EVENT = "webhook.ping";

/* ───────────────────────────── Payload shapes ───────────────────────────── */

export interface WebhookOrderEventData {
  /** The seller's own order reference — the `orderId` sent to POST /orders. */
  order_id: string;
  /** Store/marketplace order id supplied to the draft import API, when present. */
  external_order_id: string | null;
  /** Source channel captured at import time, e.g. `external_store`. */
  source: string | null;
  /** Searchcraft-side shipment UUID. Stable for the life of the shipment. */
  shipment_id: string;
  /** Courier airway bill. `null` until the courier assigns one. */
  awb: string | null;
  /** @deprecated Alias of `awb`, kept for pre-v1 subscribers. */
  awb_number: string | null;
  status: string;
  previous_status: string | null;
  order_type: "B2C" | "B2B";
  payment_type: string | null;
  order_amount: number;
  cod_amount: number;
  weight_grams: number | null;
  /** Integration slug the shipment was booked through, e.g. `"delhivery"`. */
  service_provider: string | null;
  /** @deprecated Alias of `service_provider`, kept for pre-v1 subscribers. */
  courier_partner: string | null;
  courier_id: string | null;
  courier_name: string | null;
  destination: { city: string | null; state: string | null; pincode: string | null } | null;
  /** Raw status text as the courier reported it (unmapped). */
  courier_status: string | null;
  courier_status_code: string | null;
  location: string | null;
  remark: string | null;
  /** When the underlying event happened, ISO-8601. Falls back to dispatch time. */
  event_timestamp: string;
  label_url: string | null;
  tracking_url: string | null;
  ndr: { reason: string | null; attempt_count: number | null; next_action: string | null } | null;
  cancellation: { reason: string | null; cancelled_at: string | null } | null;
  manifested_at: string | null;
  created_at: string;
}

export interface WebhookEnvelope<T = unknown> {
  /** Unique per logical event. Identical across every endpoint it fans out to — use it to de-duplicate. */
  id: string;
  event: string;
  api_version: string;
  /** When Searchcraft emitted the event, ISO-8601. */
  created_at: string;
  data: T;
}

/* ─────────────────────────── Payload construction ───────────────────────── */

interface JsonAddress {
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function iso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function publicTrackingUrl(awb: string | null): string | null {
  if (!awb) return null;
  const base = (process.env.PUBLIC_SITE_URL || "https://boxandbeyond.in").replace(/\/+$/, "");
  return `${base}/track?q=${encodeURIComponent(awb)}`;
}

/** Extra context a specific call site can attach on top of the order row. */
export interface OrderEventContext {
  previousStatus?: string | null;
  courierName?: string | null;
  courierStatus?: string | null;
  courierStatusCode?: string | null;
  location?: string | null;
  remark?: string | null;
  eventTimestamp?: string | Date | null;
  ndr?: { reason?: string | null; attemptCount?: number | null; nextAction?: string | null } | null;
  cancellation?: { reason?: string | null; cancelledAt?: string | Date | null } | null;
  manifestedAt?: string | Date | null;
  /** Overrides `orders.status` for events emitted before the row is re-read. */
  status?: string;
}

/**
 * Build the `data` block for an order lifecycle event.
 *
 * Every call site goes through this so a subscriber sees the same field names
 * and the same types no matter which event fired.
 */
export function buildOrderEventData(order: OrderRow, ctx: OrderEventContext = {}): WebhookOrderEventData {
  const meta = (order.metadata ?? {}) as Record<string, unknown>;
  const delivery = (order.deliveryAddress ?? null) as JsonAddress | null;
  const awb = order.awb ?? null;

  return {
    order_id: order.orderId,
    external_order_id:
      typeof meta.externalOrderId === "string"
        ? meta.externalOrderId
        : typeof meta.external_order_id === "string"
          ? meta.external_order_id
          : null,
    source: typeof meta.source === "string" ? meta.source : null,
    shipment_id: order.id,
    awb,
    awb_number: awb,
    status: ctx.status ?? order.status,
    previous_status: ctx.previousStatus ?? null,
    order_type: (order.orderType ?? "b2c").toUpperCase() === "B2B" ? "B2B" : "B2C",
    payment_type: order.paymentMode ?? null,
    order_amount: num(order.declaredValue),
    cod_amount: num(order.codAmount),
    weight_grams: order.weight == null ? null : num(order.weight),
    service_provider: order.serviceProvider ?? null,
    courier_partner: order.serviceProvider ?? null,
    courier_id: order.courierId ?? null,
    courier_name: ctx.courierName ?? null,
    destination: delivery
      ? {
          city: delivery.city ?? null,
          state: delivery.state ?? null,
          pincode: delivery.pincode ?? null,
        }
      : null,
    courier_status: ctx.courierStatus ?? order.courierStatus ?? null,
    courier_status_code: ctx.courierStatusCode ?? null,
    location: ctx.location ?? null,
    remark: ctx.remark ?? null,
    event_timestamp: iso(ctx.eventTimestamp) ?? new Date().toISOString(),
    label_url: order.labelUrl ?? null,
    tracking_url: publicTrackingUrl(awb),
    ndr: ctx.ndr
      ? {
          reason: ctx.ndr.reason ?? null,
          attempt_count: ctx.ndr.attemptCount ?? null,
          next_action: ctx.ndr.nextAction ?? null,
        }
      : null,
    cancellation: ctx.cancellation
      ? {
          reason: ctx.cancellation.reason ?? null,
          cancelled_at: iso(ctx.cancellation.cancelledAt) ?? null,
        }
      : null,
    manifested_at: iso(ctx.manifestedAt ?? meta.pickupRequestedAt) ?? null,
    created_at: iso(order.createdAt) ?? new Date().toISOString(),
  };
}

/** Representative payload used by the docs page and by POST /webhooks/:id/test. */
export function sampleOrderEventData(): WebhookOrderEventData {
  return {
    order_id: "ORD-10021",
    external_order_id: "STORE-10045",
    source: "external_store",
    shipment_id: "6f1c6b6c-3a1e-4d9a-9d0b-6b2b2f9a41c7",
    awb: "3419810012345",
    awb_number: "3419810012345",
    status: "out_for_delivery",
    previous_status: "in_transit",
    order_type: "B2C",
    payment_type: "cod",
    order_amount: 1499,
    cod_amount: 1499,
    weight_grams: 850,
    service_provider: "delhivery",
    courier_partner: "delhivery",
    courier_id: "0f2f9a0d-1f8b-4a63-9a86-9a2f37c0a111",
    courier_name: "Delhivery Surface",
    destination: { city: "Jaipur", state: "Rajasthan", pincode: "302001" },
    courier_status: "Out for delivery",
    courier_status_code: "UD",
    location: "Jaipur_Sitapura_H (Rajasthan)",
    remark: null,
    event_timestamp: "2026-08-26T09:14:32.000Z",
    label_url: "https://cdn.boxandbeyond.in/labels/3419810012345.pdf",
    tracking_url: "https://boxandbeyond.in/track?q=3419810012345",
    ndr: null,
    cancellation: null,
    manifested_at: "2026-08-25T11:02:10.000Z",
    created_at: "2026-08-25T10:41:55.000Z",
  };
}
