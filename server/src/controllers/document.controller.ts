import type { Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { orders } from "../db/schema.js";
import { getOrderLabel, getOrderInvoice, generateManifest, getBulkLabels } from "../services/documents/index.js";

/**
 * GET /orders/:id/label — Download the shipping label for an order
 */
export async function handleGetLabel(req: Request, res: Response) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, req.params.id), eq(orders.userId, req.userId!)),
  });
  if (!order) {
    res.status(404).json({ success: false, error: "Order not found" });
    return;
  }

  // ?force=1 bypasses cached label and regenerates fresh
  const orderForDocs = req.query.force === "1" && order.labelUrl
    ? { ...order, labelUrl: null }
    : order;

  const { buffer, contentType } = await getOrderLabel(orderForDocs as never);

  res.set({
    "Content-Type": contentType,
    "Content-Disposition": `inline; filename="label-${order.awb}.pdf"`,
    "Content-Length": String(buffer.length),
  });
  res.send(buffer);
}

/**
 * GET /orders/:id/invoice — Download the invoice for an order
 *
 * NOTE: the Drizzle `orders` schema does not currently have an `invoiceUrl`
 * column (only `labelUrl` and `manifestUrl`). We pass the order through to
 * the document service which generates the invoice on the fly.
 */
export async function handleGetInvoice(req: Request, res: Response) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, req.params.id), eq(orders.userId, req.userId!)),
  });
  if (!order) {
    res.status(404).json({ success: false, error: "Order not found" });
    return;
  }

  // ?force=1 bypasses the cached invoice (stashed under metadata.invoiceUrl) and regenerates fresh
  let orderForDocs = order;
  if (req.query.force === "1") {
    const { invoiceUrl: _omit, ...restMeta } = (order.metadata as Record<string, unknown> | null) ?? {};
    orderForDocs = { ...order, metadata: restMeta };
  }

  const { buffer, contentType } = await getOrderInvoice(orderForDocs as never);

  res.set({
    "Content-Type": contentType,
    "Content-Disposition": `inline; filename="invoice-${order.orderId}.pdf"`,
    "Content-Length": String(buffer.length),
  });
  res.send(buffer);
}

/**
 * POST /orders/bulk-labels — Download one merged PDF with the shipping labels
 * for a batch of selected orders (one label per page).
 * Body: { orderIds: string[] }
 */
export async function handleBulkLabels(req: Request, res: Response) {
  const { orderIds } = req.body;

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    res.status(400).json({ success: false, error: "orderIds array is required" });
    return;
  }

  const { buffer, contentType } = await getBulkLabels(orderIds, req.userId!);

  res.set({
    "Content-Type": contentType,
    "Content-Disposition": `inline; filename="labels-${orderIds.length}.pdf"`,
    "Content-Length": String(buffer.length),
  });
  res.send(buffer);
}

/**
 * POST /orders/manifest — Download a manifest PDF for a batch of orders
 * (one sheet per courier). Body: { orderIds: string[] }
 *
 * Download only: `persist: false` keeps `manifestUrl` untouched so printing a
 * manifest never marks the orders as already manifested — pickups are still
 * raised through /orders/bulk-manifest.
 */
export async function handleGenerateManifest(req: Request, res: Response) {
  const { orderIds } = req.body;

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    res.status(400).json({ success: false, error: "orderIds array is required" });
    return;
  }

  const { buffer, contentType } = await generateManifest(orderIds, req.userId!, { persist: false });

  res.set({
    "Content-Type": contentType,
    "Content-Disposition": `inline; filename="manifest-${orderIds.length}.pdf"`,
    "Content-Length": String(buffer.length),
  });
  res.send(buffer);
}
