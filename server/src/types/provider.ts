export interface ServiceabilityParams {
  origin: string;
  destination: string;
  weight: number; // grams
  length?: number;
  breadth?: number;
  height?: number;
  paymentType: "prepaid" | "cod";
  orderAmount?: number;
}

export interface ServiceabilityResult {
  /** `service_providers.id` — the specific account row this check ran against. */
  accountId: string;
  /** Integration slug (e.g. "xpressbees"). Same across accounts of the same brand. */
  provider: string;
  serviceable: boolean;
  /** Courier names serviceable for this route (used by aggregators like ShipEx to filter at courier level) */
  serviceableCouriers?: string[];
  /** External courier IDs serviceable for this route (preferred for aggregators when available). */
  serviceableCourierIds?: string[];
}

export interface OrderCreationParams {
  /** Internal order ID from our system */
  orderId: string;
  orderType: "B2B" | "B2C";
  paymentType: "prepaid" | "cod";
  /** Invoice / order date (YYYY-MM-DD) */
  orderDate: string;

  // Pickup address
  pickup: {
    contactName: string;
    phone: string;
    email?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    /**
     * `pickup_addresses.nickname` — the name this warehouse is registered under
     * on the courier portal. Delhivery matches its `pickup_location` against
     * this exact string; without it the shipment is manifested with no pickup
     * address at all.
     */
    nickname?: string;
    /** Seller's GSTIN for this pickup location (printed on the courier's docs). */
    gstNumber?: string;
  };

  // Delivery address
  delivery: {
    name: string;
    phone: string;
    email?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };

  // Package
  weight: number; // grams
  length: number; // cm
  breadth: number; // cm
  height: number; // cm

  // Products & value
  products: Array<{
    name: string;
    unitPrice: number;
    quantity: number;
    hsn?: string;
    taxRate?: number;
  }>;
  orderAmount: number; // total collectible amount
  codAmount: number;   // COD amount (0 for prepaid)

  /** Freight / shipping charge from our rate calculation */
  shippingCharges?: number;
  /** COD handling charges from our rate calculation */
  codCharges?: number;
  /** Merchandise discount applied to the order (already reflected in orderAmount) */
  discount?: number;

  /** Preferred pickup date selected by user on FE (YYYY-MM-DD) */
  preferredPickupDate?: string;
  /** Preferred pickup time selected by user on FE (e.g. "04:45 PM") */
  preferredPickupTime?: string;

  // RTO address (return to origin)
  rtoAddress?: {
    contactName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };

  /** Courier-specific metadata from the Courier document */
  metaData?: Record<string, unknown>;

  // ── B2B-specific fields ──

  /** B2B multi-box packages */
  packages?: Array<{
    boxId: string;
    weight: number; // kg
    length: number; // cm
    breadth: number; // cm
    height: number; // cm
  }>;

  /** Buyer's company name (B2B) */
  companyName?: string;

  /** Buyer's GSTIN (B2B) */
  companyGst?: string;

  /** B2B invoice details */
  invoices?: Array<{
    invoiceNumber: string;
    invoiceDate: string;
    invoiceValue: number;
    ebn?: string;
    ebnExpiry?: string; // YYYY-MM-DD
  }>;
}

export interface OrderCreationResult {
  success: boolean;
  /** `service_providers.id` — the account this order was created against. */
  accountId: string;
  /** Integration slug (e.g. "xpressbees"). */
  provider: string;
  /** AWB / tracking number assigned by courier partner */
  awb?: string;
  /** Provider-side order/shipment reference ID */
  providerOrderId?: string;
  /** Human-readable error when success is false */
  error?: string;
  /** Raw response from the provider (for debugging) */
  rawResponse?: unknown;
}
