import type { AvailableCourier, B2bAvailableCourier } from "@/lib/ratesApi";
import type { PickupAddress } from "@/pages/settings/pickup-addresses/types";
import type { BulkCreateResponse } from "@/lib/ordersApi";

export type RowError = { field: string; message: string };

export type RowStatus =
  | "pending"
  | "validating"
  | "ready"
  | "needs_courier"
  | "unserviceable"
  | "rate_error"
  | "submit_failed";

// Generic courier shape the wizard table renders. Both B2C and B2B configs
// narrow their `CourierOption` to this contract before returning from the fetcher.
export interface GenericCourierOption {
  courierId: string;
  name: string;
  totalCharge: number;
}

export interface ValidatedRow<TBase> {
  errors: RowError[];
  pickup?: PickupAddress;
  /** Human-readable summary rendered in the Products column. */
  itemsSummary: string;
  base?: TBase;
  /** Optional extra cells to render per row, keyed by column label. */
  extras?: Record<string, string>;
}

export interface ParsedRow<TBase, TCourier extends GenericCourierOption> {
  rowNumber: number;
  raw: Record<string, string>;
  errors: RowError[];
  status: RowStatus;
  note?: string;
  pickup?: PickupAddress;
  itemsSummary: string;
  base?: TBase;
  extras?: Record<string, string>;
  availableCouriers?: TCourier[];
  selectedCourier?: TCourier;
  /** Populated after a failed bulk-create attempt — surfaces the server's
   *  per-row reason(s) (validation or creation failure) inline in the table. */
  serverErrors?: RowError[];
}

/** Self-contained per-flow configuration — everything the generic wizard needs. */
export interface BulkUploadConfig<TBase, TCourier extends GenericCourierOption, TPayload> {
  /** "B2C" or "B2B" — used in labels, title, back-link. */
  flow: "B2C" | "B2B";
  /** Page title/subtitle shown in header. */
  title: string;
  subtitle: string;
  /** Route to navigate "back" to (e.g. "/orders/b2c"). */
  backTo: string;

  /** Columns that must be present in the uploaded sheet. */
  requiredColumns: readonly string[];
  /** Full ordered column list — used when writing the template. */
  templateColumns: readonly string[];
  /** Template file name. */
  templateFileName: string;

  /** Per-row validator run against the raw row + the user's pickup list. */
  validateRow: (raw: Record<string, string>, pickups: PickupAddress[]) => ValidatedRow<TBase>;

  /** Given a validated base + its pickup, fetch serviceable couriers. */
  fetchCouriers: (base: TBase, pickup: PickupAddress) => Promise<TCourier[]>;

  /** Pick the user's preferred courier from a fetched list based on raw CSV hints
   *  (e.g. `courier_name` column). Returning undefined means "pick the cheapest". */
  matchCourierByPreference: (list: TCourier[], raw: Record<string, string>) => TCourier | undefined;

  /** Merge validated base + pickup + selected courier into the backend payload. */
  toPayload: (row: ParsedRow<TBase, TCourier>) => TPayload;

  /** Submit the final batch — returns standard BulkCreateResponse. */
  submit: (payloads: TPayload[]) => Promise<BulkCreateResponse>;
}

export type { AvailableCourier, B2bAvailableCourier };
