import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../config/db.js";
import { orders, users, couriers } from "../../db/schema.js";
import { generateLabel, generateBulkLabels } from "./labelGenerator.js";
import { generateInvoice } from "./invoiceGenerator.js";
import { generateManifestBook, type ManifestGroup } from "./manifestGenerator.js";
import { uploadDocument, downloadDocument, buildDocumentKey } from "../storage.js";
import logger from "../../config/logger.js";
import { AppError } from "../../utils/AppError.js";

const TAG = "[Documents]";

type OrderRow = typeof orders.$inferSelect;

/**
 * Generate (or return cached) shipping label for an order.
 */
export async function getOrderLabel(
  order: OrderRow,
): Promise<{ buffer: Buffer; contentType: string }> {
  if (order.labelUrl) {
    try {
      return await downloadDocument(order.labelUrl);
    } catch {
      logger.warn(`${TAG} Cached label not found for ${order.awb}, regenerating`);
    }
  }

  const buffer = await generateLabel(order);
  const contentType = "application/pdf";
  logger.info(`${TAG} Label generated for AWB ${order.awb} (${buffer.length} bytes)`);

  const key = buildDocumentKey(order.userId, order.id, "label");
  await uploadDocument(key, buffer, contentType);
  await db.update(orders).set({ labelUrl: key, updatedAt: new Date() }).where(eq(orders.id, order.id));

  return { buffer, contentType };
}

/**
 * Generate (or return cached) invoice for an order.
 *
 * NOTE: the Drizzle `orders` schema does not currently have a dedicated
 * `invoiceUrl` column (only `labelUrl` and `manifestUrl`). We stash the
 * generated invoice key under `metadata.invoiceUrl` so subsequent calls can
 * reuse it, while still returning the freshly-generated buffer.
 */
