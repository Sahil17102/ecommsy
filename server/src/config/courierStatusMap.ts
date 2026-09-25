// Inlined types so this config doesn't depend on legacy Mongoose model files.
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

type WebhookEventType =
  | "order.created"
  | "order.booked"
  | "order.pickup_initiated"
  | "order.shipped"
  | "order.in_transit"
  | "order.out_for_delivery"
  | "order.delivered"
  | "order.ndr"
  | "order.rto_initiated"
  | "order.rto_in_transit"
  | "order.rto_delivered"
  | "order.cancelled"
  | "order.lost";

/**
 * Maps courier-specific status strings/codes → our internal OrderStatus.
 * Each courier has different status naming, so we normalize here.
 *
 * Usage: courierStatusMap[providerSlug][courierStatusString] → OrderStatus | undefined
 */
export const courierStatusMap: Record<string, Record<string, OrderStatus>> = {
  // ─── Delhivery ──────────────────────────────────────────────
  // Delhivery's webhook pushes BOTH a StatusType code (UD, DL, RT, PP, PU, CN)
  // AND a Status string. The same Status string means different things based on
  // StatusType — e.g. "In Transit" with UD = forward in-transit, but with RT =
  // forward shipment converted to return (RTO initiated). So we key by the
  // composite "StatusType:Status" first, then fall back to the bare Status.
  //
  // Reference: https://one.delhivery.com/developer-portal/document/b2c/detail/webhook_functionality
  //
  // StatusType codes:
  //   UD = Forward, in transit / undelivered states
  //   DL = Delivered (terminal — either delivered or RTO'd to origin)
  //   RT = Return leg (forward shipment converted into return)
  //   PP = Pickup pending (reverse pickup — request lifecycle)
  //   PU = Pickup in transit (reverse pickup — physical leg)
  //   CN = Cancelled (reverse pickup cancellation)
  delhivery: {
    // ── Forward shipment (UD / DL) ─────────────────────────────
    "UD:Manifested": "booked",
    "UD:Not Picked": "booked",
    "UD:In Transit": "in_transit",
    "UD:Pending": "in_transit",            // reached destination city, awaiting OFD
    "UD:Dispatched": "out_for_delivery",
    "DL:Delivered": "delivered",

    // ── Forward → Return (RT) ──────────────────────────────────
    // The forward shipment was undelivered and is being returned to origin.
    "RT:In Transit": "rto_initiated",      // conversion event — RTO has started
    "RT:Pending": "rto_in_transit",        // reached DC near origin
    "RT:Dispatched": "rto_in_transit",     // dispatched for delivery to seller
    "DL:RTO": "rto_delivered",             // returned to origin (terminal)

    // ── Reverse pickup request (PP) ────────────────────────────
    // Reverse pickup = collecting from end customer, delivering to client.
    "PP:Open": "created",
    "PP:Scheduled": "booked",
    "PP:Dispatched": "pickup_initiated",   // FE out to collect from customer

    // ── Reverse pickup in transit (PU) ─────────────────────────
    "PU:In Transit": "in_transit",
    "PU:Pending": "in_transit",
    "PU:Dispatched": "out_for_delivery",   // dispatched to client warehouse
    "DL:DTO": "delivered",                 // delivered to client (terminal)

    // ── Cancellations (CN) ─────────────────────────────────────
    "CN:Canceled": "cancelled",
    "CN:Cancelled": "cancelled",
    "CN:Closed": "cancelled",

    // ── Bare-status fallbacks (when StatusType is missing or for legacy keys) ──
    // These only fire if the composite lookup misses. Kept for safety.
    Manifested: "booked",
    Delivered: "delivered",
    Cancelled: "cancelled",
    LOST: "lost",
    Lost: "lost",
    // NDR is detected via remark keyword matching, not a single status.
  },

  // ─── Delhivery B2B (LTL) ─────────────────────────────────────
  // Distinct from B2C — separate API, separate status taxonomy.
  // Webhook pushes uppercase status strings keyed by status type:
  //   UD = Forward undelivered/in-transit, DL = Delivered (terminal),
  //   RT = Return leg, LT = Lost
  // Reference: https://one.delhivery.com/developer-portal/document/b2b/detail/
  delhivery_b2b: {
    // ── Forward shipment ──
    MANIFESTED: "booked",
    PICKED_UP: "pickup_initiated",
    NOT_PICKED: "booked",       // failed pickup attempt, not a cancellation
    LEFT_ORIGIN: "in_transit",
    "In Transit": "in_transit",
    REACH_DESTINATION: "in_transit",
    Pending: "in_transit",                // reached destination, awaiting OFD
    Dispatched: "out_for_delivery",
    OFD: "out_for_delivery",
    UNDEL_REATTEMPT: "ndr",
    PART_DEL: "out_for_delivery",         // partial delivery — still in flight
    DELIVERED: "delivered",
    Delivered: "delivered",

    // ── Return leg (forward shipment converted to return) ──
    RETURNED_INTRANSIT: "rto_initiated",
    RECEIVED_AT_RETURN_CENTER: "rto_in_transit",
    RETURN_OFD: "rto_in_transit",
    RETURN_DELIVERED: "rto_delivered",
    RTO: "rto_delivered",                 // forward → returned to origin (terminal)

    // ── Terminal failures ──
    LOST: "lost",
    Lost: "lost",
  },

  // ─── Xpressbees ─────────────────────────────────────────────
  // Franchise API status codes
  xpressbees: {
    "Shipment Booked": "booked",
    Manifested: "booked",
    "Picked Up": "pickup_initiated",
    "In Transit": "in_transit",
    "Reached at Destination": "in_transit",
    "Out for Delivery": "out_for_delivery",
    Delivered: "delivered",
    "Non Delivery": "ndr",
    Undelivered: "ndr",
    RTO: "rto_initiated",
    "RTO In Transit": "rto_in_transit",
    "RTO Delivered": "rto_delivered",
    Cancelled: "cancelled",
    Lost: "lost",
  },

  // ─── Xpressbees B2B ─────────────────────────────────────────
  // Tracking endpoint is shared with B2C (same /track_shipment), so the
  // status taxonomy is identical. Aliased to keep status resolution working
  // when an order's serviceProvider is "xpressbees_b2b".
  xpressbees_b2b: {
    "Shipment Booked": "booked",
    Manifested: "booked",
    "Picked Up": "pickup_initiated",
    "In Transit": "in_transit",
    "Reached at Destination": "in_transit",
    "Out for Delivery": "out_for_delivery",
    Delivered: "delivered",
    "Non Delivery": "ndr",
    Undelivered: "ndr",
    RTO: "rto_initiated",
    "RTO In Transit": "rto_in_transit",
    "RTO Delivered": "rto_delivered",
    Cancelled: "cancelled",
    Lost: "lost",
  },

  // ─── Ekart (Elite Ekart Logistics) ──────────────────────────
  // Webhook `track_updated` topic pushes a `status` string field.
  // Reference: https://app.elite.ekartlogistics.in/api/docs#operation/edit_webhook
  ekart: {
    Manifested: "booked",
    Booked: "booked",
    "Pickup Scheduled": "booked",
    "Picked Up": "pickup_initiated",
    "Pickup Done": "pickup_initiated",
    "In Transit": "in_transit",
    "Reached at Destination": "in_transit",
    "Out For Delivery": "out_for_delivery",
    "Out for Delivery": "out_for_delivery",
    Delivered: "delivered",
    "Delivered Successfully": "delivered",
    Undelivered: "ndr",
    "Delivery Attempted": "ndr",
    NDR: "ndr",
    RTO: "rto_initiated",
    "RTO Initiated": "rto_initiated",
    "RTO In Transit": "rto_in_transit",
    "RTO Out For Delivery": "rto_in_transit",
    "RTO Delivered": "rto_delivered",
    Returned: "rto_delivered",
    Cancelled: "cancelled",
    Lost: "lost",
  },

  // ─── DTDC (PX / B2C) ─────────────────────────────────────────
  // DTDC tracking response carries two status surfaces:
  //   1. `trackHeader.strStatus` — coarse header status (DELIVERED, ATTEMPTED,
  //      HELDUP, RTO, "DELIVERY PROCESS IN PROGRESS")
  //   2. `trackDetails[].strAction` — fine-grained event string per scan
  //      (Booked, Picked Up, In Transit, Out For Delivery, Delivered,
  //      Not Delivered, Heldup, Consignment Released, Consignment Has Returned,
  //      POD Dispatched, Pickup Awaited, Pickup Scheduled, Pickup Reassigned,
  //      Not Picked, etc.)
  // Both are folded into a single map; the resolver does a case-insensitive
  // lookup so "DELIVERED" and "Delivered" both hit.
  //
  // "Not Picked" (PCNO) is a FAILED PICKUP ATTEMPT, not a cancellation — the
  // consignment stays live and DTDC re-attempts on its own ("Pickup scheduled"
  // → "Pickup Rescheduled" → "Picked up", often the same or next day). It maps
  // to `booked`, the same bucket as the other pre-pickup scans, matching
  // Delhivery's "UD:Not Picked". Mapping it to `cancelled` froze live shipments
  // in a terminal status and refunded freight on parcels that then delivered.
  //
  // Two forms of status reach us and BOTH are keyed here:
  //   • Scan CODES  (strCode on the Pull API `trackDetails[]`, and strAction on
  //     the Push API `shipmentStatus[]`) — e.g. BKD, IPMF, OUTDLV, DLV, RTOIPMF.
  //     These are the authoritative, stable identifiers and are the source of
  //     truth for the normalizer (resolved via the bare-statusCode fallback in
  //     resolveOrderStatus). Codes come from DTDC's "TRACK SCAN DETAILS" sheet.
  //   • Human-readable ACTION strings (strAction on Pull, strActionDesc on Push)
  //     e.g. "Booked", "In Transit", "Out For Delivery" — kept as a fallback for
  //     when only the description is available.
  dtdc: {
    // ── Pre-pickup ──
    "Pickup Awaited": "booked",
    "Pickup Scheduled": "booked",
    "Pickup Reassigned": "booked",
    "Not Picked": "booked",     // failed pickup attempt — DTDC re-attempts
    "Picked Up": "pickup_initiated",

    // ── Booked / in-transit ──
    Booked: "booked",
    BOOKED: "booked",
    Dispatched: "in_transit",
    DISPATCHED: "in_transit",
    Received: "in_transit",
    RECEIVED: "in_transit",
    "In Transit": "in_transit",
    "Arrival At Airport": "in_transit",
    "Arrived At Airport": "in_transit",
    "Customs Cleared": "in_transit",
    "Customs HeldUp": "in_transit",
    "Mis Route": "in_transit",
    "Heldup At Customs": "ndr",

    // ── Last mile ──
    "Out For Delivery": "out_for_delivery",
    "Out for Delivery": "out_for_delivery",
    "DRS Prepared": "out_for_delivery",
    "DELIVERY PROCESS IN PROGRESS": "out_for_delivery",
    Delivered: "delivered",
    DELIVERED: "delivered",
    "Not Delivered": "ndr",
    ATTEMPTED: "ndr",
    Heldup: "ndr",
    HELDUP: "ndr",
    "Held UP": "ndr",
    "Consignment Released": "in_transit",
    "POD Dispatched": "delivered",

    // ── RTO leg ──
    RTO: "rto_initiated",
    "RTO Received": "rto_initiated",
    "RTO Processed & Forwarded": "rto_initiated",
    "Set RTO initiated": "rto_initiated",
    "Waiting For RTO Approval From Origin": "rto_initiated",
    "RTO In Transit": "rto_in_transit",
    "RTO Mis Route": "rto_in_transit",
    "RTO Reached At Destination": "rto_in_transit",
    "RTO Out For Delivery": "rto_in_transit",
    "RTO Returned/RTO Out For Delivery": "rto_in_transit",
    "RTO Delivered": "rto_delivered",
    "Consignment Has Returned": "rto_delivered",

    // ── Scan CODES (authoritative — from DTDC TRACK SCAN DETAILS sheet) ──
    // Pickup
    PCSC: "booked",             // Pickup Scheduled
    PCAW: "booked",             // Pickup Awaited
    PCRA: "booked",             // Pickup Reassigned
    PCUP: "pickup_initiated",   // Picked Up
    PCNO: "booked",             // Not Picked (failed attempt — pickup re-attempted)
    // Booked / forward in-transit
    BKD: "booked",              // Booked
    IPMF: "in_transit",         // In Transit (inbound manifest)
    OPMF: "in_transit",         // In Transit (outbound manifest)
    ORMF: "in_transit",
    IBMD: "in_transit",
    OBMD: "in_transit",
    IBMN: "in_transit",
    OBMN: "in_transit",
    IMBM: "in_transit",
    OMBM: "in_transit",
    IRBO: "in_transit",
    ORBO: "in_transit",
    CDIN: "in_transit",
    CDOUT: "in_transit",
    ARAP: "in_transit",         // Arrived At Airport
    CSCL: "in_transit",         // Customs Cleared
    CHLD: "in_transit",         // Customs HeldUp
    IRMF: "in_transit",         // Mis Route
    HLDUP: "ndr",               // Held UP
    // Last mile
    OUTDLV: "out_for_delivery", // Out For Delivery
    PREPERD: "out_for_delivery",// DRS Prepared
    NONDLV: "ndr",              // Not Delivered
    DLV: "delivered",           // Delivered
    // RTO leg
    IRTO: "rto_initiated",      // RTO Received
    SETRTO: "rto_initiated",    // Set RTO initiated
    RTOW: "rto_initiated",      // Waiting For RTO Approval From Origin
    // NB: scan code "RTO" (RTO Processed & Forwarded) shares the same key/value
    // as the action-string "RTO" above → intentionally not repeated here.
    RTOOPMF: "rto_in_transit",
    RTOIPMF: "rto_in_transit",
    RTOIRMF: "rto_in_transit",
    RTOORMF: "rto_in_transit",
    RTOOBMD: "rto_in_transit",
    RTOIBMD: "rto_in_transit",
    RTOOBMN: "rto_in_transit",
    RTOIBMN: "rto_in_transit",
    RTOOMBM: "rto_in_transit",
    RTOIMBM: "rto_in_transit",
    RTOORBO: "rto_in_transit",
    RTOIRBO: "rto_in_transit",
    RTOCDOUT: "rto_in_transit",
    RTOCDIN: "rto_in_transit",
    RTOINSCAN: "rto_in_transit",
    RTORADCDIN: "rto_in_transit",
    RTOOUTDLV: "rto_in_transit",  // RTO Out For Delivery
    RETURND: "rto_in_transit",    // RTO Returned/RTO Out For Delivery
    RTORETURND: "rto_in_transit",
    RTONONDLV: "rto_in_transit",  // return leg delivery to shipper failed — still returning
    RTODLV: "rto_delivered",      // RTO Delivered
  },

  // ─── Shipex ─────────────────────────────────────────────────
  // Shipex uses polling (no webhook), status from trackOrder response.
  // Shipex returns statuses in two flavours: titlecase ("Booked", "In Transit")
  // for human-readable events and SCREAMING_SNAKE_CASE ("BOOKED", "IN_TRANSIT")
  // for the master status enum. We map both to be safe — the API has been seen
  // returning either across endpoints.
  // Internal model has no "damaged" status, so DAMAGED variants map to "lost"
  // (closest terminal failure).
  shipexindia: {
    // titlecase variants
    new: "created",
    "Booked": "booked",
    "Ready To Ship": "booked",
    "Order Booked": "booked",
    Dispatched: "in_transit",
    "In Transit": "in_transit",
    "Out for Delivery": "out_for_delivery",
    Delivered: "delivered",
    Undelivered: "ndr",
    RTO: "rto_initiated",
    "RTO In Transit": "rto_in_transit",
    "RTO Delivered": "rto_delivered",
    Cancelled: "cancelled",

    // SCREAMING_SNAKE_CASE master enum (per Shipex /statuses API)
    NEW: "created",
    BOOKED: "booked",
    PICKUP_MANIFEST: "booked",
    READY_TO_SHIP: "booked",
    IN_TRANSIT: "in_transit",
    OUT_FOR_DELIVERY: "out_for_delivery",
    DELIVERED: "delivered",
    CANCELLED: "cancelled",
    LOST: "lost",
    DAMAGED: "lost",
    RTO_INITIATED: "rto_initiated",
    RTO_IN_TRANSIT: "rto_in_transit",
    RTO_DELIVERED: "rto_delivered",
    RTO_LOST: "lost",
    RTO_DAMAGED: "lost",
  },
};

