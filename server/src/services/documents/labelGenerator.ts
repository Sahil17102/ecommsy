import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "../../config/db.js";
import { orders, pickupAddresses, labelSettings } from "../../db/schema.js";
import { generateBarcodePng } from "./barcode.js";
import { downloadDocument } from "../storage.js";
import logger from "../../config/logger.js";

const DEFAULT_LOGO_PATH = path.resolve(process.cwd(), "src/assets/logo.png");

type OrderRow = typeof orders.$inferSelect;
type LabelSettingsRow = typeof labelSettings.$inferSelect;

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
}

interface OrderDimensions {
  length?: number;
  breadth?: number;
  height?: number;
}

type LabelDefaults = Pick<
  LabelSettingsRow,
  | "showLogo"
  | "hideCustomerMobile"
  | "hideCustomerOrderBar"
  | "hideGstNumber"
  | "hidePickupAddress"
  | "hideRtoAddress"
  | "hideRtoName"
  | "hidePickupMobile"
  | "hideRtoMobile"
  | "hidePickupName"
  | "hideHsn"
  | "hideSku"
  | "hideQty"
  | "hideTotalAmount"
  | "hideOrderAmount"
  | "hideProduct"
> & { logoUrl?: string | null };

/**
 * Default label settings used when user has no saved settings.
 */
const DEFAULTS: LabelDefaults = {
  showLogo: false,
  hideCustomerMobile: false,
  hideCustomerOrderBar: false,
  hideGstNumber: false,
  hidePickupAddress: false,
  hideRtoAddress: false,
  hideRtoName: false,
  hidePickupMobile: false,
  hideRtoMobile: false,
  hidePickupName: false,
  hideHsn: false,
  hideSku: false,
  hideQty: false,
  hideTotalAmount: false,
  hideOrderAmount: false,
  hideProduct: false,
};

/**
 * Try to fetch the logo image buffer from storage.
 * Returns null if logo is not available.
 */
export async function fetchLogoBuffer(logoUrl: string | undefined | null): Promise<Buffer | null> {
  // If user uploaded a custom logo, fetch from S3
  if (logoUrl) {
    try {
      // logoUrl is like "/api/label-settings/logo/{userId}/label-logo.png"
      // The actual S3 key is "logos/{userId}/label-logo.{ext}"
      const match = logoUrl.match(/\/logo\/(.+)/);
      if (!match) {
        logger.warn(`[LabelGen] Could not parse logoUrl: ${logoUrl}`);
      } else {
        const key = `logos/${match[1]}`;
        const { buffer } = await downloadDocument(key);
        logger.info(`[LabelGen] Custom logo fetched (${buffer.length} bytes)`);
        return buffer;
      }
    } catch (err) {
      logger.warn(`[LabelGen] Could not fetch custom logo, falling back to default`, err);
    }
  }

  // Fall back to default platform logo
  try {
    const buffer = fs.readFileSync(DEFAULT_LOGO_PATH);
    logger.info(`[LabelGen] Using default platform logo (${buffer.length} bytes)`);
    return buffer;
  } catch {
    logger.warn("[LabelGen] Default logo file not found at " + DEFAULT_LOGO_PATH);
    return null;
  }
}

/**
 * Seller's own uploaded label logo — shown on the LEFT of the label header.
 * Unlike {@link fetchLogoBuffer} there is NO platform fallback: if the seller
 * has not uploaded a logo we return null so the header left stays empty.
 */
export async function fetchSellerLogoBuffer(logoUrl: string | undefined | null): Promise<Buffer | null> {
  if (!logoUrl) return null;
  try {
    const match = logoUrl.match(/\/logo\/(.+)/);
    if (!match) {
      logger.warn(`[LabelGen] Could not parse seller logoUrl: ${logoUrl}`);
      return null;
    }
    const { buffer } = await downloadDocument(`logos/${match[1]}`);
    return buffer;
  } catch (err) {
    logger.warn(`[LabelGen] Could not fetch seller logo`, err);
    return null;
  }
}

