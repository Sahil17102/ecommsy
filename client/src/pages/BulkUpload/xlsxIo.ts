import * as XLSX from "xlsx";
import type { PickupAddress } from "@/pages/settings/pickup-addresses/types";

export const ORDERS_SHEET = "Orders";
export const PICKUPS_SHEET = "Pickup Locations";

export interface ReadSheetResult {
  header: string[];
  rows: Array<Record<string, string>>;
}

/**
 * Read the primary "Orders" sheet (or first sheet, if that name is missing).
 * All cells are coerced to trimmed strings so downstream validation doesn't
 * have to branch on numeric vs string cell types.
 */
export async function readOrdersFromFile(file: File): Promise<ReadSheetResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const name = wb.SheetNames.includes(ORDERS_SHEET) ? ORDERS_SHEET : wb.SheetNames[0];
  if (!name) throw new Error("Workbook has no sheets");
  const sheet = wb.Sheets[name];
  const matrix: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
  if (matrix.length < 1) throw new Error(`Sheet "${name}" is empty`);
  const [headerRow, ...data] = matrix;
  const header = headerRow.map((h) => String(h ?? "").trim());
  const rows = data
    .map((cells) => {
      const raw: Record<string, string> = {};
      header.forEach((h, i) => { raw[h] = String(cells[i] ?? "").trim(); });
      return raw;
    })
    .filter((r) => Object.values(r).some((v) => v.length > 0));
  return { header, rows };
}

/**
 * Build a workbook with:
 *   - sheet 1 ("Orders")         — blank template (headers only)
 *   - sheet 2 ("Pickup Locations") — reference list of the user's saved pickups
 * The user fills sheet 1 using nicknames from sheet 2 for `warehouse_name`.
 */
export function buildTemplateWorkbook(columns: readonly string[], pickups: PickupAddress[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Orders — headers only, one empty row to make it easy to start typing
  const orderMatrix: string[][] = [[...columns], columns.map(() => "")];
  const ordersSheet = XLSX.utils.aoa_to_sheet(orderMatrix);
  ordersSheet["!cols"] = columns.map((c) => ({ wch: Math.max(12, c.length + 2) }));
  XLSX.utils.book_append_sheet(wb, ordersSheet, ORDERS_SHEET);

  // Pickup Locations reference
  const pickupHeader = ["warehouse_name", "contact_name", "phone", "address", "city", "state", "pincode"];
  const pickupMatrix: string[][] = [pickupHeader];
  for (const p of pickups) {
    pickupMatrix.push([
      p.nickname,
      p.contactName,
      p.phone,
      [p.addressLine1, p.addressLine2].filter(Boolean).join(", "),
      p.city,
      p.state,
      p.pincode,
    ]);
  }
  const pickupsSheet = XLSX.utils.aoa_to_sheet(pickupMatrix);
  pickupsSheet["!cols"] = [
    { wch: 24 }, { wch: 20 }, { wch: 14 }, { wch: 40 }, { wch: 16 }, { wch: 16 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, pickupsSheet, PICKUPS_SHEET);

  return wb;
}

export function downloadWorkbook(wb: XLSX.WorkBook, fileName: string): void {
  XLSX.writeFile(wb, fileName, { bookType: "xlsx", compression: true });
}