/**
 * OFD (Out for Delivery) keyword detection.
 * Some couriers embed OFD info in remarks/instructions rather than status.
 */
const OFD_KEYWORDS = [
  "out for delivery",
  "ofd",
  "dispatched for delivery",
  "out_for_delivery",
  "last mile",
  "delivery dispatched",
  "drs generated",
];

export function isOutForDelivery(status: string, remark: string): boolean {
  const combined = `${status} ${remark}`.toLowerCase();
  return OFD_KEYWORDS.some((kw) => combined.includes(kw));
}

/**
 * NDR keyword detection — for couriers that embed NDR in remarks.
 */
const NDR_KEYWORDS = [
  "undelivered",
  "ndr",
  "attempt failed",
  "door closed",
  "customer not available",
  "address incorrect",
  "refused",
  "phone unreachable",
  "cod not ready",
  "premises closed",
  "rejected",
  "not delivered",
  "delivery failed",
];

export function isNdr(status: string, remark: string): boolean {
  const combined = `${status} ${remark}`.toLowerCase();
  return NDR_KEYWORDS.some((kw) => combined.includes(kw));
}

/**
 * RTO keyword detection.
 */
const RTO_KEYWORDS = [
  "rto",
  "return to origin",
  "rto_in_transit",
  "rto initiated",
  "rto delivered",
  "returned",
];