/**
 * Draw the platform brand mark on the RIGHT of the label header as bold vector
 * text. Used as a fallback when the platform logo image can't be loaded.
 *
 * Pure black type at a heavy weight always survives a 1-bit thermal threshold,
 * so this is the safe last resort. Returns the y the mark ends at.
 */
function drawPlatformBrand(doc: PDFKit.PDFDocument, x: number, y: number, width: number): number {
  doc.fillColor(INK).font("Helvetica-Bold");
  doc.fontSize(17).text("DREAMZ", x, y, { width, align: "right", characterSpacing: 0.5 });
  doc.fontSize(6.5).text("SERVICES", x, y + 19, { width, align: "right", characterSpacing: 3.4 });
  return y + PLATFORM_BRAND_H;
}

/**
 * The platform brand logo (src/assets/logo.png), read from disk once and cached
 * for the process lifetime. `undefined` = not loaded yet, `null` = load failed.
 * The label header prefers this actual logo artwork over the text wordmark; the
 * seller's own logo is likewise embedded as an image on the same label, so the
 * platform logo renders with identical fidelity.
 */
let platformLogoBuffer: Buffer | null | undefined;
function loadPlatformLogoBuffer(): Buffer | null {
  if (platformLogoBuffer !== undefined) return platformLogoBuffer;
  try {
    platformLogoBuffer = fs.readFileSync(DEFAULT_LOGO_PATH);
    logger.info(`[LabelGen] Platform logo loaded (${platformLogoBuffer.length} bytes)`);
  } catch (err) {
    logger.warn(`[LabelGen] Platform logo not found at ${DEFAULT_LOGO_PATH}`, err);
    platformLogoBuffer = null;
  }
  return platformLogoBuffer;
}

/**
 * Display names for `service_providers.slug`, mirroring the labels the admin
 * shows (admin/src/lib/constants.ts). Anything unmapped is title-cased.
 */
const PROVIDER_LABELS: Record<string, string> = {
  delhivery: "Delhivery",
  xpressbees: "Xpressbees",
  ekart: "Ekart",
  dpworld: "DP World",
  shipexindia: "Shipex India",
  dtdc: "DTDC",
  manual: "Manual",
};

/**
 * Format a provider slug for the label. Couriers are named per service tier
 * ("DELHIVERY SURFACE INTERNATIONAL & DOMESTIC"), which is too long and too
 * internal to print — the label shows the carrier brand instead.
 */
