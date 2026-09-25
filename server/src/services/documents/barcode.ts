import bwipjs from "bwip-js";

export interface BarcodeOptions {
  /** Bar height (bwip units, ~mm at scale). Higher = taller bars. */
  height?: number;
  /** Module width multiplier. Higher = wider/crisper bars, easier to scan from a distance. */
  scale?: number;
  /** Render the human-readable text beneath the bars. Default true. */
  includetext?: boolean;
  /** Font size for the human-readable text. */
  textsize?: number;
}

/**
 * Generate a CODE128 barcode as a PNG buffer.
 * Returns a Buffer that can be embedded in PDFKit via `doc.image(buffer, ...)`.
 *
 * For the prominent "scan from a distance" AWB barcode we render the bars only
 * (includetext: false) at a high module width, then draw the human-readable
 * number ourselves in PDFKit using a large monospace font.
 */
export async function generateBarcodePng(
  text: string,
  opts?: BarcodeOptions,
): Promise<Buffer> {
  const value = (text ?? "").trim();
  if (!value) throw new Error("Cannot generate barcode for empty value");

  const includetext = opts?.includetext ?? true;
  const png = await bwipjs.toBuffer({
    bcid: "code128",
    text: value,
    scale: opts?.scale ?? 3,
    height: opts?.height ?? 10,
    includetext,
    textxalign: "center",
    textsize: opts?.textsize ?? 8,
    // Generous quiet zone so scanners lock on reliably.
    paddingwidth: 6,
    paddingheight: 2,
  });
  return Buffer.from(png);
}