export function isRto(status: string, remark: string): boolean {
  const combined = `${status} ${remark}`.toLowerCase();
  return RTO_KEYWORDS.some((kw) => combined.includes(kw));
}

/**
 * Map a courier status → our internal status.
 *
 * For couriers like Delhivery whose webhook sends BOTH a status code (e.g.
 * StatusType "UD"/"RT"/"DL") and a status string (e.g. "In Transit"), we look
 * up the composite key `"<statusCode>:<courierStatus>"` first so that the same
 * status string can resolve differently depending on the leg of the shipment.
 *
 * Falls back to bare status lookup, then to keyword detection for OFD/NDR/RTO.
 */
/**
 * Case-insensitive lookup against a courier's status map.
 * Couriers are inconsistent about casing — Xpressbees docs sample shows
 * lowercase ("in transit") while their portal often displays titlecase
 * ("In Transit"), and the same message can flip between them across
 * webhook vs polling responses. Matching exact-case first preserves
 * intentional distinctions (e.g. composite Delhivery keys like
 * "UD:In Transit"), then falls back to a case-insensitive sweep.
 */
function lookupStatus(
  map: Record<string, OrderStatus>,
  key: string,
): OrderStatus | undefined {
  if (map[key]) return map[key];
  const lower = key.toLowerCase();
  for (const k of Object.keys(map)) {
    if (k.toLowerCase() === lower) return map[k];
  }
  return undefined;
}

