import PDFDocument from "pdfkit";
import type { orders } from "../../db/schema.js";
import { generateBarcodePng } from "./barcode.js";
import logger from "../../config/logger.js";

type OrderRow = typeof orders.$inferSelect;

interface OrderProduct {
  name: string;
  quantity?: number;
}

/** Platform brand shown in the manifest title. */
const BRAND = "Searchcraft";

export interface ManifestMeta {
  /** Seller / business display name (e.g. "MAIN ADMIN RANCHI"). */
  sellerName: string;
  /** Carrier display name (e.g. "DELHIVERY"). */
  carrierName: string;
  /** Human-readable manifest identifier. */
  manifestNumber: string;
  /** Pre-formatted "generated on" timestamp string. */
  generatedAt: string;
}

// ── Layout constants (A4 portrait: 595.28 × 841.89pt) ──

const M = 40; // margin
const PAGE_W = 595.28;
const R = PAGE_W - M;
const CW = R - M;
const PAGE_BOTTOM = 792;

const INK = "#000000";
const MUTED = "#555555";
const FAINT = "#e5e7eb";

// Column geometry: S.no | Order no | AWB no | Contents | Barcode
const COL = {
  num:      { x: M,      w: 28  },
  order:    { x: M + 28, w: 92  },
  awb:      { x: M + 120, w: 92  },
  contents: { x: M + 212, w: 118 },
  barcode:  { x: M + 330, w: CW - 330 },
} as const;

const BARCODE_H = 34;
const ROW_PAD = 8;

function drawTableHeader(doc: InstanceType<typeof PDFDocument>, y: number): number {
  doc.rect(M, y - 2, CW, 15).fill("#f3f4f6");
  doc.fillColor(INK);

  doc.fontSize(8).font("Helvetica-Bold");
  doc.text("S.no",     COL.num.x + 2,    y, { width: COL.num.w });
  doc.text("Order no", COL.order.x,      y, { width: COL.order.w });
  doc.text("AWB no",   COL.awb.x,        y, { width: COL.awb.w });
  doc.text("Contents", COL.contents.x,   y, { width: COL.contents.w });
  doc.text("Barcode",  COL.barcode.x,    y, { width: COL.barcode.w });

  y += 15;
  doc.strokeColor("#9ca3af").lineWidth(0.6).moveTo(M, y).lineTo(R, y).stroke();
  doc.strokeColor(INK);
  return y + 5;
}

/** Build the per-order "Contents" text: one "<name> - <qty>" line per item. */
function buildContents(o: OrderRow): string {
  const items = (o.items as OrderProduct[] | null) ?? [];
  if (items.length === 0) return "-";
  return items
    .map((it) => {
      const name = (it.name ?? "").trim() || "Item";
      const qty = Number(it.quantity ?? 1) || 1;
      return `${name} - ${qty}`;
    })
    .join("\n");
}

/**
 * Draw the "To be filled by <carrier> logistics executive" hand-off section
 * with blank fill-in lines, matching the client's requested manifest layout.
 */
function drawHandoffSection(doc: InstanceType<typeof PDFDocument>, y: number, carrierName: string): void {
  // Dashed separator
  doc.save();
  doc.strokeColor("#9ca3af").lineWidth(1).dash(4, { space: 3 }).moveTo(M, y).lineTo(R, y).stroke();
  doc.undash();
  doc.restore();
  y += 8;

  doc.fontSize(9).font("Helvetica-Bold").fillColor(INK);
  doc.text(`To be filled by ${carrierName} logistics executive`, M, y, { width: CW, align: "center" });
  y += 14;

  doc.save();
  doc.strokeColor("#9ca3af").lineWidth(1).dash(4, { space: 3 }).moveTo(M, y).lineTo(R, y).stroke();
  doc.undash();
  doc.restore();
  y += 14;

  const colLX = M;
  const colRX = M + CW / 2 + 10;
  const labelSize = 8;
  const lineW = CW / 2 - 100;

  // Draws "<label>" then an underline to the right for a hand-written value.
  const field = (label: string, x: number, fy: number) => {
    doc.fontSize(labelSize).font("Helvetica").fillColor(INK);
    doc.text(label, x, fy, { width: 90 });
    const lineX = x + 92;
    doc.strokeColor("#9ca3af").lineWidth(0.6)
      .moveTo(lineX, fy + 9).lineTo(lineX + lineW, fy + 9).stroke();
    doc.strokeColor(INK);
  };

  const rows: Array<[string, string | null]> = [
    ["Pick up time:", "Total items picked:"],
    ["FE name:", "Seller name:"],
    ["FE signature:", "FE signature:"],
    ["FE phone:", null],
  ];
  for (const [left, right] of rows) {
    field(left, colLX, y);
    if (right) field(right, colRX, y);
    y += 20;
  }
}

/** One carrier's worth of a manifest — its own sheet inside the PDF. */
export interface ManifestGroup {
  orders: OrderRow[];
  meta: ManifestMeta;
}