export function formatServiceProvider(slug: string | null | undefined): string {
  const key = (slug ?? "").trim().toLowerCase();
  if (!key) return "";
  return PROVIDER_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * Everything the renderer needs, already resolved.
 * Kept separate from DB access so the layout can be unit/visually tested.
 */
export interface LabelRenderData {
  settings: LabelDefaults;
  orderId: string;
  awb: string;
  serviceProvider: string;
  orderDate: string;
  paymentMode: string;
  orderAmount: number;
  weightGrams: number;
  dimensions: OrderDimensions;
  deliveryAddress: OrderAddress;
  products: OrderProduct[];
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
  rto: OrderAddress | null;
  // Pre-rendered assets
  awbBarcodePng: Buffer | null;
  orderBarcodePng: Buffer | null;
  sellerLogoBuffer: Buffer | null;
}

const INK = "#0f172a"; // near-black, slightly warm
const MUTED = "#64748b";
const HAIR = "#cbd5e1";
const FAINT = "#e2e8f0";

/** PDFKit page options for a 4×6 inch (288×432pt) thermal label. */
const LABEL_PAGE_OPTIONS = {
  size: [288, 432] as [number, number],
  margins: { top: 12, bottom: 12, left: 12, right: 12 },
};

/** Page height in points, and the lowest y any content may occupy. */
const PAGE_H = 432;
const PAGE_BOTTOM = PAGE_H - 12;

/** Seller's uploaded logo, header left — sized to hold its own against the
 * platform mark opposite it. A square logo renders SELLER_LOGO_H tall; a wide
 * one renders SELLER_LOGO_W across. */
const SELLER_LOGO_W = 150;
const SELLER_LOGO_H = 40;

/** Platform wordmark (text fallback), header right. */
const PLATFORM_BRAND_W = 104;
const PLATFORM_BRAND_H = 28;

/** Platform logo image box, header right. The logo is right-aligned within it
 * and scaled to fit the header band height, mirroring the seller logo opposite. */
const PLATFORM_LOGO_W = 104;

/** Header band height — the taller of the two marks. */
const HEADER_H = Math.max(SELLER_LOGO_H, PLATFORM_BRAND_H);

/** Height budget for the SHIP TO block. Long addresses shrink to fit this box
 * rather than pushing the rest of the label off the page. Typical addresses sit
 * well under it and render at full size; only the outliers step down. */
const SHIP_TO_MAX_H = 84;

/** Vertical space the pickup/RTO columns and the ORDER AMOUNT row need, used to
 * work out where the product table has to stop: a divider plus a heading and
 * four short lines at 6.5pt. */
const ADDR_BLOCK_H = 52;
const ORDER_AMOUNT_H = 14;

/** Reference-number barcode box (header of the right-hand info column). */
const REF_BARCODE_H = 30;

/**
 * Draw one 4×6 inch thermal shipping label onto the current page of an
 * existing PDFKit document. The caller owns the document lifecycle
 * (create / addPage / end), so this backs both the single-label PDF and the
 * merged multi-label bulk PDF.
 *
 * Design goals (per client brief): clean, professional, "big courier" look,
 * with an AWB barcode large enough to scan from a distance — it spans the
 * full label width with a tall bar height and a large monospace AWB number.
 */
function drawLabelPage(doc: PDFKit.PDFDocument, data: LabelRenderData): void {
  const {
    settings: s,
    orderId,
    awb,
    serviceProvider,
    orderDate,
    paymentMode,
    orderAmount,
    weightGrams,
    dimensions,
    deliveryAddress: da,
    products,
    pickupAddr,
    rto,
    awbBarcodePng,
    orderBarcodePng,
    sellerLogoBuffer,
  } = data;

  // A label is exactly one page. PDFKit silently calls addPage() whenever text
  // would cross the bottom margin, which is what produced the "blank label"
  // reports: a long address overflowed and the spillover page printed as an
  // almost-empty label. Dropping the bottom margin removes the auto-break, and
  // the blocks below clamp themselves to PAGE_BOTTOM so nothing is lost off-page.
  doc.page.margins.bottom = 0;

  {
    const W = 288;
    const L = 12;
    const R = W - 12;
    const CW = R - L;
    const MID = L + CW / 2;
    let y = 12;

    // ── Helpers ─────────────────────────────────────────────
    const divider = (gapBefore = 6, gapAfter = 6) => {
      y += gapBefore;
      doc.strokeColor(HAIR).lineWidth(0.8).moveTo(L, y).lineTo(R, y).stroke();
      doc.strokeColor(INK);
      y += gapAfter;
    };
    const thinDivider = (gapBefore = 4, gapAfter = 4) => {
      y += gapBefore;
      doc.strokeColor(FAINT).lineWidth(0.4).moveTo(L, y).lineTo(R, y).stroke();
      doc.strokeColor(INK);
      y += gapAfter;
    };
    // Draws wrapping text at (x, yPos) using the CURRENT font/size and returns
    // the actual rendered height, so callers can advance their cursor by the
    // real (possibly multi-line) height instead of a fixed step. Text is capped
    // at PAGE_BOTTOM and ellipsised rather than allowed to run off the label.
    const drawMeasured = (text: string, x: number, yPos: number, width: number): number => {
      const remaining = PAGE_BOTTOM - yPos;
      if (remaining < 5) return 0;
      const h = Math.min(doc.heightOfString(text || " ", { width }), remaining);
      doc.text(text || "", x, yPos, { width, height: remaining, ellipsis: true });
      return h;
    };

    // ── Header: seller logo (left) + boxandbeyond wordmark (right) ──
    // Both marks are vertically centred in a fixed band so the header height —
    // and therefore everything below it — doesn't move with the logo's shape.
    const headerTop = y;
    if (sellerLogoBuffer) {
      try {
        doc.image(sellerLogoBuffer, L, headerTop, {
          fit: [SELLER_LOGO_W, HEADER_H],
          valign: "center",
        });
      } catch (err) {
        logger.warn(`[LabelGen] Seller logo embed failed: ${err}`);
      }
    }
    const platformLogo = loadPlatformLogoBuffer();
    let platformLogoDrawn = false;
    if (platformLogo) {
      try {
        // Right-aligned, scaled to the header band, mirroring the seller logo.
        doc.image(platformLogo, R - PLATFORM_LOGO_W, headerTop, {
          fit: [PLATFORM_LOGO_W, HEADER_H],
          align: "right",
          valign: "center",
        });
        platformLogoDrawn = true;
      } catch (err) {
        logger.warn(`[LabelGen] Platform logo embed failed: ${err}`);
      }
    }
    if (!platformLogoDrawn) {
      // Fall back to the bold text wordmark if the logo image is unavailable.
      drawPlatformBrand(
        doc,
        R - PLATFORM_BRAND_W,
        headerTop + (HEADER_H - PLATFORM_BRAND_H) / 2,
        PLATFORM_BRAND_W,
      );
    }
    y = headerTop + HEADER_H;
    divider(4, 7);

    // ── Ship To (left) + Destination pincode box (right) ────
    const shipToY = y;
    const pinBoxW = 78;
    const pinBoxH = 38;
    const pinBoxX = R - pinBoxW;
    doc.lineWidth(1).strokeColor(INK).rect(pinBoxX, shipToY, pinBoxW, pinBoxH).stroke();
    doc.fontSize(6).font("Helvetica-Bold").fillColor(MUTED)
      .text("DESTINATION", pinBoxX, shipToY + 4, { width: pinBoxW, align: "center" });
    doc.fontSize(17).font("Helvetica-Bold").fillColor(INK)
      .text(da.pincode || "—", pinBoxX, shipToY + 13, { width: pinBoxW, align: "center" });

    // Payment mode (PREPAID / COD) sits directly under the destination pincode.
    const payMode = (paymentMode || "").toUpperCase();
    const isCod = payMode.includes("COD");
    const payText = isCod ? `COD Rs.${orderAmount.toFixed(0)}` : payMode || "PREPAID";
    const payY = shipToY + pinBoxH + 3;
    const payH = 16;
    doc.fontSize(9).font("Helvetica-Bold");
    if (isCod) {
      doc.roundedRect(pinBoxX, payY, pinBoxW, payH, 3).fill(INK);
      doc.fillColor("#ffffff").text(payText, pinBoxX, payY + 4.5, { width: pinBoxW, align: "center" });
    } else {
      doc.lineWidth(1).roundedRect(pinBoxX, payY, pinBoxW, payH, 3).stroke(INK);
      doc.fillColor(INK).text(payText, pinBoxX, payY + 4.5, { width: pinBoxW, align: "center" });
    }
    doc.fillColor(INK);
    const pinBlockBottom = payY + payH;

    const toW = CW - pinBoxW - 12;
    doc.fontSize(7.5).font("Helvetica-Bold").fillColor(MUTED).text("SHIP TO", L, shipToY, { width: toW });

    // The address is the one block whose length we don't control. Rather than
    // let it run past the page, measure it first and step the type size down
    // until it fits SHIP_TO_MAX_H; anything still too long is ellipsised.
    const shipLines: { text: string; size: number; font: string }[] = [
      { text: da.contactName || "", size: 10, font: "Helvetica-Bold" },
      { text: da.addressLine1 || "", size: 8, font: "Helvetica" },
    ];
    if (da.addressLine2) shipLines.push({ text: da.addressLine2, size: 8, font: "Helvetica" });
    shipLines.push({
      text: `${da.city || ""}, ${da.state || ""} - ${da.pincode || ""}`,
      size: 8,
      font: "Helvetica",
    });
    if (!s.hideCustomerMobile) {
      shipLines.push({ text: `Mobile: ${da.phone || ""}`, size: 8, font: "Helvetica" });
    }

    const measureShipTo = (scale: number): number =>
      shipLines.reduce((total, ln) => {
        doc.fontSize(ln.size * scale).font(ln.font);
        return total + doc.heightOfString(ln.text || " ", { width: toW }) + 1.5;
      }, 0);

    let shipScale = 1;
    for (const candidate of [1, 0.92, 0.84, 0.76, 0.68]) {
      shipScale = candidate;
      if (measureShipTo(candidate) <= SHIP_TO_MAX_H) break;
    }

    let ty = shipToY + 11;
    const shipToLimit = ty + SHIP_TO_MAX_H;
    for (const ln of shipLines) {
      const remaining = shipToLimit - ty;
      if (remaining < 6) break; // no room left for a legible line
      doc.fontSize(ln.size * shipScale).font(ln.font).fillColor(INK);
      const h = Math.min(doc.heightOfString(ln.text || " ", { width: toW }), remaining);
      doc.text(ln.text || "", L, ty, { width: toW, height: remaining, ellipsis: true });
      ty += h + 1.5;
    }

    y = Math.max(ty, pinBlockBottom);
    divider(5, 8);

    // ── AWB barcode — the hero element, full width & tall ───
    const awbY = y;
    const BC_H = 44;
    if (awbBarcodePng) {
      try {
        // Explicit width/height, not `fit` — see the reference barcode below.
        // `fit` letterboxed this to roughly half the label width; spanning the
        // full width buys back more scan margin than the height it gives up.
        doc.image(awbBarcodePng, L, awbY, { width: CW, height: BC_H });
        y = awbY + BC_H + 1;
      } catch {
        y = awbY;
      }
    }
    doc.fontSize(15).font("Courier-Bold").fillColor(INK)
      .text(awb || "", L, y, { width: CW, align: "center", characterSpacing: 1.5 });
    y += 18;

    // Carrier brand sits directly under the AWB number.
    if (serviceProvider) {
      doc.fontSize(9.5).font("Helvetica-Bold").fillColor(INK)
        .text(serviceProvider, L, y, { width: CW, align: "center" });
      y += 12;
    }
    divider(3, 7);

    // ── Order info grid — two columns, so the reference barcode below can have
    //    the full label width instead of being squeezed into half of it.
    //    "Invoice No" is deliberately absent: it is the same value as the
    //    reference number printed under the barcode.
    const infoY = y;
    const colGap = 8;
    const infoColW = CW / 2 - colGap / 2;
    const rightColX = L + infoColW + colGap;
    doc.fontSize(7.5).font("Helvetica-Bold").fillColor(INK);
    doc.text(`Order Date: ${orderDate}`, L, infoY, { width: infoColW });
    doc.font("Helvetica");
    doc.text(`Weight: ${(weightGrams / 1000).toFixed(2)} kg`, rightColX, infoY, { width: infoColW });
    doc.text(
      `Dimensions: ${dimensions.length ?? 0}x${dimensions.breadth ?? 0}x${dimensions.height ?? 0} cm`,
      L,
      infoY + 10,
      { width: infoColW },
    );
    if (!s.hideGstNumber && pickupAddr?.gstNumber) {
      doc.text(`GSTIN: ${pickupAddr.gstNumber}`, rightColX, infoY + 10, { width: infoColW });
    }
    const infoBottom = infoY + 20;

    // ── Reference-no barcode — full label width so it actually scans ────
    // Barcode and number share the same box (L..R) and both centre in it, so
    // the bars sit squarely over their number.
    y = infoBottom;
    if (!s.hideCustomerOrderBar) {
      y += 4;
      if (orderBarcodePng) {
        try {
          // Explicit width/height rather than `fit`: a barcode carries its data
          // in the bar *ratios*, so scaling each axis independently is safe, and
          // it lets the bars span the full width at a fixed height. `fit` would
          // preserve the PNG's aspect and letterbox it back down to a narrow,
          // hard-to-scan strip — which is what it used to do.
          doc.image(orderBarcodePng, L, y, { width: CW, height: REF_BARCODE_H });
          y += REF_BARCODE_H + 2;
        } catch (err) {
          logger.warn(`[LabelGen] Order barcode embed failed: ${err}`);
        }
      }
      doc.fontSize(11).font("Courier-Bold").fillColor(INK)
        .text(orderId, L, y, { width: CW, align: "center", characterSpacing: 1 });
      y += 13;
    }

    // ── Products table ──────────────────────────────────────
    const showPickup = !s.hidePickupAddress && pickupAddr;
    const showRto = !s.hideRtoAddress && rto;

    // Where the item rows must stop: whatever is left once the blocks that come
    // after the table have been set aside.
    const productsBottom =
      PAGE_BOTTOM -
      (showPickup || showRto ? ADDR_BLOCK_H : 0) -
      (s.hideOrderAmount ? 0 : ORDER_AMOUNT_H);

    // If not even one row would fit, drop the table outright rather than print a
    // bare header over "+ N more item(s)" — that costs the same vertical space
    // as the rows it's apologising for, and it's space the pickup/return phone
    // numbers and the footer need more than the item list does.
    const productsFit = y + 10 + 13 + 10 <= productsBottom;

    if (!s.hideProduct && productsFit) {
      divider(4, 6);
      doc.fontSize(7).font("Helvetica-Bold").fillColor(INK);
      doc.rect(L, y - 2, CW, 12).fill(FAINT);
      doc.fillColor(INK);

      let hx = L + 3;
      doc.text("ITEM", hx, y + 1, { width: 108 }); hx += 108;
      if (!s.hideSku) { doc.text("SKU", hx, y + 1, { width: 42 }); hx += 42; }
      if (!s.hideHsn) { doc.text("HSN", hx, y + 1, { width: 30 }); hx += 30; }
      if (!s.hideQty) { doc.text("QTY", hx, y + 1, { width: 24, align: "right" }); hx += 24; }
      if (!s.hideTotalAmount) { doc.text("TOTAL", hx, y + 1, { width: 40, align: "right" }); }
      y += 13;

      doc.font("Helvetica").fontSize(7).fillColor(INK);
      for (const [i, p] of products.entries()) {
        // Keep the table inside its budget — an order with many line items must
        // not push the pickup/RTO block (or the label itself) off the page.
        if (y + 10 > productsBottom) {
          doc.font("Helvetica-Oblique").fontSize(6.5).fillColor(MUTED);
          doc.text(`+ ${products.length - i} more item(s)`, L + 3, y, { width: CW - 6 });
          doc.font("Helvetica").fontSize(7).fillColor(INK);
          y += 9;
          break;
        }
        const unitPrice = Number(p.unitPrice ?? 0);
        const quantity = Number(p.quantity ?? 0);
        let px = L + 3;
        doc.text(p.name, px, y, { width: 108, ellipsis: true, height: 9 }); px += 108;
        if (!s.hideSku) { doc.text(p.hsn ? `SKU-${p.hsn}` : "-", px, y, { width: 42 }); px += 42; }
        if (!s.hideHsn) { doc.text(p.hsn || "-", px, y, { width: 30 }); px += 30; }
        if (!s.hideQty) { doc.text(String(quantity), px, y, { width: 24, align: "right" }); px += 24; }
        if (!s.hideTotalAmount) { doc.text(`Rs.${(unitPrice * quantity).toFixed(0)}`, px, y, { width: 40, align: "right" }); }
        y += 10;
      }

      if (!s.hideOrderAmount) {
        thinDivider(2, 4);
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor(INK);
        doc.text("ORDER AMOUNT", L + 3, y, { width: 150 });
        doc.text(`Rs.${orderAmount.toFixed(0)}`, L + 3, y, { width: CW - 6, align: "right" });
        y += 12;
      }
    }

    // ── Pickup + Return addresses (compact, two columns) ────
    if (showPickup || showRto) {
      divider(4, 6);
      const colY = y;
      const colW = CW / 2 - 6;

      const drawAddr = (
        title: string,
        x: number,
        a: { contactName?: string | null; addressLine1?: string | null; addressLine2?: string | null; city?: string | null; state?: string | null; pincode?: string | null; phone?: string | null },
        showName: boolean,
        showMobile: boolean,
      ) => {
        let ay = colY;
        doc.fontSize(7).font("Helvetica-Bold").fillColor(MUTED);
        ay += drawMeasured(title, x, ay, colW) + 1;
        doc.fontSize(6.5).font("Helvetica").fillColor(INK);
        if (showName && a.contactName) ay += drawMeasured(a.contactName, x, ay, colW) + 1;
        if (a.addressLine1) ay += drawMeasured(a.addressLine1, x, ay, colW) + 1;
        if (a.addressLine2) ay += drawMeasured(a.addressLine2, x, ay, colW) + 1;
        ay += drawMeasured(`${a.city || ""}, ${a.state || ""} - ${a.pincode || ""}`, x, ay, colW) + 1;
        if (showMobile && a.phone) ay += drawMeasured(`Ph: ${a.phone}`, x, ay, colW) + 1;
        return ay;
      };

      let leftBottom = colY;
      let rightBottom = colY;
      if (showPickup && pickupAddr) {
        leftBottom = drawAddr("PICKUP ADDRESS", L, pickupAddr, !s.hidePickupName, !s.hidePickupMobile);
      }
      if (showRto && rto) {
        rightBottom = drawAddr("RETURN ADDRESS", MID + 6, rto, !s.hideRtoName, !s.hideRtoMobile);
      }
      y = Math.max(leftBottom, rightBottom);
    }

    // ── Footer (only if there's room) ───────────────────────
    if (y < 416) {
      thinDivider(4, 4);
      doc.fontSize(5.5).font("Helvetica").fillColor(MUTED);
      doc.text("This is a computer-generated document and does not require a signature.", L, y, {
        width: CW,
        align: "center",
      });
    }
  }
}

/**
 * Pure single-label renderer — creates a one-page PDF and returns its buffer.
 */
export function renderLabelPdf(data: LabelRenderData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument(LABEL_PAGE_OPTIONS);
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    drawLabelPage(doc, data);
    doc.end();
  });
}

