import PDFDocument from "pdfkit";
import { eq } from "drizzle-orm";
import { db } from "../../config/db.js";
import { orders, pickupAddresses, labelSettings, users } from "../../db/schema.js";
import { generateBarcodePng } from "./barcode.js";
import { fetchLogoBuffer, formatServiceProvider } from "./labelGenerator.js";

type OrderRow = typeof orders.$inferSelect;

interface OrderAddress {
  contactName?: string;
  phone?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  gstNumber?: string;
}

interface OrderProduct {
  name: string;
  unitPrice: number;
  quantity: number;
  hsn?: string;
  taxRate?: number;
}

interface OrderDimensions {
  length?: number;
  breadth?: number;
  height?: number;
}

interface RateSnapshot {
  forward?: number;
  rto?: number;
  codCharges?: number;
  otherCharges?: number;
  freightCharge?: number;
  totalCharge?: number;
  zone?: string;
}

const INK = "#1a1a1a"; // near-black body text
const MUTED = "#6b7280"; // secondary labels
const HAIR = "#d1d5db"; // visible rules / borders
const FAINT = "#e5e7eb"; // light separators
const HEAD = "#f3f4f6"; // light table-header / totals fill

/**
 * Currency prefix. The standard PDF Helvetica font uses WinAnsi encoding,
 * which has no Rupee glyph (₹, U+20B9), so we use "Rs." for reliable rendering.
 */
const RS = "Rs. ";

/**
 * Convert an integer rupee amount to Indian-format words
 * (e.g. 123456 → "One Lakh Twenty Three Thousand Four Hundred Fifty Six").
 */
function rupeesToWords(amount: number): string {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const twoDigits = (n: number): string => {
    if (n < 20) return ones[n];
    return `${tens[Math.floor(n / 10)]}${n % 10 ? " " + ones[n % 10] : ""}`;
  };
  const threeDigits = (n: number): string => {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return `${h ? ones[h] + " Hundred" + (rest ? " " : "") : ""}${rest ? twoDigits(rest) : ""}`;
  };

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  if (rupees === 0 && paise === 0) return "Zero Rupees Only";

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = rupees % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));

  let words = parts.join(" ").trim() + " Rupees";
  if (paise) words += ` and ${twoDigits(paise)} Paise`;
  return words + " Only";
}

export interface InvoiceRenderData {
  orderId: string;
  awb: string;
  serviceProvider: string;
  orderDate: string;
  paymentMode: string;
  weightGrams: number;
  chargeableWeight: number;
  dimensions: OrderDimensions;
  deliveryAddress: OrderAddress;
  sellerName: string;
  logoBuffer: Buffer | null;
  pickupAddr: {
    contactName?: string | null;
    phone?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    gstNumber?: string | null;
  } | null;
  products: OrderProduct[];
  freightCharge: number;
  codCharges: number;
  awbBarcodePng: Buffer | null;
}

/**
 * Pure renderer — draws a clean, conventional A4 GST tax invoice.
 *
 * Design goals (per client feedback): simple, professional, "like a real
 * invoice". A light document on white — seller logo + name in the header,
 * lightly-boxed party blocks, a single-fill table header (dark text on a pale
 * row), thin row rules, a right-aligned totals block with one emphasised grand
 * total, amount in words, and an authorised-signatory line. No heavy dark
 * bands or zebra striping.
 */
