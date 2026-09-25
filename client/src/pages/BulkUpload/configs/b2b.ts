import { ratesApi, type B2bAvailableCourier } from "@/lib/ratesApi";
import { ordersApi } from "@/lib/ordersApi";
import type { CreateOrderPayload, OrderProduct, OrderPackage, OrderInvoice } from "@/lib/ordersTypes";
import type { PickupAddress } from "@/pages/settings/pickup-addresses/types";
import type { BulkUploadConfig, GenericCourierOption, RowError, ValidatedRow } from "../types";

const MAX_BOXES = 3;
const MAX_PRODUCTS = 3;

interface B2BBase extends Omit<CreateOrderPayload, "courierId" | "pickupAddressId" | "rate"> {}

interface B2BCourier extends GenericCourierOption {
  raw: B2bAvailableCourier;
}

const BASE_COLUMNS = [
  "orderId", "orderDate", "paymentType",
  "companyName", "companyGst",
  "buyerName", "buyerPhone", "buyerEmail",
  "address", "address2", "city", "state", "pincode",
  "orderAmount", "codAmount",
  "warehouse_name", "courier_name",
  "preferredPickupDate", "preferredPickupTime",
  "invoice_number", "invoice_date", "invoice_value", "invoice_ebn", "invoice_ebn_expiry",
];

const BOX_COLUMNS = Array.from({ length: MAX_BOXES }, (_, i) => {
  const n = i + 1;
  return [`box_${n}_weight_kg`, `box_${n}_length_cm`, `box_${n}_breadth_cm`, `box_${n}_height_cm`];
}).flat();

const PRODUCT_COLUMNS = Array.from({ length: MAX_PRODUCTS }, (_, i) => {
  const n = i + 1;
  return [`product_${n}_name`, `product_${n}_price`, `product_${n}_quantity`, `product_${n}_hsn`, `product_${n}_taxRate`];
}).flat();

const TEMPLATE_COLUMNS = [...BASE_COLUMNS, ...BOX_COLUMNS, ...PRODUCT_COLUMNS] as const;

const REQUIRED_COLUMNS = [
  "orderId", "orderDate", "paymentType",
  "companyName",
  "buyerName", "buyerPhone",
  "address", "city", "state", "pincode",
  "orderAmount", "codAmount",
  "warehouse_name",
  "preferredPickupDate",
  "invoice_number", "invoice_date", "invoice_value",
  "box_1_weight_kg", "box_1_length_cm", "box_1_breadth_cm", "box_1_height_cm",
  "product_1_name", "product_1_price", "product_1_quantity",
] as const;

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9A-Z]$/;

function parsePackages(raw: Record<string, string>): { packages: OrderPackage[]; errors: RowError[] } {
  const packages: OrderPackage[] = [];
  const errors: RowError[] = [];
  for (let i = 1; i <= MAX_BOXES; i++) {
    const w = (raw[`box_${i}_weight_kg`] ?? "").trim();
    const l = (raw[`box_${i}_length_cm`] ?? "").trim();
    const b = (raw[`box_${i}_breadth_cm`] ?? "").trim();
    const h = (raw[`box_${i}_height_cm`] ?? "").trim();
    if (!w && !l && !b && !h) continue;
    const weight = Number(w), length = Number(l), breadth = Number(b), height = Number(h);
    if (!Number.isFinite(weight) || weight < 0.01) errors.push({ field: `box_${i}_weight_kg`, message: `Box ${i} weight (kg) must be ≥ 0.01` });
    if (!Number.isFinite(length) || length < 0.1) errors.push({ field: `box_${i}_length_cm`, message: `Box ${i} length invalid` });
    if (!Number.isFinite(breadth) || breadth < 0.1) errors.push({ field: `box_${i}_breadth_cm`, message: `Box ${i} breadth invalid` });
    if (!Number.isFinite(height) || height < 0.1) errors.push({ field: `box_${i}_height_cm`, message: `Box ${i} height invalid` });
    packages.push({ boxId: `BOX-${i}`, weight, length, breadth, height });
  }
  if (packages.length === 0) errors.push({ field: "box_1_weight_kg", message: "At least one box is required" });
  return { packages, errors };
}