/**
 * Render many labels into a single merged PDF — one label per page — ready to
 * send straight to a thermal printer in one print job.
 */
export function renderBulkLabelsPdf(dataList: LabelRenderData[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ ...LABEL_PAGE_OPTIONS, autoFirstPage: false });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    for (const data of dataList) {
      doc.addPage(LABEL_PAGE_OPTIONS);
      drawLabelPage(doc, data);
    }
    doc.end();
  });
}

/**
 * Resolve everything the renderer needs for one order (pickup/RTO addresses,
 * label settings, barcodes, logo). Kept separate from rendering so a single
 * order and a bulk batch share the exact same data resolution.
 */
async function buildLabelRenderData(order: OrderRow): Promise<LabelRenderData> {
  const [pickupAddr, settings] = await Promise.all([
    order.pickupAddressId
      ? db.query.pickupAddresses.findFirst({ where: eq(pickupAddresses.id, order.pickupAddressId) })
      : Promise.resolve(undefined),
    db.query.labelSettings.findFirst({ where: eq(labelSettings.userId, order.userId) }),
  ]);

  // RTO address: prefer pickup's rtoAddress jsonb (unless pickup.isSameAsRto), then fall back to pickup itself.
  const rtoData: OrderAddress | null =
    pickupAddr && !pickupAddr.isSameAsRto && pickupAddr.rtoAddress
      ? (pickupAddr.rtoAddress as OrderAddress)
      : null;

  const s: LabelDefaults = { ...DEFAULTS, ...(settings ?? {}) };

  const deliveryAddress = (order.deliveryAddress as OrderAddress | null) ?? {};
  const products = (order.items as OrderProduct[] | null) ?? [];
  const dimensions = (order.dimensions as OrderDimensions | null) ?? {};
  const metadata = (order.metadata as Record<string, unknown> | null) ?? {};
  const orderDate =
    typeof metadata.orderDate === "string"
      ? (metadata.orderDate as string)
      : order.createdAt.toISOString().slice(0, 10);
  const orderAmount = Number(order.declaredValue ?? 0);
  const paymentMode = order.paymentMode ?? "";
  const weightGrams = Number(order.weight ?? 0);

  // Pre-generate barcode images and fetch logo in parallel.
  // Bars only (includetext: false); the human-readable number is drawn in PDFKit.
  const [orderBarcodePng, awbBarcodePng, sellerLogoBuffer] = await Promise.all([
    !s.hideCustomerOrderBar && order.orderId
      ? generateBarcodePng(order.orderId, { height: 18, scale: 4, includetext: false }).catch((err) => {
          logger.warn(`[LabelGen] Order barcode failed: ${err}`);
          return null;
        })
      : null,
    order.awb
      ? generateBarcodePng(order.awb, { height: 16, scale: 4, includetext: false }).catch((err) => {
          logger.warn(`[LabelGen] AWB barcode failed: ${err}`);
          return null;
        })
      : null,
    s.showLogo ? fetchSellerLogoBuffer(s.logoUrl) : Promise.resolve(null),
  ]);

  const rto: OrderAddress | null =
    rtoData ??
    (pickupAddr
      ? {
          contactName: pickupAddr.contactName ?? undefined,
          phone: pickupAddr.phone ?? undefined,
          addressLine1: pickupAddr.addressLine1 ?? undefined,
          addressLine2: pickupAddr.addressLine2 ?? undefined,
          city: pickupAddr.city ?? undefined,
          state: pickupAddr.state ?? undefined,
          pincode: pickupAddr.pincode ?? undefined,
        }
      : null);

  return {
    settings: s,
    orderId: order.orderId,
    awb: order.awb ?? "",
    // Carrier brand, not the courier row's per-tier name.
    serviceProvider: formatServiceProvider(order.serviceProvider),
    orderDate,
    paymentMode,
    orderAmount,
    weightGrams,
    dimensions,
    deliveryAddress,
    products,
    pickupAddr: pickupAddr ?? null,
    rto,
    awbBarcodePng,
    orderBarcodePng,
    sellerLogoBuffer,
  };
}

/**
 * Generate a shipping label PDF for any order.
 * Fetches required data, then delegates layout to {@link renderLabelPdf}.
 */
export async function generateLabel(order: OrderRow): Promise<Buffer> {
  return renderLabelPdf(await buildLabelRenderData(order));
}

/**
 * Generate a single merged PDF holding one label per order (in the given
 * order). Data is resolved sequentially to avoid exhausting the DB pool on
 * large batches.
 */
export async function generateBulkLabels(orderRows: OrderRow[]): Promise<Buffer> {
  const dataList: LabelRenderData[] = [];
  for (const order of orderRows) {
    dataList.push(await buildLabelRenderData(order));
  }
  return renderBulkLabelsPdf(dataList);
}

// Keep backward-compat alias
export { generateLabel as generateManualLabel };
