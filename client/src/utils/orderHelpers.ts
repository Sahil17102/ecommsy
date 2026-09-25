/** Generate order ID like "ORD-48291" */
export function generateOrderId(): string {
  let num = String(Math.floor(Math.random() * 9) + 1);
  for (let i = 1; i < 5; i++) {
    num += String(Math.floor(Math.random() * 10));
  }
  return `ORD-${num}`;
}

/** Generate 10-digit invoice number like "INV-4829173056" */
export function generateInvoiceNumber(): string {
  let num = String(Math.floor(Math.random() * 9) + 1);
  for (let i = 1; i < 10; i++) {
    num += String(Math.floor(Math.random() * 10));
  }
  return `INV-${num}`;
}

/** Format today's date as YYYY-MM-DD for input[type=date] */
export function getTodayDate(): string {
  // Build from LOCAL date parts — toISOString() would give the UTC date, which
  // is "yesterday" for IST users after midnight and fails the not-in-past check.
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Calculate volumetric weight in kg from dimensions in cm */
export function calcVolumetricWeight(l: number, b: number, h: number): number {
  return (l * b * h) / 5000;
}

/** Calculate chargeable weight with 0.5 kg minimum */
export function calcChargeableWeight(
  actualKg: number,
  volumetricKg: number,
): number {
  return Math.max(actualKg, volumetricKg, 0.5);
}

/** Calculate product subtotal */
export function calcSubtotal(
  products: { unitPrice: number; quantity: number }[],
): number {
  return products.reduce(
    (sum, p) => sum + (p.unitPrice || 0) * (p.quantity || 0),
    0,
  );
}

/** Format currency in INR — never renders "₹NaN" for a missing value. */
export function formatCurrency(amount: number | string | null | undefined): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value);
}