function parseProducts(raw: Record<string, string>): { products: OrderProduct[]; errors: RowError[] } {
  const products: OrderProduct[] = [];
  const errors: RowError[] = [];
  for (let i = 1; i <= MAX_PRODUCTS; i++) {
    const name = (raw[`product_${i}_name`] ?? "").trim();
    const priceStr = (raw[`product_${i}_price`] ?? "").trim();
    const qtyStr = (raw[`product_${i}_quantity`] ?? "").trim();
    if (!name && !priceStr && !qtyStr) continue;
    const price = Number(priceStr);
    const qty = Number(qtyStr);
    if (!name) errors.push({ field: `product_${i}_name`, message: `Product ${i} name is required` });
    if (!Number.isFinite(price) || price < 0) errors.push({ field: `product_${i}_price`, message: `Product ${i} price invalid` });
    if (!Number.isFinite(qty) || qty < 1 || !Number.isInteger(qty)) errors.push({ field: `product_${i}_quantity`, message: `Product ${i} qty must be a positive integer` });
    const hsn = (raw[`product_${i}_hsn`] ?? "").trim() || undefined;
    const taxRateStr = (raw[`product_${i}_taxRate`] ?? "").trim();
    const taxRate = taxRateStr ? Number(taxRateStr) : undefined;
    if (taxRate !== undefined && (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100))
      errors.push({ field: `product_${i}_taxRate`, message: `Product ${i} tax rate must be 0–100` });
    products.push({ name, unitPrice: price, quantity: qty, hsn, taxRate });
  }
  if (products.length === 0) errors.push({ field: "product_1_name", message: "At least one product is required" });
  return { products, errors };
}

function validateRow(raw: Record<string, string>, pickups: PickupAddress[]): ValidatedRow<B2BBase> {
  const errors: RowError[] = [];
  const req = (key: string, label = key) => {
    const v = (raw[key] ?? "").trim();
    if (!v) errors.push({ field: key, message: `${label} is required` });
    return v;
  };
  const num = (key: string, label = key, min = 0) => {
    const v = (raw[key] ?? "").trim();
    if (!v) { errors.push({ field: key, message: `${label} is required` }); return NaN; }
    const n = Number(v);
    if (!Number.isFinite(n) || n < min) { errors.push({ field: key, message: `${label} must be ≥ ${min}` }); return NaN; }
    return n;
  };

  const orderId = req("orderId", "Order ID");
  const orderDate = req("orderDate", "Order Date");
  const paymentType = req("paymentType", "Payment Type").toLowerCase();
  if (paymentType && paymentType !== "prepaid" && paymentType !== "cod") {
    errors.push({ field: "paymentType", message: "Payment Type must be 'prepaid' or 'cod'" });
  }

  const companyName = req("companyName", "Company Name");
  const companyGst = (raw.companyGst ?? "").trim() || undefined;
  if (companyGst && !GSTIN_RE.test(companyGst)) errors.push({ field: "companyGst", message: "Invalid GSTIN format" });

  const buyerName = req("buyerName", "Buyer Name");
  const buyerPhone = req("buyerPhone", "Buyer Phone");
  if (buyerPhone && !/^[6-9]\d{9}$/.test(buyerPhone)) errors.push({ field: "buyerPhone", message: "Phone must be a 10-digit Indian mobile" });
  const address = req("address", "Address");
  if (address && address.length < 5) errors.push({ field: "address", message: "Address ≥ 5 chars" });
  const city = req("city", "City");
  const state = req("state", "State");
  const pincode = req("pincode", "Pincode");
  if (pincode && !/^\d{6}$/.test(pincode)) errors.push({ field: "pincode", message: "Pincode must be 6 digits" });

  const orderAmount = num("orderAmount", "Order Amount");
  const codAmount = paymentType === "cod" ? num("codAmount", "COD Amount") : Number(raw.codAmount ?? 0) || 0;
  const preferredPickupDate = req("preferredPickupDate", "Preferred Pickup Date");
  const preferredPickupTime = (raw.preferredPickupTime ?? "").trim() || undefined;

  const warehouseName = req("warehouse_name", "Warehouse Name");
  let pickup: PickupAddress | undefined;
  if (warehouseName) {
    const needle = warehouseName.trim().toLowerCase();
    pickup = pickups.find((p) => p.nickname.trim().toLowerCase() === needle);
    if (!pickup) errors.push({ field: "warehouse_name", message: `No saved pickup named "${warehouseName}"` });
  }

  // Invoice (single; extend to many later if needed)
  const invoiceNumber = req("invoice_number", "Invoice Number");
  const invoiceDate = req("invoice_date", "Invoice Date");
  const invoiceValue = num("invoice_value", "Invoice Value");
  const invoice_ebn = (raw.invoice_ebn ?? "").trim() || undefined;
  const invoice_ebn_expiry = (raw.invoice_ebn_expiry ?? "").trim() || undefined;

  const { packages, errors: packageErrors } = parsePackages(raw);
  errors.push(...packageErrors);
  const { products, errors: productErrors } = parseProducts(raw);
  errors.push(...productErrors);

  const itemsSummary = packages.length
    ? `${packages.length} box${packages.length > 1 ? "es" : ""} · ${products.length} SKU${products.length > 1 ? "s" : ""}`
    : "—";

  if (errors.length) return { errors, pickup, itemsSummary };

  // Aggregate top-level weight/dims from boxes (grams + max box dims as a rough summary).
  const totalWeightG = Math.round(packages.reduce((s, p) => s + p.weight * 1000, 0));
  const maxBox = packages.reduce((m, p) => ({
    length: Math.max(m.length, p.length),
    breadth: Math.max(m.breadth, p.breadth),
    height: Math.max(m.height, p.height),
  }), { length: 0, breadth: 0, height: 0 });
  const volumetricG = Math.ceil(packages.reduce((s, p) => s + (p.length * p.breadth * p.height / 5) * 1000, 0));
  const chargeableWeight = Math.max(totalWeightG, volumetricG);

  const invoices: OrderInvoice[] = [{
    invoiceNumber,
    invoiceDate,
    invoiceValue,
    ebn: invoice_ebn,
    ebnExpiry: invoice_ebn_expiry,
  }];

  const base: B2BBase = {
    orderId, orderDate,
    orderType: "B2B",
    paymentType: paymentType as "prepaid" | "cod",
    buyerName, buyerPhone,
    buyerEmail: (raw.buyerEmail ?? "").trim() || undefined,
    address,
    address2: (raw.address2 ?? "").trim() || undefined,
    city, state, pincode,
    weight: totalWeightG,
    length: maxBox.length, breadth: maxBox.breadth, height: maxBox.height,
    chargeableWeight,
    products,
    orderAmount, codAmount,
    preferredPickupDate, preferredPickupTime,
    companyName, companyGst,
    packages,
    invoices,
  };

  return {
    errors, pickup, itemsSummary, base,
    extras: {
      "Boxes": String(packages.length),
      "Invoice": invoiceNumber,
    },
  };
}

