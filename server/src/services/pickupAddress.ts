import { and, asc, count, desc, eq, ne } from "drizzle-orm";
import { db } from "../config/db.js";
import { pickupAddresses } from "../db/schema.js";
import { EkartProvider } from "./providers/EkartProvider.js";
import { DelhiveryProvider } from "./providers/DelhiveryProvider.js";
import { ShipexProvider } from "./providers/ShipexProvider.js";
import { loadActiveAccounts } from "./providers/index.js";
import logger from "../config/logger.js";
import { AppError } from "../utils/AppError.js";
import { regex } from "../config/regex.js";

// Constants previously defined in models/PickupAddress.ts — inlined here.
export const ADDRESS_ROLES = [
  "warehouse_manager",
  "warehouse_assistant",
  "warehouse_helper",
] as const;

export const ADDRESS_TYPES = ["pickup", "rto"] as const;

export type AddressRole = (typeof ADDRESS_ROLES)[number];
export type AddressType = (typeof ADDRESS_TYPES)[number];

type PickupAddressRow = typeof pickupAddresses.$inferSelect;
type PickupAddressInsert = typeof pickupAddresses.$inferInsert;

// ── Custom Error ──

export class PickupAddressError extends AppError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = "PickupAddressError";
  }
}

// ── DTO helper ──