/** Pre-render the AWB barcodes for a batch (async work must finish before drawing). */
async function renderBarcodes(orderRows: OrderRow[]): Promise<Array<Buffer | null>> {
  return Promise.all(
    orderRows.map(async (o) => {
      if (!o.awb) return null;
      try {
        return await generateBarcodePng(o.awb, { height: 12, scale: 3, includetext: false });
      } catch (err) {
        logger.warn(`[Manifest] Barcode failed for AWB ${o.awb}: ${err}`);
        return null;
      }
    }),
  );
}

/**
 * Generate a pickup manifest PDF for a batch of orders, matching the client's
 * requested format: a branded header with seller / carrier / manifest number,
 * a per-order table with a "Contents" column and a scannable AWB barcode, and
 * a hand-off section for the carrier's field executive to sign off on pickup.
 */
export async function generateManifest(orderRows: OrderRow[], meta: ManifestMeta): Promise<Buffer> {
  return generateManifestBook([{ orders: orderRows, meta }]);
}

/**
 * Render several manifests into ONE PDF, each starting on a fresh page.
 *
 * A pickup manifest is a per-carrier hand-off document — the DTDC executive
 * signs for DTDC shipments only — so a mixed-courier selection must not be
 * flattened into a single sheet listing "DTDC, DELHIVERY" as the carrier.
 * Sellers still get one file to print.
 */
export async function generateManifestBook(groups: ManifestGroup[]): Promise<Buffer> {
  const barcodesByGroup = await Promise.all(groups.map((g) => renderBarcodes(g.orders)));

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: M, bottom: M, left: M, right: M },
      autoFirstPage: false,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    groups.forEach((group, i) => {
      doc.addPage();
      drawManifestSheet(doc, group.orders, group.meta, barcodesByGroup[i]);
    });

    doc.end();
  });
}

/** Draw one carrier's manifest, starting at the top of the current page. */
function drawManifestSheet(
  doc: InstanceType<typeof PDFDocument>,
  orderRows: OrderRow[],
  meta: ManifestMeta,
  barcodes: Array<Buffer | null>,
): void {
  {
    let y = M;

    // ── Title ──
    doc.fontSize(16).font("Helvetica-Bold").fillColor(INK);
    doc.text(`${BRAND} Manifest`, M, y, { width: CW, align: "center" });
    y += 20;
    doc.fontSize(8).font("Helvetica").fillColor(MUTED);
    doc.text(`Generated on: ${meta.generatedAt}`, M, y, { width: CW, align: "center" });
    y += 16;

    // ── Meta rows: Seller / Carrier (left) + Manifest # / total (right) ──
    doc.fontSize(9).font("Helvetica").fillColor(INK);
    const halfW = CW / 2;
    doc.text(`Seller: ${meta.sellerName}`, M, y, { width: halfW });
    doc.text(`Manifest #: ${meta.manifestNumber}`, M + halfW, y, { width: halfW, align: "right" });
    y += 14;
    doc.text(`Carrier: ${meta.carrierName}`, M, y, { width: halfW });
    doc.text(`Total shipments to dispatch: ${orderRows.length}`, M + halfW, y, { width: halfW, align: "right" });
    y += 16;

    // ── Divider ──
    doc.strokeColor(INK).lineWidth(0.8).moveTo(M, y).lineTo(R, y).stroke();
    y += 6;

    // ── Table header ──
    y = drawTableHeader(doc, y);

    // ── Table rows ──
    for (let i = 0; i < orderRows.length; i++) {
      const o = orderRows[i];
      const contents = buildContents(o);
      const barcode = barcodes[i];

      // Measure this row's height: taller of the barcode block vs. the
      // (possibly multi-line) contents text.
      doc.fontSize(7.5).font("Helvetica");
      const contentsH = doc.heightOfString(contents, { width: COL.contents.w });
      const rowH = Math.max(BARCODE_H, contentsH) + ROW_PAD;

      // Page break — keep whole rows together.
      if (y + rowH > PAGE_BOTTOM) {
        doc.addPage();
        y = M;
        y = drawTableHeader(doc, y);
      }

      const rowTop = y;

      doc.fillColor(INK).font("Helvetica").fontSize(8);
      doc.text(String(i + 1), COL.num.x + 2, rowTop, { width: COL.num.w });
      doc.text(o.orderId, COL.order.x, rowTop, { width: COL.order.w });
      doc.text(o.awb ?? "-", COL.awb.x, rowTop, { width: COL.awb.w });
      doc.fontSize(7.5).text(contents, COL.contents.x, rowTop, { width: COL.contents.w });

      if (barcode) {
        try {
          doc.image(barcode, COL.barcode.x, rowTop, {
            fit: [COL.barcode.w, BARCODE_H],
          });
        } catch (err) {
          logger.warn(`[Manifest] Barcode embed failed: ${err}`);
        }
      }

      y = rowTop + rowH;

      // Row separator
      doc.strokeColor(FAINT).lineWidth(0.5).moveTo(M, y - 3).lineTo(R, y - 3).stroke();
      doc.strokeColor(INK);
    }

    // ── Hand-off / sign-off section ──
    y += 10;
    // If there isn't enough room for the sign-off block, push it to a new page.
    if (y + 130 > PAGE_BOTTOM) {
      doc.addPage();
      y = M;
    }
    drawHandoffSection(doc, y, meta.carrierName);
  }
}