export function renderInvoicePdf(data: InvoiceRenderData): Promise<Buffer> {
  const {
    orderId,
    awb,
    serviceProvider,
    orderDate,
    paymentMode,
    weightGrams,
    chargeableWeight,
    dimensions,
    deliveryAddress: d,
    sellerName,
    logoBuffer,
    pickupAddr,
    products,
    freightCharge,
    codCharges,
    awbBarcodePng,
  } = data;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = 595.28; // A4
    const M = 40;
    const R = pageWidth - M;
    const contentWidth = R - M;
    let y = M;

    const money = (n: number) => `${RS}${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const rule = (yy: number, color = HAIR, width = 0.8) => {
      doc.strokeColor(color).lineWidth(width).moveTo(M, yy).lineTo(R, yy).stroke();
      doc.strokeColor(INK);
    };

    // ── Header: brand (left) + invoice title (right) ────────
    const headerTop = y;
    let brandY = headerTop;
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, M, headerTop, { fit: [150, 44] });
        brandY = headerTop + 48;
      } catch {
        /* ignore */
      }
    }
    if (sellerName) {
      doc.font("Helvetica-Bold").fontSize(logoBuffer ? 10 : 15).fillColor(INK)
        .text(sellerName, M, brandY, { width: contentWidth / 2 });
      brandY = doc.y;
    }

    doc.font("Helvetica-Bold").fontSize(20).fillColor(INK)
      .text("TAX INVOICE", M, headerTop, { width: contentWidth, align: "right" });
    doc.font("Helvetica").fontSize(8).fillColor(MUTED)
      .text("ORIGINAL FOR RECIPIENT", M, headerTop + 25, { width: contentWidth, align: "right" });

    // AWB barcode — prominent, top-right, black bars on white so it scans.
    let headerRightBottom = headerTop + 40;
    if (awbBarcodePng) {
      try {
        const bcW = 170;
        const bcX = R - bcW;
        doc.image(awbBarcodePng, bcX, headerTop + 38, { fit: [bcW, 34], align: "right" });
        doc.fontSize(9).font("Courier-Bold").fillColor(INK)
          .text(awb || "", bcX, headerTop + 74, { width: bcW, align: "center", characterSpacing: 1 });
        headerRightBottom = headerTop + 86;
      } catch {
        /* ignore */
      }
    }

    y = Math.max(brandY, headerRightBottom) + 12;
    rule(y, INK, 1.2);
    y += 14;

    // ── Invoice meta (left) + party "Ship From" anchor ──────
    const metaTop = y;
    const metaPairs: [string, string][] = [
      ["Invoice No.", `INV-${orderId}`],
      ["Invoice Date", orderDate],
      ["Order No.", orderId],
      ["AWB No.", awb || "-"],
      ["Payment", (paymentMode || "").toUpperCase() || "-"],
      ["Courier", serviceProvider || "-"],
    ];
    const metaColW = contentWidth / 3;
    metaPairs.forEach(([label, value], i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = M + col * metaColW;
      const ry = metaTop + row * 30;
      doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(label.toUpperCase(), x, ry, { width: metaColW - 8 });
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK).text(value, x, ry + 10, { width: metaColW - 8 });
    });
    y = metaTop + 30 * Math.ceil(metaPairs.length / 3) + 8;

    // ── Party blocks: Sold By / Bill & Ship To ──────────────
    const halfW = contentWidth / 2 - 8;
    const rightX = M + halfW + 16;
    const partyTop = y;

    const drawParty = (title: string, x: number, lines: string[]): number => {
      let py = partyTop;
      doc.fontSize(8).font("Helvetica-Bold").fillColor(MUTED).text(title, x, py, { width: halfW });
      py += 14;
      const kept = lines.filter(Boolean);
      kept.forEach((ln, idx) => {
        doc.font(idx === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(idx === 0 ? 10 : 9).fillColor(INK)
          .text(ln, x, py, { width: halfW });
        py += idx === 0 ? 14 : 12;
      });
      return py;
    };

    const fromLines = pickupAddr
      ? [
          sellerName || pickupAddr.contactName || "",
          pickupAddr.contactName && pickupAddr.contactName !== sellerName ? pickupAddr.contactName : "",
          pickupAddr.addressLine1 || "",
          pickupAddr.addressLine2 || "",
          `${pickupAddr.city || ""}, ${pickupAddr.state || ""} - ${pickupAddr.pincode || ""}`,
          pickupAddr.phone ? `Phone: ${pickupAddr.phone}` : "",
          pickupAddr.gstNumber ? `GSTIN: ${pickupAddr.gstNumber}` : "",
        ]
      : [sellerName || "-"];
    const toLines = [
      d.contactName || "",
      d.addressLine1 || "",
      d.addressLine2 || "",
      `${d.city || ""}, ${d.state || ""} - ${d.pincode || ""}`,
      d.phone ? `Phone: ${d.phone}` : "",
    ];

    const leftBottom = drawParty("SOLD BY / SHIP FROM", M, fromLines);
    const rightBottom = drawParty("BILL & SHIP TO", rightX, toLines);
    // divider between the two party columns
    const partyBottom = Math.max(leftBottom, rightBottom);
    doc.strokeColor(FAINT).lineWidth(0.8)
      .moveTo(M + halfW + 8, partyTop).lineTo(M + halfW + 8, partyBottom).stroke();
    doc.strokeColor(INK);
    y = partyBottom + 14;

    // ── Line-item table ─────────────────────────────────────
    const cols = {
      sn: { x: M, w: 26 },
      name: { x: M + 26, w: 190 },
      hsn: { x: M + 216, w: 60 },
      qty: { x: M + 276, w: 44 },
      price: { x: M + 320, w: 80 },
      tax: { x: M + 400, w: 45 },
      total: { x: M + 445, w: R - (M + 445) },
    };

    const headerH = 22;
    doc.rect(M, y, contentWidth, headerH).fill(HEAD);
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(8);
    doc.text("#", cols.sn.x + 4, y + 7, { width: cols.sn.w - 4 });
    doc.text("ITEM DESCRIPTION", cols.name.x, y + 7, { width: cols.name.w });
    doc.text("HSN", cols.hsn.x, y + 7, { width: cols.hsn.w });
    doc.text("QTY", cols.qty.x, y + 7, { width: cols.qty.w, align: "right" });
    doc.text("RATE", cols.price.x, y + 7, { width: cols.price.w, align: "right" });
    doc.text("TAX", cols.tax.x, y + 7, { width: cols.tax.w, align: "right" });
    doc.text("AMOUNT", cols.total.x, y + 7, { width: cols.total.w - 4, align: "right" });
    y += headerH;

    let subtotal = 0;
    let totalTax = 0;
    const rowH = 22;
    products.forEach((product, i) => {
      const unitPrice = Number(product.unitPrice ?? 0);
      const quantity = Number(product.quantity ?? 0);
      const taxRate = Number(product.taxRate ?? 0);
      const lineTotal = unitPrice * quantity;
      const taxAmount = taxRate ? (lineTotal * taxRate) / 100 : 0;
      subtotal += lineTotal;
      totalTax += taxAmount;

      const ty = y + 6;
      doc.font("Helvetica").fontSize(9).fillColor(INK);
      doc.text(String(i + 1), cols.sn.x + 4, ty, { width: cols.sn.w - 4 });
      doc.text(product.name, cols.name.x, ty, { width: cols.name.w - 6, ellipsis: true, height: 11 });
      doc.fillColor(MUTED).text(product.hsn || "-", cols.hsn.x, ty, { width: cols.hsn.w });
      doc.fillColor(INK);
      doc.text(String(quantity), cols.qty.x, ty, { width: cols.qty.w, align: "right" });
      doc.text(money(unitPrice), cols.price.x, ty, { width: cols.price.w, align: "right" });
      doc.text(taxRate ? `${taxRate}%` : "-", cols.tax.x, ty, { width: cols.tax.w, align: "right" });
      doc.text(money(lineTotal), cols.total.x, ty, { width: cols.total.w - 4, align: "right" });
      y += rowH;
      // thin separator between rows
      rule(y, FAINT, 0.5);
    });

    y += 14;

    // ── Totals (right-aligned) + amount in words (left) ─────
    const panelW = 230;
    const panelX = R - panelW;
    const labelW = panelW * 0.55;
    const grandTotal = subtotal + totalTax + freightCharge + codCharges;

    const totalRows: [string, string][] = [
      ["Subtotal", money(subtotal)],
      ...(totalTax > 0 ? ([["Tax", money(totalTax)]] as [string, string][]) : []),
      ...(freightCharge > 0 ? ([["Shipping", money(freightCharge)]] as [string, string][]) : []),
      ...(codCharges > 0 ? ([["COD Charges", money(codCharges)]] as [string, string][]) : []),
    ];

    const totalsTop = y;
    let py = y;
    totalRows.forEach(([label, value]) => {
      doc.font("Helvetica").fontSize(9.5).fillColor(MUTED).text(label, panelX, py, { width: labelW });
      doc.font("Helvetica").fontSize(9.5).fillColor(INK).text(value, panelX + labelW, py, { width: panelW - labelW, align: "right" });
      py += 17;
    });
    // grand-total band — single light fill, bold, with a top rule
    py += 2;
    doc.strokeColor(HAIR).lineWidth(0.8).moveTo(panelX, py).lineTo(R, py).stroke();
    doc.strokeColor(INK);
    py += 6;
    doc.rect(panelX, py - 2, panelW, 24).fill(HEAD);
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(11);
    doc.text("Grand Total", panelX + 8, py + 4, { width: labelW });
    doc.text(money(grandTotal), panelX, py + 4, { width: panelW - 8, align: "right" });
    py += 24;

    // amount in words, left column aligned to the totals block
    doc.font("Helvetica").fontSize(8).fillColor(MUTED).text("AMOUNT IN WORDS", M, totalsTop, { width: panelX - M - 16 });
    doc.font("Helvetica-Bold").fontSize(9).fillColor(INK)
      .text(rupeesToWords(grandTotal), M, totalsTop + 11, { width: panelX - M - 16 });

    y = py + 22;

    // ── Package info ────────────────────────────────────────
    rule(y, FAINT, 0.5);
    y += 8;
    doc.fontSize(8).font("Helvetica").fillColor(MUTED);
    doc.text(
      `Package: ${weightGrams}g  •  ${dimensions.length ?? 0} x ${dimensions.breadth ?? 0} x ${dimensions.height ?? 0} cm  •  Chargeable Weight: ${chargeableWeight}g`,
      M,
      y,
      { width: contentWidth },
    );
    y += 22;

    // ── Declaration (left) + Authorised signatory (right) ───
    const footTop = y;
    doc.fontSize(7.5).font("Helvetica").fillColor(MUTED).text(
      "Declaration: We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.",
      M,
      footTop,
      { width: contentWidth / 2 - 16 },
    );

    const signX = R - 170;
    doc.font("Helvetica").fontSize(8).fillColor(MUTED)
      .text(`For ${sellerName || "Seller"}`, signX, footTop, { width: 170, align: "right" });
    const signLineY = footTop + 36;
    doc.strokeColor(HAIR).lineWidth(0.6).moveTo(signX, signLineY).lineTo(R, signLineY).stroke();
    doc.strokeColor(INK);
    doc.font("Helvetica").fontSize(8).fillColor(INK)
      .text("Authorised Signatory", signX, signLineY + 4, { width: 170, align: "right" });

    const blockBottom = signLineY + 16;

    // ── Footer note ─────────────────────────────────────────
    // Anchor below the signature block, but keep it within the bottom margin
    // (A4 content area ends ~802pt) so it never spills onto a second page.
    const footerY = Math.min(blockBottom + 16, 788);
    rule(footerY - 8, FAINT, 0.5);
    doc.fontSize(7).font("Helvetica").fillColor(MUTED).text(
      "This is a computer-generated invoice and does not require a physical signature.",
      M,
      footerY,
      { width: contentWidth, align: "center" },
    );

    doc.end();
  });
}

/**
 * Generate a shipping invoice PDF for an order.
 * Fetches required data, then delegates layout to {@link renderInvoicePdf}.
 */
export async function generateInvoice(order: OrderRow): Promise<Buffer> {
  const [pickupAddr, awbBarcodePng, settings, sellerUser] = await Promise.all([
    order.pickupAddressId
      ? db.query.pickupAddresses.findFirst({ where: eq(pickupAddresses.id, order.pickupAddressId) })
      : Promise.resolve(undefined),
    order.awb
      ? generateBarcodePng(order.awb, { height: 9, scale: 3, includetext: false }).catch(() => null)
      : Promise.resolve(null),
    db.query.labelSettings.findFirst({ where: eq(labelSettings.userId, order.userId) }),
    db.query.users.findFirst({ where: eq(users.id, order.userId) }),
  ]);

  // Brand the invoice with the seller's logo from label settings (falls back to
  // the default platform logo), keeping it consistent with the shipping label.
  const logoBuffer = await fetchLogoBuffer(settings?.logoUrl);
  const sellerName = sellerUser?.businessName || pickupAddr?.contactName || "";

  const deliveryAddress = (order.deliveryAddress as OrderAddress | null) ?? {};
  const products = (order.items as OrderProduct[] | null) ?? [];
  const dimensions = (order.dimensions as OrderDimensions | null) ?? {};
  const rate = (order.rateSnapshot as RateSnapshot | null) ?? {};
  const metadata = (order.metadata as Record<string, unknown> | null) ?? {};
  const chargeableWeight = Number(metadata.chargeableWeight ?? order.weight ?? 0);
  const orderDate =
    typeof metadata.orderDate === "string"
      ? (metadata.orderDate as string)
      : order.createdAt.toISOString().slice(0, 10);
  const paymentMode = order.paymentMode ?? "";
  const freightCharge = Number(rate.freightCharge ?? 0);
  const codCharges = Number(rate.codCharges ?? 0);

  return renderInvoicePdf({
    orderId: order.orderId,
    awb: order.awb ?? "",
    serviceProvider: formatServiceProvider(order.serviceProvider),
    orderDate,
    paymentMode,
    weightGrams: Number(order.weight ?? 0),
    chargeableWeight,
    dimensions,
    deliveryAddress,
    sellerName,
    logoBuffer,
    pickupAddr: pickupAddr ?? null,
    products,
    freightCharge,
    codCharges,
    awbBarcodePng,
  });
}
