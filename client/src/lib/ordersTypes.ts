export type OrderStatus =
  | "draft"
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

export interface Order {
  id: string;
  userId: string;
  orderId: string;
  orderType: "B2B" | "B2C";
  paymentType: "prepaid" | "cod";
  status: OrderStatus;
  courierId: string;
  serviceProvider: string;
  /** Seller-facing (admin-renamable) courier name; falls back to serviceProvider. */
  courierName?: string | null;
  awb: string;
  providerOrderId?: string;
  externalOrderId?: string | null;
  source?: string | null;
  orderDate?: string | null;
  pickupAddressId: string;
  deliveryAddress: OrderAddress;
  customer?: { name?: string; phone?: string; email?: string };
  rtoAddress?: (Partial<OrderAddress> & { nickname?: string | null }) | null;
  weight: number;
  length: number;
  breadth: number;
  height: number;
  chargeableWeight: number;
  products: OrderProduct[];
  orderAmount: number;
  codAmount: number;
  rate: OrderRate;
  labelUrl?: string;
  invoiceUrl?: string;
  manifestUrl?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  pickupRequestedAt?: string;
  // ── NDR / RTO context (present on the NDR and RTO list responses) ──
  ndrReason?: string;
  ndrRemarks?: string | null;
  ndrLocation?: string | null;
  ndrAttemptedAt?: string;
  ndrAttemptCount?: number | null;
  rtoStatus?: string;
  rtoReason?: string | null;
  rtoRemarks?: string | null;
  rtoCharges?: number | null;
  rtoUpdatedAt?: string | null;
  rtoReturnedAt?: string;
  /** The pickup location the shipment left from — where an RTO returns to. */
  pickupAddress?: (Partial<OrderAddress> & { nickname?: string | null }) | null;
  createdAt: string;
  updatedAt: string;
  // ── B2B-specific fields ──
  companyName?: string;
  companyGst?: string;
  packages?: OrderPackage[];
  invoices?: OrderInvoice[];
  chargesBreakdown?: ChargesBreakdown;
  metadata?: Record<string, unknown>;
}

export interface TrackingEvent {
  id: string;
  orderId: string;
  awb: string;
  statusCode: string;
  statusText: string;
  location?: string;
  remarks?: string;
  source: string;
  eventTimestamp?: string;
  createdAt: string;
}

export interface OrderPackage {
  boxId: string;
  quantity?: number; // number of identical boxes; defaults to 1
  weight: number; // kg per box
  length: number; // cm
  breadth: number; // cm
  height: number; // cm
}

export interface OrderInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  invoiceValue: number;
  ebn?: string;
  ebnExpiry?: string; // YYYY-MM-DD
  fileUrl?: string;
}

export interface ChargesBreakdown {
  baseFreight: number;
  overheads: Array<{
    code: string;
    name: string;
    type: string;
    amount: number;
  }>;
  total: number;
}

export interface CreateOrderPayload {
  orderId: string;
  orderDate: string;
  orderType: "B2B" | "B2C";
  paymentType: "prepaid" | "cod";

  // Delivery
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  pincode: string;

  // Package
  weight: number;
  length: number;
  breadth: number;
  height: number;
  chargeableWeight: number;

  // Products & value
  products: OrderProduct[];
  orderAmount: number;
  codAmount: number;
  discount?: number;

  // Courier & pickup
  courierId: string;
  pickupAddressId: string;
  preferredPickupDate: string;
  preferredPickupTime?: string;

  // Rate snapshot
  rate: OrderRate;

  // ── B2B-specific fields ──
  companyName?: string;
  companyGst?: string;
  packages?: OrderPackage[];
  invoices?: OrderInvoice[];
  chargesBreakdown?: ChargesBreakdown;
}