export const b2bBulkConfig: BulkUploadConfig<B2BBase, B2BCourier, CreateOrderPayload> = {
  flow: "B2B",
  title: "Bulk B2B Upload",
  subtitle: "Upload up to 500 B2B orders. Each row can have multiple boxes and its own invoice.",
  backTo: "/orders/b2b",

  requiredColumns: REQUIRED_COLUMNS,
  templateColumns: TEMPLATE_COLUMNS,
  templateFileName: "b2b-bulk-upload-template.xlsx",

  validateRow,

  fetchCouriers: async (base, pickup) => {
    const list = await ratesApi.getB2bAvailableCouriers({
      origin: pickup.pincode,
      destination: base.pincode,
      packages: (base.packages ?? []).map((p) => ({
        weight: p.weight, length: p.length, breadth: p.breadth, height: p.height,
      })),
      paymentType: base.paymentType,
      orderAmount: base.orderAmount,
    });
    return list.map((c) => ({ courierId: c.courierId, name: c.name, totalCharge: c.rate.total, raw: c }));
  },

  matchCourierByPreference: (list, raw) => {
    const preference = (raw.courier_name ?? "").trim().toLowerCase();
    if (!preference) return undefined;
    return list.find((c) => c.name.toLowerCase() === preference)
      ?? list.find((c) => c.name.toLowerCase().includes(preference));
  },

  toPayload: (row) => {
    const c = row.selectedCourier!.raw;
    return {
      ...row.base!,
      courierId: c.courierId,
      pickupAddressId: row.pickup!.id,
      chargeableWeight: c.billableWeight,
      rate: {
        forward: c.rate.baseFreight,
        rto: c.rate.rtoRate,
        codCharges: 0,
        otherCharges: c.rate.overheads.reduce((s, o) => s + o.amount, 0),
        freightCharge: c.rate.baseFreight,
        totalCharge: c.rate.total,
        zone: c.zone?.originCode ?? "",
      },
      chargesBreakdown: {
        baseFreight: c.rate.baseFreight,
        overheads: c.rate.overheads,
        total: c.rate.total,
      },
    };
  },

  submit: (payloads) => ordersApi.bulkCreateB2B(payloads),
};
