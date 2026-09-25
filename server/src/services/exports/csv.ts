/** Minimal CSV writer — mirrors the escaping the admin panel used client-side. */

export interface CsvColumn<T> {
  label: string;
  value: (row: T) => unknown;
}

export function csvEscape(val: unknown): string {
  const str = val == null ? "" : String(val);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function csvHeaderLine<T>(columns: CsvColumn<T>[]): string {
  return columns.map((c) => csvEscape(c.label)).join(",");
}

export function csvRowLine<T>(columns: CsvColumn<T>[], row: T): string {
  return columns.map((c) => csvEscape(c.value(row))).join(",");
}

/** Excel only reads UTF-8 CSVs correctly when they start with a BOM. */
export const CSV_BOM = "﻿";
