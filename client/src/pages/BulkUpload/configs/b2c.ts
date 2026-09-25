import { ratesApi, type AvailableCourier } from "@/lib/ratesApi";
import { ordersApi } from "@/lib/ordersApi";
import type { CreateOrderPayload, OrderProduct } from "@/lib/ordersTypes";
import type { PickupAddress } from "@/pages/settings/pickup-addresses/types";
import type { BulkUploadConfig, GenericCourierOption, RowError, ValidatedRow } from "../types";

const MAX_PRODUCTS = 3;

interface B2CBase extends Omit<CreateOrderPayload, "courierId" | "pickupAddressId" | "rate"> {}

interface B2CCourier extends GenericCourierOption {
  raw: AvailableCourier;
}

const BASE_COLUMNS = [
  "orderId", "orderDate", "paymentType",
  "buyerName", "buyerPhone", "buyerEmail",
  "address", "address2", "city", "state", "pincode",
  "weight_grams", "length_cm", "breadth_cm", "height_cm",
  "orderAmount", "codAmount",
  "warehouse_name", "courier_name",
  "preferredPickupDate", "preferredPickupTime",
];

const PRODUCT_COLUMNS = Array.from({ length: MAX_PRODUCTS }, (_, i) => {
  const n = i + 1;
  return [`product_${n}_name`, `product_${n}_price`, `product_${n}_quantity`, `product_${n}_hsn`, `product_${n}_taxRate`];
}).flat();

const TEMPLATE_COLUMNS = [...BASE_COLUMNS, ...PRODUCT_COLUMNS] as const;

const REQUIRED_COLUMNS = [
  "orderId", "orderDate", "paymentType",
  "buyerName", "buyerPhone",
  "address", "city", "state", "pincode",
  "weight_grams", "length_cm", "breadth_cm", "height_cm",
  "orderAmount", "codAmount",
  "warehouse_name",
  "preferredPickupDate",
  "product_1_name", "product_1_price", "product_1_quantity",
] as const;

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
    if (!Number.isFinite(qty) || qty < 1 || !Number.isInteger(qty))
      errors.push({ field: `product_${i}_quantity`, message: `Product ${i} qty must be a positive integer` });
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

function validateRow(raw: Record<string, string>, pickups: PickupAddress[]): ValidatedRow<B2CBase> {
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
  const buyerName = req("buyerName", "Buyer Name");
  const buyerPhone = req("buyerPhone", "Buyer Phone");
  if (buyerPhone && !/^[6-9]\d{9}$/.test(buyerPhone)) {
    errors.push({ field: "buyerPhone", message: "Phone must be a 10-digit Indian mobile" });
  }
  const address = req("address", "Address");
  if (address && address.length < 5) errors.push({ field: "address", message: "Address ≥ 5 chars" });
  const city = req("city", "City");
  const state = req("state", "State");
  const pincode = req("pincode", "Pincode");
  if (pincode && !/^\d{6}$/.test(pincode)) errors.push({ field: "pincode", message: "Pincode must be 6 digits" });

  const weight = num("weight_grams", "Weight (g)", 1);
  const length = num("length_cm", "Length (cm)", 0.1);
  const breadth = num("breadth_cm", "Breadth (cm)", 0.1);
  const height = num("height_cm", "Height (cm)", 0.1);
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

  const { products, errors: productErrors } = parseProducts(raw);
  errors.push(...productErrors);

  const itemsSummary = products.length
    ? `${products[0].name}${products.length > 1 ? ` +${products.length - 1}` : ""}`
    : "—";

  if (errors.length) return { errors, pickup, itemsSummary };

  const chargeableWeight = Math.ceil(Math.max(weight, (length * breadth * height) / 5));
  const base: B2CBase = {
    orderId, orderDate,
    orderType: "B2C",
    paymentType: paymentType as "prepaid" | "cod",
    buyerName, buyerPhone,
    buyerEmail: (raw.buyerEmail ?? "").trim() || undefined,
    address,
    address2: (raw.address2 ?? "").trim() || undefined,
    city, state, pincode,
    weight, length, breadth, height, chargeableWeight,
    products,
    orderAmount, codAmount,
    preferredPickupDate, preferredPickupTime,
  };
  return { errors, pickup, itemsSummary, base };
}

export const b2cBulkConfig: BulkUploadConfig<B2CBase, B2CCourier, CreateOrderPayload> = {
  flow: "B2C",
  title: "Bulk B2C Upload",
  subtitle: "Upload up to 500 B2C orders. Each row can use its own pickup location, courier, and product list.",
  backTo: "/orders/b2c",

  requiredColumns: REQUIRED_COLUMNS,
  templateColumns: TEMPLATE_COLUMNS,
  templateFileName: "b2c-bulk-upload-template.xlsx",

  validateRow,

  fetchCouriers: async (base, pickup) => {
    const list = await ratesApi.getAvailableCouriers({
      origin: pickup.pincode,
      destination: base.pincode,
      weight: base.weight,
      length: base.length,
      breadth: base.breadth,
      height: base.height,
      paymentType: base.paymentType,
      orderAmount: base.orderAmount,
      orderType: "B2C",
    });
    return list.map((c) => ({ courierId: c.courierId, name: c.name, totalCharge: c.rate.totalCharge, raw: c }));
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
      chargeableWeight: c.chargeableWeight,
      rate: {
        forward: c.rate.forward,
        rto: c.rate.rto,
        codCharges: c.rate.codCharges,
        otherCharges: c.rate.otherCharges,
        freightCharge: c.rate.freightCharge,
        totalCharge: c.rate.totalCharge,
        zone: c.zone.code,
      },
    };
  },

  submit: (payloads) => ordersApi.bulkCreate(payloads),
};
