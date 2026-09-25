/** Field categories for the UI */
export interface FieldCategory {
  id: string;
  label: string;
  description: string;
  fields: { key: string; label: string }[];
}

export const FIELD_CATEGORIES: FieldCategory[] = [
  {
    id: "order",
    label: "Order Details",
    description: "Basic order information",
    fields: [
      { key: "orderId", label: "Order ID" },
      { key: "orderDate", label: "Order Date" },
      { key: "orderType", label: "Order Type" },
      { key: "paymentType", label: "Payment Type" },
      { key: "status", label: "Status" },
      { key: "awb", label: "AWB Number" },
      { key: "serviceProvider", label: "Courier Partner" },
    ],
  },
  {
    id: "customer",
    label: "Customer & Delivery",
    description: "Customer info and delivery address",
    fields: [
      { key: "customerName", label: "Customer Name" },
      { key: "customerPhone", label: "Customer Phone" },
      { key: "customerEmail", label: "Customer Email" },
      { key: "deliveryCity", label: "Delivery City" },
      { key: "deliveryState", label: "Delivery State" },
      { key: "deliveryPincode", label: "Delivery Pincode" },
      { key: "deliveryAddress1", label: "Address Line 1" },
      { key: "deliveryAddress2", label: "Address Line 2" },
    ],
  },
  {
    id: "package",
    label: "Package Dimensions",
    description: "Weight and dimensions",
    fields: [
      { key: "weight", label: "Weight (g)" },
      { key: "length", label: "Length (cm)" },
      { key: "breadth", label: "Breadth (cm)" },
      { key: "height", label: "Height (cm)" },
      { key: "chargeableWeight", label: "Chargeable Weight (g)" },
    ],
  },
  {
    id: "financial",
    label: "Financial",
    description: "Charges, amounts, and billing",
    fields: [
      { key: "orderAmount", label: "Order Amount" },
      { key: "codAmount", label: "COD Amount" },
      { key: "forwardCharge", label: "Forward Charge" },
      { key: "rtoCharge", label: "RTO Charge" },
      { key: "codCharges", label: "COD Charges" },
      { key: "freightCharge", label: "Freight Charge" },
      { key: "otherCharges", label: "Other Charges" },
      { key: "totalCharge", label: "Total Charge" },
      { key: "zone", label: "Zone" },
    ],
  },
  {
    id: "cod_rto",
    label: "COD & RTO",
    description: "Collection and return tracking",
    fields: [
      { key: "codCollected", label: "COD Collected" },
      { key: "codCollectedAmount", label: "COD Collected Amount" },
      { key: "rtoStatus", label: "RTO Status" },
      { key: "rtoRemarks", label: "RTO Remarks" },
      { key: "ndrReason", label: "NDR Reason" },
    ],
  },
  {
    id: "dates",
    label: "Timestamps",
    description: "Key event dates",
    fields: [
      { key: "createdAt", label: "Created At" },
      { key: "shippedAt", label: "Shipped At" },
      { key: "deliveredAt", label: "Delivered At" },
      { key: "cancelledAt", label: "Cancelled At" },
      { key: "pickupRequestedAt", label: "Pickup Requested At" },
    ],
  },
  {
    id: "b2b",
    label: "B2B",
    description: "Business-to-business fields",
    fields: [
      { key: "companyName", label: "Company Name" },
      { key: "companyGst", label: "Company GST" },
    ],
  },
];

/** All field keys across all categories */
export const ALL_FIELD_KEYS = FIELD_CATEGORIES.flatMap((cat) => cat.fields.map((f) => f.key));

/** Quick presets — admin POV */
export interface ReportPreset {
  id: string;
  label: string;
  description: string;
  keys: string[];
}

export const REPORT_PRESETS: ReportPreset[] = [
  {
    id: "platform_overview",
    label: "Platform Overview",
    description: "Cross-merchant order, status, courier and delivery snapshot",
    keys: [
      "orderId", "orderDate", "status", "orderType", "paymentType",
      "awb", "serviceProvider",
      "deliveryCity", "deliveryState", "deliveryPincode",
      "shippedAt", "deliveredAt",
    ],
  },
  {
    id: "revenue_billing",
    label: "Revenue & Billing",
    description: "All charges, freight, COD, and totals across merchants",
    keys: [
      "orderId", "orderDate", "status", "paymentType",
      "orderAmount", "codAmount",
      "forwardCharge", "rtoCharge", "codCharges",
      "freightCharge", "otherCharges", "totalCharge", "zone",
      "codCollected", "codCollectedAmount",
    ],
  },
  {
    id: "courier_performance",
    label: "Courier Performance",
    description: "Track delivery times, NDR and RTO outcomes by courier",
    keys: [
      "orderId", "awb", "serviceProvider", "status",
      "deliveryCity", "deliveryState",
      "createdAt", "shippedAt", "deliveredAt",
      "ndrReason", "rtoStatus",
    ],
  },
  {
    id: "ndr_rto_audit",
    label: "NDR & RTO Audit",
    description: "Failed deliveries and returns for ops review",
    keys: [
      "orderId", "orderDate", "status", "awb", "serviceProvider",
      "customerName", "customerPhone",
      "deliveryCity", "deliveryState", "deliveryPincode",
      "ndrReason", "rtoStatus", "rtoRemarks", "rtoCharge",
    ],
  },
  {
    id: "all_fields",
    label: "All Fields",
    description: "Export everything",
    keys: [], // Special: selects all available fields
  },
];

/**
 * Maximum date range allowed for a single report (must match server constant
 * MAX_DATE_RANGE_DAYS in server/src/services/reports.service.ts).
 */
export const MAX_REPORT_RANGE_DAYS = 186;

/** Date preset options — all within the 6-month server limit */
export const DATE_PRESETS = [
  { label: "Today", days: 0 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 6 months", days: 180 },
] as const;

/**
 * Format a Date as YYYY-MM-DD in the *local* calendar, not UTC. `toISOString()`
 * would roll back a day for any IST clock time before 05:30, making the "Today"
 * preset silently ask for yesterday.
 */
function toLocalDateString(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function getDateRange(days: number): { from: string; to: string } {
  const toStr = toLocalDateString(new Date());

  if (days === 0) return { from: toStr, to: toStr };

  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: toLocalDateString(from), to: toStr };
}

/** Returns the inclusive day-count between two YYYY-MM-DD strings, or null if invalid */
export function daysBetween(from: string, to: string): number | null {
  if (!from || !to) return null;
  const f = new Date(from);
  const t = new Date(to);
  if (isNaN(f.getTime()) || isNaN(t.getTime()) || t < f) return null;
  return Math.floor((t.getTime() - f.getTime()) / (1000 * 60 * 60 * 24));
}

export const PAYMENT_OPTIONS = [
  { value: "prepaid", label: "Prepaid" },
  { value: "cod", label: "COD" },
];

export const ORDER_TYPE_OPTIONS = [
  { value: "", label: "All" },
  { value: "B2B", label: "B2B" },
  { value: "B2C", label: "B2C" },
];