export function resolveOrderStatus(
  provider: string,
  courierStatus: string,
  remark = "",
  statusCode?: string,
): OrderStatus | null {
  const map = courierStatusMap[provider];
  if (map) {
    // 1. Composite key (statusCode:courierStatus) — required for Delhivery to
    //    distinguish forward "In Transit" from RTO "In Transit", etc.
    if (statusCode) {
      const composite = lookupStatus(map, `${statusCode}:${courierStatus}`);
      if (composite) return composite;
    }
    // 2. Bare status string
    const bare = lookupStatus(map, courierStatus);
    if (bare) return bare;

    // 3. Bare status code — some couriers (e.g. DTDC) carry the authoritative
    //    status in a stable scan CODE (BKD, OUTDLV, DLV, RTOIPMF, …) rather than
    //    the free-text status string. Try it after the string lookup misses so
    //    intentional composite/string keys still win. Couriers whose maps have
    //    no code-shaped keys (Delhivery composite "UD:…", Ekart, etc.) simply
    //    miss here and fall through to keyword detection — no regression.
    if (statusCode) {
      const byCode = lookupStatus(map, statusCode);
      if (byCode) return byCode;
    }
  }

  // 4. Keyword fallback
  if (isOutForDelivery(courierStatus, remark)) return "out_for_delivery";
  if (isNdr(courierStatus, remark)) return "ndr";
  if (isRto(courierStatus, remark)) return "rto_initiated";

  return null;
}

/**
 * Maps our internal OrderStatus → the webhook event type.
 */
const STATUS_TO_WEBHOOK: Partial<Record<OrderStatus, WebhookEventType>> = {
  created: "order.created",
  booked: "order.booked",
  pickup_initiated: "order.pickup_initiated",
  shipped: "order.shipped",
  in_transit: "order.in_transit",
  out_for_delivery: "order.out_for_delivery",
  delivered: "order.delivered",
  ndr: "order.ndr",
  rto_initiated: "order.rto_initiated",
  rto_in_transit: "order.rto_in_transit",
  rto_delivered: "order.rto_delivered",
  cancelled: "order.cancelled",
  lost: "order.lost",
};

export function statusToWebhookEvent(status: OrderStatus): WebhookEventType | null {
  return STATUS_TO_WEBHOOK[status] ?? null;
}
