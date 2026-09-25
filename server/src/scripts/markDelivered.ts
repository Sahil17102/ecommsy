import dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { connectDB, disconnectDB, db } from "../config/db.js";
import { orders } from "../db/schema.js";
import { processWebhookEvent } from "../services/webhookProcessor.js";
import { courierStatusMap } from "../config/courierStatusMap.js";
import logger from "../config/logger.js";

dotenv.config();

const AWB = process.argv[2];
if (!AWB) {
  console.error("Usage: tsx src/scripts/markDelivered.ts <awb_number>");
  process.exit(1);
}

async function main() {
  await connectDB();
  logger.info("Connected to Postgres");

  // 1. Look up the order to get its current state
  const order = await db.query.orders.findFirst({ where: eq(orders.awb, AWB) });
  if (!order) {
    logger.error(`Order not found for AWB=${AWB}`);
    await disconnectDB();
    process.exit(1);
  }

  const deliveryAddress = (order.deliveryAddress as { city?: string } | null) ?? null;
  const metadata = (order.metadata as Record<string, unknown> | null) ?? {};

  console.log("\n── Order found ──");
  console.log(`  Order ID   : ${order.orderId}`);
  console.log(`  AWB        : ${order.awb}`);
  console.log(`  Status     : ${order.status}`);
  console.log(`  Payment    : ${order.paymentMode}`);
  console.log(`  COD Amount : ₹${Number(order.codAmount ?? 0) || Number(order.declaredValue ?? 0)}`);
  console.log(`  Provider   : ${order.serviceProvider}`);
  console.log(`  User ID    : ${order.userId}`);

  if (order.status === "delivered") {
    console.log("\n⚠ Order is already delivered. No action taken.");
    await disconnectDB();
    process.exit(0);
  }

  // 2. Resolve the correct provider-specific "delivered" status string
  //    e.g. delhivery → "Delivered", ekart → "DEL", etc.
  const provider = order.serviceProvider ?? "";
  const providerMap = courierStatusMap[provider] ?? {};
  const deliveredCourierStatus = Object.entries(providerMap).find(
    ([, internalStatus]) => internalStatus === "delivered",
  )?.[0];

  if (!deliveredCourierStatus) {
    console.error(`No "delivered" mapping found for provider "${provider}"`);
    await disconnectDB();
    process.exit(1);
  }

  console.log(`\n  Using courier status: "${deliveredCourierStatus}" for provider "${provider}"`);

  // 3. Process via the standard webhook flow — this triggers:
  //    - Status → delivered
  //    - deliveredAt timestamp
  //    - COD remittance creation (if COD order)
  //    - Tracking event logged
  //    - Merchant webhook dispatched
  const result = await processWebhookEvent(
    {
      awb: AWB,
      provider,
      courierStatus: deliveredCourierStatus,
      remark: "Manually marked as delivered via script",
      location: deliveryAddress?.city || "",
      eventTimestamp: new Date().toISOString(),
      rawPayload: { source: "manual_script", awb: AWB },
    },
    "polling",
  );

  console.log("\n── Result ──");
  console.log(`  Processed  : ${result.processed}`);
  console.log(`  New Status : ${result.newStatus ?? "unchanged"}`);

  // 3. Verify final state
  const updated = await db.query.orders.findFirst({ where: eq(orders.awb, AWB) });
  if (updated) {
    const updatedMetadata = (updated.metadata as Record<string, unknown> | null) ?? {};
    console.log("\n── Updated Order ──");
    console.log(`  Status      : ${updated.status}`);
    console.log(`  Delivered At: ${updated.deliveredAt}`);
    if (updated.paymentMode === "cod") {
      console.log(`  COD Collected: ${updatedMetadata.codCollected ?? false}`);
    }
  }

  await disconnectDB();
  console.log("\nDone.");

  // Reference unused var to satisfy lint
  void metadata;
}

main().catch((err) => {
  logger.error("Script failed:", err);
  disconnectDB().finally(() => process.exit(1));
});