export async function getOrderInvoice(
  order: OrderRow,
): Promise<{ buffer: Buffer; contentType: string }> {
  const metadata = (order.metadata as Record<string, unknown> | null) ?? null;
  const cachedKey = typeof metadata?.invoiceUrl === "string" ? (metadata.invoiceUrl as string) : null;

  if (cachedKey) {
    try {
      return await downloadDocument(cachedKey);
    } catch {
      logger.warn(`${TAG} Cached invoice not found for ${order.awb}, regenerating`);
    }
  }

  const buffer = await generateInvoice(order);
  const contentType = "application/pdf";

  const key = buildDocumentKey(order.userId, order.id, "invoice");
  await uploadDocument(key, buffer, contentType);

  // Stash invoice key inside the `metadata` jsonb blob (no dedicated column).
  await db
    .update(orders)
    .set({
      metadata: sql`COALESCE(${orders.metadata}, '{}'::jsonb) || ${JSON.stringify({ invoiceUrl: key })}::jsonb`,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  logger.info(`${TAG} Invoice generated for order ${order.orderId} (${buffer.length} bytes)`);
  return { buffer, contentType };
}

/** Safety cap on how many labels can be merged into one bulk PDF request. */
export const BULK_LABEL_MAX = 300;

/**
 * Generate a single merged PDF containing the shipping labels for a batch of
 * orders (one label per page). Regenerates each label fresh rather than
 * reusing the per-order S3 cache, so the merged output always reflects the
 * latest label settings.
 */
export async function getBulkLabels(
  orderIds: string[],
  userId: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  if (orderIds.length > BULK_LABEL_MAX) {
    throw new AppError(400, `You can download at most ${BULK_LABEL_MAX} labels at once`);
  }

  const orderRows = await db
    .select()
    .from(orders)
    .where(and(inArray(orders.id, orderIds), eq(orders.userId, userId)));

  if (orderRows.length === 0) throw new AppError(400, "No orders found for labels");

  // Preserve the caller's selection order (inArray does not guarantee it).
  const orderById = new Map(orderRows.map((o) => [o.id, o]));
  const ordered = orderIds.map((id) => orderById.get(id)).filter((o): o is OrderRow => !!o);

  const buffer = await generateBulkLabels(ordered);
  logger.info(`${TAG} Bulk labels generated for ${ordered.length} orders (${buffer.length} bytes)`);
  return { buffer, contentType: "application/pdf" };
}

/** Safety cap on how many orders can go into one manifest request. */
export const BULK_MANIFEST_DOC_MAX = 500;

interface ManifestOptions {
  /**
   * Persist the PDF and stamp `manifestUrl` on every order in it.
   *
   * ONLY true for the pickup flow (manifestOrders). A plain download must
   * leave `manifestUrl` alone — it is what `canManifest()` reads to decide
   * whether an order still needs a pickup, so persisting it on download would
   * silently disable "Initiate Pickup" for orders that were merely printed.
   */
  persist?: boolean;
}

/**
 * Generate a pickup manifest PDF for a batch of orders.
 *
 * Orders are grouped by courier and each courier gets its own sheet inside the
 * returned PDF: a manifest is a per-carrier hand-off document, so a mixed
 * selection must not print as one sheet with a "DTDC, DELHIVERY" carrier line.
 */
export async function generateManifest(
  orderIds: string[],
  userId: string,
  options: ManifestOptions = {},
): Promise<{ buffer: Buffer; contentType: string }> {
  const { persist = true } = options;

  if (orderIds.length > BULK_MANIFEST_DOC_MAX) {
    throw new AppError(400, `You can manifest at most ${BULK_MANIFEST_DOC_MAX} orders at once`);
  }

  const orderRows = await db
    .select()
    .from(orders)
    .where(and(inArray(orders.id, orderIds), eq(orders.userId, userId)));

  if (orderRows.length === 0) throw new AppError(400, "No orders found for manifest");

  // Resolve the human-readable seller + carrier names for the manifest header.
  const seller = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { name: true, businessName: true, email: true },
  });
  const sellerName = seller?.businessName || seller?.name || seller?.email || "Seller";

  // Carrier: prefer the renamable courier name over the aggregator/provider slug.
  const courierIds = [...new Set(orderRows.map((o) => o.courierId).filter((id): id is string => !!id))];
  const courierRows = courierIds.length
    ? await db.select({ id: couriers.id, name: couriers.name }).from(couriers).where(inArray(couriers.id, courierIds))
    : [];
  const courierNameById = new Map(courierRows.map((c) => [c.id, c.name]));

  // One group per courier, in the order couriers first appear in the selection.
  const groupsByKey = new Map<string, { carrierName: string; orders: OrderRow[] }>();
  for (const o of orderRows) {
    const key = o.courierId ?? o.serviceProvider ?? "unknown";
    const carrierName = (
      (o.courierId && courierNameById.get(o.courierId)) || o.serviceProvider || "CARRIER"
    ).toUpperCase();
    const group = groupsByKey.get(key);
    if (group) group.orders.push(o);
    else groupsByKey.set(key, { carrierName, orders: [o] });
  }

  const stamp = Date.now();
  const generatedAt = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });

  const groups: ManifestGroup[] = [...groupsByKey.values()].map((g, i) => ({
    orders: g.orders,
    meta: {
      sellerName,
      carrierName: g.carrierName,
      // Suffix keeps each carrier's sheet individually identifiable when a
      // mixed batch is printed as one file.
      manifestNumber: groupsByKey.size > 1 ? `${stamp}-${i + 1}` : `${stamp}`,
      generatedAt,
    },
  }));

  const buffer = await generateManifestBook(groups);
  const contentType = "application/pdf";

  if (persist) {
    const key = buildDocumentKey(userId, `manifest_${stamp}`, "manifest");
    await uploadDocument(key, buffer, contentType);
    await db
      .update(orders)
      .set({ manifestUrl: key, updatedAt: new Date() })
      .where(and(inArray(orders.id, orderIds), eq(orders.userId, userId)));
  }

  logger.info(
    `${TAG} Manifest generated for ${orderRows.length} orders across ${groups.length} courier(s) (${buffer.length} bytes, persist=${persist})`,
  );
  return { buffer, contentType };
}
