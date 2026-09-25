import type { Pagination } from "../service-providers/types";

export interface OrderAddress {
  contactName: string;
  phone: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

export interface OrderProduct {
  name: string;
  unitPrice: number;
  quantity: number;
  hsn?: string;
  taxRate?: number;
}

export interface OrderRate {
  forward: number;
  rto: number;
  codCharges: number;
  otherCharges: number;
  freightCharge: number;
  totalCharge: number;
  zone: string;
}

export interface OrderUser {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  businessName?: string;
}

export interface OrderCourier {
  id: string;
  name: string;
  serviceProvider: string;
  courierType?: string | null;
  logo?: string | null;
}

// Generic expand-key types. A field is only present when the caller passed
// `expand=<key>` on the request — keep them optional everywhere.
export type ExpandableOrderRelation = "user" | "courier" | "pickupAddress";

export interface OrderListItem {
  id: string;
  userId: string;
  courierId: string;
  pickupAddressId: string;
  orderId: string;
  orderType: "B2B" | "B2C";
  paymentType: "prepaid" | "cod";
  status: OrderStatus;
  serviceProvider: string;
  /** Seller-facing courier name resolved from `courierId` (null for legacy rows). */
  courierName: string | null;
  awb: string;
  deliveryAddress: OrderAddress;
  weight: number;
  chargeableWeight: number;
  products: OrderProduct[];
  orderAmount: number;
  codAmount: number;
  rate: OrderRate;
  createdAt: string;

  // Populated only when the request included the matching `expand=` key.
  user?: OrderUser | null;
  courier?: OrderCourier | null;
  pickupAddress?: PickupAddressDetail | null;
}

/**
 * The NDR list returns a plain order row plus the NDR context the table shows.
 * `user` and `pickupAddress` are always present here (no `expand` needed) —
 * the screen is useless without knowing whose parcel failed and where it
 * would return to.
 */
export interface NdrOrderListItem extends OrderListItem {
  ndrReason?: string | null;
  ndrRemarks?: string | null;
  ndrLocation?: string | null;
  ndrAttemptedAt?: string | null;
  ndrAttemptCount?: number | null;
}

/** The RTO list row — order plus the return context. */
export interface RtoOrderListItem extends OrderListItem {
  /** Where the parcel returns to, when the order carries its own RTO address. */
  rtoAddress?: PickupAddressDetail | null;
  rtoStatus?: "initiated" | "in_transit" | "delivered" | null;
  rtoReason?: string | null;
  rtoRemarks?: string | null;
  rtoCharges?: number | null;
  rtoUpdatedAt?: string | null;
  updatedAt?: string;
}

export type OrderStatus =
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

export interface OrderStats {
  total: number;
  created: number;
  processing: number;
  booked: number;
  pickup_initiated: number;
  shipped: number;
  in_transit: number;
  out_for_delivery: number;
  delivered: number;
  ndr: number;
  rto_initiated: number;
  rto_in_transit: number;
  rto_delivered: number;
  cancelled: number;
  lost: number;
  totalRevenue: number;
}

// ── Tracking & NDR/RTO types ──

export interface TrackingEvent {
  id: string;
  orderId: string;
  awb: string;
  statusCode: string;
  statusText: string;
  location?: string;
  remarks?: string;
  source: "webhook" | "admin" | "system" | "polling";
  courierEventCode?: string;
  eventTimestamp?: string;
  createdAt: string;
}

export interface NdrEventItem {
  id: string;
  orderId: string;
  awb: string;
  status: string;
  reason: string;
  remarks?: string;
  nextAction?: "reattempt" | "rto" | "reschedule";
  location?: string;
  attemptDate?: string;
  attemptCount: number;
  actionTaken?: string;
  actionTakenAt?: string;
  source: string;
  createdAt: string;
}

export interface RtoEventItem {
  id: string;
  orderId: string;
  awb: string;
  status: string;
  phase: "initiated" | "in_transit" | "delivered";
  reason?: string;
  remarks?: string;
  rtoCharges?: number;
  source: string;
  createdAt: string;
}

export interface ListOrdersResponse {
  orders: OrderListItem[];
  pagination: Pagination;
  stats: OrderStats;
}

// ── Single order detail ──

export interface PickupAddressDetail {
  id: string;
  nickname: string;
  contactName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface OrderPackage {
  boxId: string;
  quantity?: number;
  weight: number;
  length: number;
  breadth: number;
  height: number;
}

export interface OrderDetail extends OrderListItem {
  orderDate: string;
  length: number;
  breadth: number;
  height: number;
  pickupAddressId: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  updatedAt: string;
  // NDR/RTO fields
  ndrReason?: string;
  ndrAttemptedAt?: string;
  ndrNextAction?: string;
  rtoStatus?: "not_started" | "initiated" | "in_transit" | "delivered";
  rtoBilled?: boolean;
  rtoRemarks?: string;
  rtoReturnedAt?: string;
  rtoCharges?: number;
  codCollected?: boolean;
  codCollectedAmount?: number;
  pickupRequestedAt?: string;
  manifestUrl?: string;
  // B2B
  packages?: OrderPackage[];
}

export interface GetOrderDetailResponse {
  order: OrderDetail;
}

// ── Async CSV exports ──

export type ExportJobStatus = "queued" | "processing" | "completed" | "failed" | "expired";

export interface ExportJob {
  id: string;
  entity: string;
  requestedBy: string | null;
  /** The filter set the file was built from — also what "Re-run" replays. */
  filters: Record<string, string> | null;
  status: ExportJobStatus;
  totalRows: number;
  processedRows: number;
  fileName: string | null;
  fileSize: number | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  /** Only present on the history listing. */
  requestedByName?: string | null;
}

export interface ListExportJobsResponse {
  jobs: ExportJob[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
