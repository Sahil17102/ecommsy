import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import type { users, orders } from "../../db/schema.js";

type UserRow = typeof users.$inferSelect;
type OrderRow = typeof orders.$inferSelect;

interface RateSnapshot {
  forward?: number;
  rto?: number;
  codCharges?: number;
  otherCharges?: number;
  freightCharge?: number;
  totalCharge?: number;
  zone?: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve from src/ (dev) or dist/ (prod) — assets live in src/assets/ always
const LOGO_PATH = path.resolve(__dirname, "../../assets/logo.png").replace("/dist/", "/src/");

interface BillingInvoicePdfInput {
  invoiceNumber: string;
  periodStart: Date;
  periodEnd: Date;
  user: UserRow;
  orders: OrderRow[];
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstRate: number;
  netPayable: number;
  totalFreight: number;
  totalCodCharges: number;
}

const PLATFORM_NAME = "Box and Beyond";
const PLATFORM_ADDRESS = "India";
const PLATFORM_GST = "";

const PAGE_WIDTH = 595.28;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(n: number): string {
  // PDFKit's built-in Helvetica doesn't support the ₹ glyph — use "Rs." instead
  return `Rs.${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function drawDivider(doc: PDFKit.PDFDocument, y: number, width = 0.5): number {
  doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).lineWidth(width).stroke("#cccccc");
  return y + 10;
}

export async function generateBillingInvoicePdf(input: BillingInvoicePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let y = 40;

    // ── Header with logo ──
    try {
      doc.image(LOGO_PATH, MARGIN, y, { height: 50 });
    } catch {
      // Fallback if logo file missing
      doc.fontSize(20).font("Helvetica-Bold").text(PLATFORM_NAME, MARGIN, y);
    }
    doc.fontSize(9).font("Helvetica").fillColor("#666666").text("BILLING INVOICE", 350, y + 10, { width: 205, align: "right" });
    doc.fillColor("#000000");
    y += 58;

    y = drawDivider(doc, y);

    // ── Invoice meta (two columns) ──
    const metaLeftX = MARGIN;
    const metaRightX = 350;

    doc.fontSize(9).font("Helvetica");
    doc.text(`Invoice No:`, metaLeftX, y, { continued: true }).font("Helvetica-Bold").text(` ${input.invoiceNumber}`);
    doc.font("Helvetica").text(`Date: ${formatDate(new Date())}`, metaRightX, y);
    y += 14;
    doc.text(`Period: ${formatDate(input.periodStart)} — ${formatDate(input.periodEnd)}`, metaLeftX, y);
    doc.text(`Total Orders: ${input.orders.length}`, metaRightX, y);
    y += 20;

    y = drawDivider(doc, y);

    // ── Bill From / Bill To ──
    const colWidth = CONTENT_WIDTH / 2 - 10;
    const rightX = MARGIN + colWidth + 20;

    doc.fontSize(8).font("Helvetica-Bold").fillColor("#666666");
    doc.text("BILL FROM", MARGIN, y);
    doc.text("BILL TO", rightX, y);
    y += 14;

    doc.fontSize(9).font("Helvetica-Bold").fillColor("#000000");
    doc.text(PLATFORM_NAME, MARGIN, y, { width: colWidth });
    doc.text(input.user.businessName || input.user.name || "—", rightX, y, { width: colWidth });
    y += 13;

    doc.font("Helvetica").fontSize(8).fillColor("#444444");
    doc.text(PLATFORM_ADDRESS, MARGIN, y, { width: colWidth });

    const userAddr = [input.user.address, [input.user.city, input.user.state].filter(Boolean).join(", ")].filter(Boolean).join("\n");
    doc.text(userAddr || "—", rightX, y, { width: colWidth });
    y += Math.max(13, doc.heightOfString(userAddr || "—", { width: colWidth }) + 2);

    if (PLATFORM_GST) {
      doc.text(`GST: ${PLATFORM_GST}`, MARGIN, y);
    }
    if (input.user.email) doc.text(`Email: ${input.user.email}`, rightX, y, { width: colWidth });
    y += 20;

    doc.fillColor("#000000");
    y = drawDivider(doc, y);

    // ── Order Table ──
    // Columns: Order ID | AWB | Type | Freight | COD | Date
    const cols = {
      orderId: { x: MARGIN, w: 90 },
      awb:     { x: 130, w: 170 },
      type:    { x: 305, w: 25 },
      freight: { x: 333, w: 60 },
      cod:     { x: 396, w: 60 },
      date:    { x: 460, w: 95 },
    };

    // Table header background
    doc.rect(MARGIN, y - 3, CONTENT_WIDTH, 16).fill("#f5f5f5");
    doc.fillColor("#333333").fontSize(7).font("Helvetica-Bold");
    doc.text("ORDER ID", cols.orderId.x + 4, y, { width: cols.orderId.w });
    doc.text("AWB", cols.awb.x, y, { width: cols.awb.w });
    doc.text("TYPE", cols.type.x, y, { width: cols.type.w });
    doc.text("FREIGHT", cols.freight.x, y, { width: cols.freight.w, align: "right" });
    doc.text("COD FEE", cols.cod.x, y, { width: cols.cod.w, align: "right" });
    doc.text("DATE", cols.date.x, y, { width: cols.date.w, align: "right" });
    y += 16;

    doc.fillColor("#000000");

    // Table rows
    doc.font("Helvetica").fontSize(7);
    for (let i = 0; i < input.orders.length; i++) {
      if (y > 720) {
        doc.addPage();
        y = 40;
      }

      const order = input.orders[i];
      const rate = (order.rateSnapshot as RateSnapshot | null) ?? {};
      const metadata = (order.metadata as Record<string, unknown> | null) ?? {};
      const orderDate =
        typeof metadata.orderDate === "string"
          ? (metadata.orderDate as string)
          : order.createdAt.toISOString().slice(0, 10);

      // Alternate row background
      if (i % 2 === 0) {
        doc.rect(MARGIN, y - 3, CONTENT_WIDTH, 14).fill("#fafafa");
        doc.fillColor("#000000");
      }

      doc.text(order.orderId, cols.orderId.x + 4, y, { width: cols.orderId.w - 4 });
      doc.fontSize(6).text(order.awb ?? "", cols.awb.x, y + 1, { width: cols.awb.w }).fontSize(7);
      doc.text(order.orderType, cols.type.x, y, { width: cols.type.w });
      doc.text(formatCurrency(Number(rate.freightCharge ?? 0)), cols.freight.x, y, { width: cols.freight.w, align: "right" });
      doc.text(formatCurrency(Number(rate.codCharges ?? 0)), cols.cod.x, y, { width: cols.cod.w, align: "right" });
      doc.text(orderDate, cols.date.x, y, { width: cols.date.w, align: "right" });
      y += 14;
    }

    y += 6;
    y = drawDivider(doc, y);

    // ── Totals ──
    const labelX = 340;
    const valX = 440;
    const valW = PAGE_WIDTH - MARGIN - valX;

    doc.fontSize(9).font("Helvetica").fillColor("#444444");
    doc.text("Total Freight:", labelX, y, { width: 100 });
    doc.text(formatCurrency(input.totalFreight), valX, y, { width: valW, align: "right" });
    y += 14;
    doc.text("Total COD Charges:", labelX, y, { width: 100 });
    doc.text(formatCurrency(input.totalCodCharges), valX, y, { width: valW, align: "right" });
    y += 16;

    doc.moveTo(labelX, y).lineTo(PAGE_WIDTH - MARGIN, y).lineWidth(0.3).stroke("#cccccc");
    y += 8;

    doc.fillColor("#000000").font("Helvetica-Bold");
    doc.text("Taxable Value:", labelX, y, { width: 100 });
    doc.text(formatCurrency(input.taxableValue), valX, y, { width: valW, align: "right" });
    y += 16;

    doc.font("Helvetica").fontSize(9).fillColor("#444444");
    if (input.gstRate > 0) {
      if (input.igst > 0) {
        doc.text(`IGST (${input.gstRate}%):`, labelX, y, { width: 100 });
        doc.text(formatCurrency(input.igst), valX, y, { width: valW, align: "right" });
        y += 14;
      } else {
        doc.text(`CGST (${input.gstRate / 2}%):`, labelX, y, { width: 100 });
        doc.text(formatCurrency(input.cgst), valX, y, { width: valW, align: "right" });
        y += 14;
        doc.text(`SGST (${input.gstRate / 2}%):`, labelX, y, { width: 100 });
        doc.text(formatCurrency(input.sgst), valX, y, { width: valW, align: "right" });
        y += 14;
      }
    }

    doc.moveTo(labelX, y).lineTo(PAGE_WIDTH - MARGIN, y).lineWidth(0.5).stroke("#333333");
    y += 10;

    // Total amount (highlighted)
    doc.rect(labelX - 8, y - 4, PAGE_WIDTH - MARGIN - labelX + 8, 24).fill("#f0f0f0");
    doc.fillColor("#000000").font("Helvetica-Bold").fontSize(11);
    doc.text("Total Amount:", labelX, y, { width: 100 });
    doc.text(formatCurrency(input.netPayable), valX, y, { width: valW, align: "right" });
    y += 32;

    // ── Footer note ──
    doc.fillColor("#999999").font("Helvetica").fontSize(7);
    doc.text(
      "This is a system-generated invoice. Charges were deducted from the seller's prepaid wallet at order creation.",
      MARGIN,
      y,
      { width: CONTENT_WIDTH, align: "center" },
    );

    doc.end();
  });
}
