import { inArray } from "drizzle-orm";
import { db } from "../config/db.js";
import { couriers, pickupAddresses, users } from "../db/schema.js";

/**
 * Small batch loaders for the relations an order table needs alongside the row
 * itself — the renamable courier name, the pickup (return) address and the
 * seller. Shared by the NDR and RTO lists so both screens show the same thing.
 *
 * Each takes the page of rows already fetched, so they add one query per
 * relation per page rather than one per row.
 */

type Relatable = { courierId: string | null; pickupAddressId: string | null; userId: string };

export type PickupAddressSummary = {
  id: string;
  nickname: string | null;
  contactName: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
};

export type SellerSummary = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  businessName: string | null;
};

const uniq = <T>(values: (T | null | undefined)[]): T[] =>
  [...new Set(values.filter((v): v is T => v != null))];

export async function fetchCourierNames(rows: Relatable[]): Promise<Map<string, string>> {
  const ids = uniq(rows.map((r) => r.courierId));
  if (!ids.length) return new Map();
  const found = await db
    .select({ id: couriers.id, name: couriers.name })
    .from(couriers)
    .where(inArray(couriers.id, ids));
  return new Map(found.map((c) => [c.id, c.name]));
}

export async function fetchPickupAddresses(rows: Relatable[]): Promise<Map<string, PickupAddressSummary>> {
  const ids = uniq(rows.map((r) => r.pickupAddressId));
  if (!ids.length) return new Map();
  const found = await db
    .select({
      id: pickupAddresses.id,
      nickname: pickupAddresses.nickname,
      contactName: pickupAddresses.contactName,
      phone: pickupAddresses.phone,
      addressLine1: pickupAddresses.addressLine1,
      addressLine2: pickupAddresses.addressLine2,
      city: pickupAddresses.city,
      state: pickupAddresses.state,
      pincode: pickupAddresses.pincode,
    })
    .from(pickupAddresses)
    .where(inArray(pickupAddresses.id, ids));
  return new Map(found.map((a) => [a.id, a]));
}

export async function fetchSellers(rows: Relatable[]): Promise<Map<string, SellerSummary>> {
  const ids = uniq(rows.map((r) => r.userId));
  if (!ids.length) return new Map();
  const found = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      businessName: users.businessName,
    })
    .from(users)
    .where(inArray(users.id, ids));
  return new Map(found.map((u) => [u.id, u]));
}