export interface PickupAddressListItem {
  id: string;
  nickname: string;
  contactName: string;
  phone: string;
  email: string;
  role: string;
  landmark?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  gstNumber?: string;
  isPrimary: boolean;
  addressType: string;
  isSameAsRto: boolean;
  rtoAddress?: Record<string, unknown>;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toListItem(doc: PickupAddressRow): PickupAddressListItem {
  const item: PickupAddressListItem = {
    id: doc.id,
    nickname: doc.nickname ?? "",
    contactName: doc.contactName ?? "",
    phone: doc.phone ?? "",
    email: doc.email ?? "",
    role: doc.role ?? "",
    addressLine1: doc.addressLine1 ?? "",
    city: doc.city ?? "",
    state: doc.state ?? "",
    country: doc.country ?? "India",
    pincode: doc.pincode ?? "",
    isPrimary: doc.isPrimary,
    addressType: doc.addressType ?? "pickup",
    isSameAsRto: doc.isSameAsRto,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };

  if (doc.landmark) item.landmark = doc.landmark;
  if (doc.addressLine2) item.addressLine2 = doc.addressLine2;
  if (doc.gstNumber) item.gstNumber = doc.gstNumber;
  if (doc.latitude != null) item.latitude = doc.latitude;
  if (doc.longitude != null) item.longitude = doc.longitude;
  if (doc.rtoAddress) item.rtoAddress = doc.rtoAddress as Record<string, unknown>;

  return item;
}

// ── Public API ──

export async function listAddresses(
  userId: string,
): Promise<PickupAddressListItem[]> {
  const docs = await db
    .select()
    .from(pickupAddresses)
    .where(and(eq(pickupAddresses.userId, userId), eq(pickupAddresses.isActive, true)))
    .orderBy(desc(pickupAddresses.isPrimary), asc(pickupAddresses.createdAt));

  return docs.map(toListItem);
}

export async function getAddress(
  userId: string,
  addressId: string,
): Promise<PickupAddressListItem> {
  const doc = await db.query.pickupAddresses.findFirst({
    where: and(
      eq(pickupAddresses.id, addressId),
      eq(pickupAddresses.userId, userId),
      eq(pickupAddresses.isActive, true),
    ),
  });

  if (!doc) throw new PickupAddressError(404, "Address not found");
  return toListItem(doc);
}

type CreatePickupAddressInput = Omit<
  PickupAddressInsert,
  "id" | "userId" | "isPrimary" | "isActive" | "addressType" | "createdAt" | "updatedAt"
>;

export async function createAddress(
  userId: string,
  data: CreatePickupAddressInput,
): Promise<PickupAddressListItem> {
  // Auto-set as primary if this is the user's first address
  const [{ value: existingCount }] = await db
    .select({ value: count() })
    .from(pickupAddresses)
    .where(and(eq(pickupAddresses.userId, userId), eq(pickupAddresses.isActive, true)));

  const isPrimary = existingCount === 0;

  const [doc] = await db
    .insert(pickupAddresses)
    .values({
      ...data,
      userId,
      addressType: "pickup",
      isPrimary,
      isActive: true,
    })
    .returning();

  // Fire-and-forget: register the pickup address on every active provider account
  // that supports portal-side registration. With multi-account, two Xpressbees
  // franchises (for example) each get the address registered independently.
  syncPickupAddressToAllAccounts(doc).catch((err) =>
    logger.warn(`[PickupAddress] Multi-account sync error for "${doc.nickname}": ${err?.message}`),
  );

  return toListItem(doc);
}

// ── Bulk create ──

/** A raw row as parsed from an uploaded bulk pickup-address file. */
export interface BulkAddressRow {
  nickname?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  role?: string;
  landmark?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  gstNumber?: string;
}

export interface BulkAddressRowResult {
  rowNumber: number;
  nickname: string;
  success: boolean;
  error?: string;
}

export interface BulkAddressResult {
  total: number;
  successCount: number;
  failedCount: number;
  results: BulkAddressRowResult[];
}

/** Max rows accepted in a single bulk pickup-address import. */
export const BULK_ADDRESS_MAX = 500;

const isFilled = (v?: string): v is string => typeof v === "string" && v.trim().length > 0;

/** Validate one bulk row; returns an error message, or null if valid. */
function validateBulkRow(row: BulkAddressRow): string | null {
  if (!isFilled(row.nickname)) return "Nickname is required";
  if (!isFilled(row.contactName)) return "Contact name is required";
  if (!isFilled(row.phone) || !regex.phone.test(row.phone.trim())) return "Valid 10-digit phone required";
  if (!isFilled(row.email)) return "Email is required";
  if (isFilled(row.role) && !ADDRESS_ROLES.includes(row.role.trim() as AddressRole)) {
    return `Role must be one of: ${ADDRESS_ROLES.join(", ")}`;
  }
  if (!isFilled(row.addressLine1)) return "Address line 1 is required";
  if (!isFilled(row.city)) return "City is required";
  if (!isFilled(row.state)) return "State is required";
  if (!isFilled(row.pincode) || !regex.pincode.test(row.pincode.trim())) return "Valid 6-digit pincode required";
  return null;
}

/**
 * Create many pickup addresses in one request. Each row is validated and
 * created independently (reusing {@link createAddress} so the first-address
 * primary flag + provider sync still apply), and a per-row success/error
 * result is returned — one bad row never aborts the whole batch. RTO is set
 * same-as-pickup for imported rows.
 */
export async function bulkCreateAddresses(
  userId: string,
  rows: BulkAddressRow[],
): Promise<BulkAddressResult> {
  const results: BulkAddressRowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const label = row.nickname?.trim() || `Row ${i + 1}`;

    const validationError = validateBulkRow(row);
    if (validationError) {
      results.push({ rowNumber: i + 1, nickname: label, success: false, error: validationError });
      continue;
    }

    try {
      await createAddress(userId, {
        nickname: row.nickname!.trim(),
        contactName: row.contactName!.trim(),
        phone: row.phone!.trim(),
        email: row.email!.trim(),
        role: (isFilled(row.role) ? row.role.trim() : "warehouse_manager") as AddressRole,
        landmark: isFilled(row.landmark) ? row.landmark.trim() : undefined,
        addressLine1: row.addressLine1!.trim(),
        addressLine2: isFilled(row.addressLine2) ? row.addressLine2.trim() : undefined,
        city: row.city!.trim(),
        state: row.state!.trim(),
        country: isFilled(row.country) ? row.country.trim() : "India",
        pincode: row.pincode!.trim(),
        gstNumber: isFilled(row.gstNumber) ? row.gstNumber.trim() : undefined,
        isSameAsRto: true,
      });
      results.push({ rowNumber: i + 1, nickname: label, success: true });
    } catch (err) {
      results.push({
        rowNumber: i + 1,
        nickname: label,
        success: false,
        error: err instanceof Error ? err.message : "Failed to create address",
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  return {
    total: rows.length,
    successCount,
    failedCount: rows.length - successCount,
    results,
  };
}

/**
 * For each active service-provider account, register the pickup address on
 * the corresponding portal. Only Ekart / Delhivery / ShipEx currently expose
 * a registerPickupAddress method; other slugs are skipped.
 *
 * Fire-and-forget per account — one portal failing does not block the others.
 */
async function syncPickupAddressToAllAccounts(doc: typeof pickupAddresses.$inferSelect): Promise<void> {
  const accounts = await loadActiveAccounts();

  for (const account of accounts) {
    const tag = `[PickupAddress] ${account.slug}/${account.name}`;

    if (account.slug === "ekart") {
      const provider = new EkartProvider(account);
      provider
        .registerPickupAddress({
          alias: doc.nickname ?? "",
          phone: doc.phone ?? "",
          addressLine1: doc.addressLine1 ?? "",
          addressLine2: doc.addressLine2 ?? undefined,
          pincode: doc.pincode ?? "",
          city: doc.city ?? "",
          state: doc.state ?? "",
          country: doc.country ?? "India",
          latitude: doc.latitude ?? undefined,
          longitude: doc.longitude ?? undefined,
        })
        .catch((err) => logger.warn(`${tag} sync failed for "${doc.nickname}": ${err?.message}`));
    } else if (account.slug === "delhivery") {
      const provider = new DelhiveryProvider(account);
      provider
        .registerPickupAddress({
          name: doc.nickname ?? "",
          phone: doc.phone ?? "",
          email: doc.email ?? "",
          address: doc.addressLine1 ?? "",
          pin: doc.pincode ?? "",
          city: doc.city ?? "",
          state: doc.state ?? "",
          country: doc.country ?? "India",
        })
        .catch((err) => logger.warn(`${tag} sync failed for "${doc.nickname}": ${err?.message}`));
    } else if (account.slug === "shipexindia") {
      const provider = new ShipexProvider(account);
      provider
        .registerPickupAddress({
          contactName: doc.contactName ?? "",
          email: doc.email ?? "",
          phone: doc.phone ?? "",
          address: [doc.addressLine1, doc.addressLine2].filter(Boolean).join(", "),
          pincode: doc.pincode ?? "",
          city: doc.city ?? "",
          state: doc.state ?? "",
        })
        .catch((err) => logger.warn(`${tag} sync failed for "${doc.nickname}": ${err?.message}`));
    }
  }
}

export async function updateAddress(
  userId: string,
  addressId: string,
  data: Partial<PickupAddressInsert>,
): Promise<PickupAddressListItem> {
  // Prevent changing ownership or primary via update
  const {
    userId: _u,
    isPrimary: _p,
    isActive: _a,
    id: _id,
    createdAt: _c,
    updatedAt: _ud,
    ...updateData
  } = data as PickupAddressInsert;

  if (Object.keys(updateData).length === 0) {
    const existing = await getAddress(userId, addressId);
    return existing;
  }

  const [doc] = await db
    .update(pickupAddresses)
    .set({ ...updateData, updatedAt: new Date() })
    .where(
      and(
        eq(pickupAddresses.id, addressId),
        eq(pickupAddresses.userId, userId),
        eq(pickupAddresses.isActive, true),
      ),
    )
    .returning();

  if (!doc) throw new PickupAddressError(404, "Address not found");
  return toListItem(doc);
}

export async function deleteAddress(
  userId: string,
  addressId: string,
): Promise<void> {
  const doc = await db.query.pickupAddresses.findFirst({
    where: and(
      eq(pickupAddresses.id, addressId),
      eq(pickupAddresses.userId, userId),
      eq(pickupAddresses.isActive, true),
    ),
  });

  if (!doc) throw new PickupAddressError(404, "Address not found");

  const wasPrimary = doc.isPrimary;

  // Soft delete
  await db
    .update(pickupAddresses)
    .set({ isActive: false, isPrimary: false, updatedAt: new Date() })
    .where(eq(pickupAddresses.id, addressId));

  // If was primary, reassign to oldest remaining
  if (wasPrimary) {
    const oldest = await db.query.pickupAddresses.findFirst({
      where: and(
        eq(pickupAddresses.userId, userId),
        eq(pickupAddresses.isActive, true),
        ne(pickupAddresses.id, addressId),
      ),
      orderBy: asc(pickupAddresses.createdAt),
    });

    if (oldest) {
      await db
        .update(pickupAddresses)
        .set({ isPrimary: true, updatedAt: new Date() })
        .where(eq(pickupAddresses.id, oldest.id));
    }
  }
}

export async function setPrimary(
  userId: string,
  addressId: string,
): Promise<PickupAddressListItem> {
  const doc = await db.query.pickupAddresses.findFirst({
    where: and(
      eq(pickupAddresses.id, addressId),
      eq(pickupAddresses.userId, userId),
      eq(pickupAddresses.isActive, true),
    ),
  });

  if (!doc) throw new PickupAddressError(404, "Address not found");

  // Unset current primary
  await db
    .update(pickupAddresses)
    .set({ isPrimary: false, updatedAt: new Date() })
    .where(and(eq(pickupAddresses.userId, userId), eq(pickupAddresses.isPrimary, true)));

  // Set new primary
  const [updated] = await db
    .update(pickupAddresses)
    .set({ isPrimary: true, updatedAt: new Date() })
    .where(eq(pickupAddresses.id, addressId))
    .returning();

  return toListItem(updated);
}
