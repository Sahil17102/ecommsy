import type { Request, Response } from "express";
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { orders } from "../db/schema.js";
import { serializeOrder } from "../utils/orderSerializer.js";
import { dispatchWebhookEvent } from "../services/webhook.js";
import { buildOrderEventData } from "../services/webhookEvents.js";
import logger from "../config/logger.js";

const TAG = "[ExternalOrderImport]";

type ImportedItem = {
  name: string;
  sku?: string;
  quantity: number;
  price?: number;
  unitPrice?: number;
  hsn?: string;
  taxRate?: number;
};

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function handleImportExternalOrder(req: Request, res: Response) {
  const userId = req.userId!;
  const body = req.body as Record<string, any>;
  const externalOrderId = str(body.externalOrderId);
  if (!externalOrderId) {
    res.status(400).json({ success: false, error: "externalOrderId is required" });
    return;
  }

  const orderId = str(body.orderId) ?? externalOrderId;
  const customer = (body.customer ?? {}) as Record<string, unknown>;
  const address = (body.deliveryAddress ?? {}) as Record<string, unknown>;
  const pkg = (body.package ?? {}) as Record<string, unknown>;
  const items = ((body.items ?? body.products ?? []) as ImportedItem[]).map((item) => ({
    name: str(item.name) ?? "Item",
    sku: str(item.sku),
    quantity: Math.max(1, Math.floor(num(item.quantity, 1))),
    unitPrice: num(item.unitPrice ?? item.price, 0),
    hsn: str(item.hsn),
    taxRate: item.taxRate == null ? undefined : num(item.taxRate, 0),
  }));

  if (items.length === 0) {
    res.status(400).json({ success: false, error: "At least one item/product is required" });
    return;
  }

  const paymentMode = body.paymentMode === "cod" ? "cod" : "prepaid";
  const orderAmount =
    body.orderAmount == null
      ? items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
      : num(body.orderAmount, 0);
  const codAmount = paymentMode === "cod" ? num(body.codAmount ?? orderAmount, orderAmount) : 0;
  const weight = num(pkg.weight ?? body.weight, 500);
  const length = num(pkg.length ?? body.length, 10);
  const breadth = num(pkg.breadth ?? body.breadth, 10);
  const height = num(pkg.height ?? body.height, 10);

  const existing = await db.query.orders.findFirst({
    where: and(
      eq(orders.userId, userId),
      or(
        eq(orders.orderId, orderId),
        sql`${orders.metadata}->>'externalOrderId' = ${externalOrderId}`,
      ),
    ),
  });

  if (existing) {
    res.status(200).json({
      success: true,
      imported: false,
      duplicate: true,
      order: serializeOrder(existing),
    });
    return;
  }

  const [created] = await db
    .insert(orders)
    .values({
      userId,
      orderId,
      orderType: (str(body.orderType) ?? "B2C").toLowerCase(),
      paymentMode,
      status: "draft",
      customer: {
        name: str(customer.name ?? body.buyerName),
        phone: str(customer.phone ?? body.buyerPhone),
        email: str(customer.email ?? body.buyerEmail),
      },
      deliveryAddress: {
        contactName: str(customer.name ?? body.buyerName),
        phone: str(customer.phone ?? body.buyerPhone),
        email: str(customer.email ?? body.buyerEmail),
        addressLine1: str(address.addressLine1 ?? body.address) ?? "",
        addressLine2: str(address.addressLine2 ?? body.address2) ?? "",
        city: str(address.city ?? body.city) ?? "",
        state: str(address.state ?? body.state) ?? "",
        country: str(address.country) ?? "India",
        pincode: str(address.pincode ?? body.pincode) ?? "",
      },
      items,
      weight,
      dimensions: { length, breadth, height },
      declaredValue: String(orderAmount),
      codAmount: String(codAmount),
      metadata: {
        source: str(body.source) ?? "external_store",
        externalOrderId,
        importedAt: new Date().toISOString(),
        orderDate: str(body.orderDate) ?? new Date().toISOString().slice(0, 10),
        chargeableWeight: num(pkg.chargeableWeight ?? body.chargeableWeight, weight),
        storePayload: body.storePayload ?? undefined,
      },
    })
    .returning();

  logger.info(`${TAG} Imported draft order ${orderId} for user=${userId} externalOrderId=${externalOrderId}`);
  dispatchWebhookEvent(userId, "order.created", buildOrderEventData(created, { status: "draft", eventTimestamp: created.createdAt }));

  res.status(201).json({ success: true, imported: true, order: serializeOrder(created) });
}
