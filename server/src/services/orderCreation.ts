import { and, eq, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { orders, couriers, pickupAddresses, users, wallets, walletTransactions } from "../db/schema.js";
import {
  createProvider,
  resolveAccountForCourier,
  type OrderCreationParams,
  type ProviderAccount,
} from "./providers/index.js";
import { createWalletTransaction, TransactionType } from "./wallet.js";
import { dispatchWebhookEvent } from "./webhook.js";
import { buildOrderEventData } from "./webhookEvents.js";
import { notifyAsync, notifyAdmins } from "./notificationService.js";
import { getOrderLabel } from "./documents/index.js";
import logger from "../config/logger.js";
import { AppError } from "../utils/AppError.js";

const TAG = "[OrderCreation]";

type OrderRow = typeof orders.$inferSelect;

export class OrderCreationError extends AppError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = "OrderCreationError";
  }
}

/**
 * Some courier accounts are registered to a single pickup hub and will only
 * accept shipments originating from one fixed pincode. Admins capture that as a
 * `defaultPincode` credential on the service-provider account. When present,
 * the order's pickup pincode must match it exactly. Returns the trimmed pincode
 * or null when no hub restriction is configured.
 *
 * Mirrors the b2c/b2b block-selection logic in BaseProvider.getCredentials so
 * the value validated here is the same block the provider will actually use.
 */
function getConfiguredHubPincode(
  account: ProviderAccount,
  orderType: "B2B" | "B2C",
): string | null {
  const creds = account.credentials;
  if (!creds) return null;

  const b2b = creds.b2b;
  const useB2c =
    orderType === "B2C" ||
    b2b?.sameAsB2c === true ||
    !b2b?.values ||
    Object.keys(b2b.values).length === 0;
  const values = useB2c ? creds.b2c?.values : b2b?.values;

  const raw = values?.defaultPincode;
  return raw && raw.trim() ? raw.trim() : null;
}

export interface CreateOrderInput {
  userId: string;
  orderId: string;
  orderDate: string;
  orderType: "B2B" | "B2C";
  paymentType: "prepaid" | "cod";

  // Delivery
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  pincode: string;

  // Package (used for B2C single-package; for B2B these hold aggregate/primary values)
  weight: number; // grams
  length: number; // cm
  breadth: number; // cm
  height: number; // cm
  chargeableWeight: number; // grams (client-provided, will be recalculated)

  // Products & value
  products: Array<{
    name: string;
    unitPrice: number;
    quantity: number;
    hsn?: string;
    taxRate?: number;
  }>;
  orderAmount: number;
  codAmount: number;
  discount?: number;

  // Selected courier
  courierId: string;

  // Pickup
  pickupAddressId: string;
  preferredPickupDate: string;
  preferredPickupTime: string;

  // Rate snapshot from courier selection step
  rate: {
    forward: number;
    rto: number;
    codCharges: number;
    otherCharges: number;
    freightCharge: number;
    totalCharge: number;
    zone: string;
  };

  // ── B2B-specific fields (optional, only for orderType === "B2B") ──
  companyName?: string;
  companyGst?: string;

  /** Multi-box packages for B2B */
  packages?: Array<{
    boxId: string;
    quantity?: number; // identical-box count, defaults to 1
    weight: number; // kg per box
    length: number; // cm
    breadth: number; // cm
    height: number; // cm
  }>;

  /** Invoice details for B2B */
  invoices?: Array<{
    invoiceNumber: string;
    invoiceDate: string;
    invoiceValue: number;
    ebn?: string;
    ebnExpiry?: string; // YYYY-MM-DD
    fileUrl?: string;
  }>;

  /** Detailed B2B charges breakdown */
  chargesBreakdown?: {
    baseFreight: number;
    overheads: Array<{
      code: string;
      name: string;
      type: string;
      amount: number;
    }>;
    total: number;
  };
}

// ── Helpers ──

function calculateChargeableWeight(
  weightG: number,
  length: number,
  breadth: number,
  height: number,
): number {
  const volumetricG = (length * breadth * height) / 5; // dimensions in cm → grams
  return Math.ceil(Math.max(weightG, volumetricG));
}

/** B2B chargeable weight: sum of per-box max(dead, volumetric) in kg × box quantity, then convert to grams */
function calculateB2bChargeableWeight(
  packages: Array<{ quantity?: number; weight: number; length: number; breadth: number; height: number }>,
  volumetricDivisor = 5000,
): number {
  let totalKg = 0;
  for (const pkg of packages) {
    const qty = Math.max(1, Math.floor(pkg.quantity ?? 1));
    const volumetricKg = (pkg.length * pkg.breadth * pkg.height) / volumetricDivisor;
    totalKg += Math.max(pkg.weight, volumetricKg) * qty;
  }
  return Math.ceil(totalKg * 1000); // return in grams for consistency with Order model
}

// ── Main ──

export async function createOrder(input: CreateOrderInput): Promise<OrderRow> {
  const start = Date.now();
  logger.info(`${TAG} Starting order creation — ${input.orderId} (courier: ${input.courierId})`);

  // ── 1. Validate courier exists and is enabled ──
  const courier = await db.query.couriers.findFirst({ where: eq(couriers.id, input.courierId) });
  if (!courier) {
    throw new OrderCreationError(400, `Courier ${input.courierId} not found`);
  }
  if (!courier.isEnabled) {
    throw new OrderCreationError(400, `Courier ${courier.name} is currently disabled`);
  }

  // ── 2. Duplicate order ID check (per-seller uniqueness) ──
  const existingOrder = await db.query.orders.findFirst({
    where: and(eq(orders.orderId, input.orderId), eq(orders.userId, input.userId)),
    columns: { id: true, status: true, metadata: true },
  });
  if (existingOrder && existingOrder.status !== "draft") {
    throw new OrderCreationError(400, `Order number "${input.orderId}" already exists`);
  }

  // ── 3. Fetch pickup address ──
  const pickupAddr = await db.query.pickupAddresses.findFirst({
    where: and(
      eq(pickupAddresses.id, input.pickupAddressId),
      eq(pickupAddresses.userId, input.userId),
      eq(pickupAddresses.isActive, true),
    ),
  });

  if (!pickupAddr) {
    throw new OrderCreationError(400, "Pickup address not found or inactive");
  }

  // ── 4. Server-side chargeable weight calculation ──
  // Serviceability is already verified upstream by the rate-card / courier-availability
  // step (see courierAvailability.ts) — the user can only reach this point with a
  // courier the rate-card flow declared serviceable, so re-checking here just adds
  // latency and unnecessary external API calls (including to unrelated providers).

  const chargeableWeight =
    input.orderType === "B2B" && input.packages && input.packages.length > 0
      ? calculateB2bChargeableWeight(input.packages)
      : calculateChargeableWeight(input.weight, input.length, input.breadth, input.height);
  logger.info(`${TAG} Chargeable weight: ${chargeableWeight}g (actual: ${input.weight}g, client sent: ${input.chargeableWeight}g)`);

  // ── 6. Build RTO address ──
  const rtoAddrJson = (pickupAddr.rtoAddress ?? null) as
    | {
        contactName?: string;
        phone?: string;
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        state?: string;
        country?: string;
        pincode?: string;
      }
    | null;
  const rtoAddr = pickupAddr.isSameAsRto
    ? {
        contactName: pickupAddr.contactName ?? "",
        phone: pickupAddr.phone ?? "",
        addressLine1: pickupAddr.addressLine1 ?? "",
        addressLine2: pickupAddr.addressLine2 ?? undefined,
        city: pickupAddr.city ?? "",
        state: pickupAddr.state ?? "",
        country: pickupAddr.country ?? "India",
        pincode: pickupAddr.pincode ?? "",
      }
    : rtoAddrJson
      ? {
          contactName: rtoAddrJson.contactName ?? "",
          phone: rtoAddrJson.phone ?? "",
          addressLine1: rtoAddrJson.addressLine1 ?? "",
          addressLine2: rtoAddrJson.addressLine2,
          city: rtoAddrJson.city ?? "",
          state: rtoAddrJson.state ?? "",
          country: rtoAddrJson.country ?? "India",
          pincode: rtoAddrJson.pincode ?? "",
        }
      : undefined;

  // ── 7. Build provider params ──
  const providerParams: OrderCreationParams = {
    orderId: input.orderId,
    orderType: input.orderType,
    paymentType: input.paymentType,
    orderDate: input.orderDate,
    pickup: {
      contactName: pickupAddr.contactName ?? "",
      phone: pickupAddr.phone ?? "",
      email: pickupAddr.email ?? undefined,
      addressLine1: pickupAddr.addressLine1 ?? "",
      addressLine2: pickupAddr.addressLine2 ?? undefined,
      city: pickupAddr.city ?? "",
      state: pickupAddr.state ?? "",
      country: pickupAddr.country ?? "India",
      pincode: pickupAddr.pincode ?? "",
      // Delhivery books against the *registered warehouse name* (the nickname we
      // registered via pickupAddress.ts) — same value manifestService uses for
      // the pickup request. Keep the two in sync or the portal shows no pickup.
      nickname: pickupAddr.nickname ?? undefined,
      gstNumber: pickupAddr.gstNumber ?? undefined,
    },
    delivery: {
      name: input.buyerName,
      phone: input.buyerPhone,
      email: input.buyerEmail,
      addressLine1: input.address,
      addressLine2: input.address2,
      city: input.city,
      state: input.state,
      country: "India",
      pincode: input.pincode,
    },
    weight: input.weight,
    length: input.length,
    breadth: input.breadth,
    height: input.height,
    products: input.products,
    orderAmount: input.orderAmount,
    codAmount: input.codAmount,
    shippingCharges: input.rate.freightCharge,
    codCharges: input.rate.codCharges,
    discount: input.discount,
    rtoAddress: rtoAddr,
    metaData: {
      ...(courier.metaData as Record<string, unknown> | null ?? {}),
      courierName: courier.name,
      zone: input.rate.zone,
      rtoCharge: input.rate.rto,
      otherCharges: input.rate.otherCharges,
    },
    preferredPickupDate: input.preferredPickupDate,
    preferredPickupTime: input.preferredPickupTime,

    // B2B-specific fields
    ...(input.orderType === "B2B" && {
      packages: input.packages,
      companyName: input.companyName,
      companyGst: input.companyGst,
      invoices: input.invoices?.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        invoiceValue: inv.invoiceValue,
        ebn: inv.ebn,
        ebnExpiry: inv.ebnExpiry,
      })),
    }),
  };

  // ── 8. Pre-flight wallet balance check ──
  // Done BEFORE the provider API call so we don't book an AWB at the courier
  // for an order we then can't debit. The atomic debit in step 9 is still the
  // source of truth (and protects against TOCTOU races from concurrent orders),
  // but this fast-path stops the common "insufficient balance" case from
  // creating orphaned shipments at the courier.
  if (input.rate.totalCharge > 0) {
    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, input.userId),
      columns: { balance: true },
    });
    if (!wallet) {
      throw new OrderCreationError(404, "Wallet not found for user");
    }
    if (Number(wallet.balance) < input.rate.totalCharge) {
      throw new OrderCreationError(400, "Insufficient wallet balance");
    }
  }

  // ── 9. Resolve the account this courier ships through, then call its API ──
  const account = await resolveAccountForCourier(courier);
  if (!account) {
    throw new OrderCreationError(
      400,
      `Courier ${courier.name} is not bound to any active service-provider account`,
    );
  }

  // ── Hub-pincode guard ──────────────────────────────────────────────────
  // If this account is locked to a single pickup hub (default_pincode), the
  // pickup address must originate from that exact pincode.
  const hubPincode = getConfiguredHubPincode(account, input.orderType);
  if (hubPincode && (pickupAddr.pincode ?? "").trim() !== hubPincode) {
    throw new OrderCreationError(
      400,
      `Pickup pincode ${pickupAddr.pincode || "(none)"} is not serviced by ${courier.name}'s hub. ` +
        `This courier picks up only from pincode ${hubPincode}. ` +
        `Please select a pickup address in ${hubPincode}, or choose a different courier.`,
    );
  }

  // For B2B orders, prefer the *_b2b variant class if one is registered for
  // this slug (e.g. Delhivery has a separate LTL API). Otherwise the same
  // class handles both flows.
  const provider = createProvider(account, input.orderType);
  if (!provider) {
    throw new OrderCreationError(
      400,
      `No integration class registered for provider slug "${account.slug}"`,
    );
  }
  logger.info(
    `${TAG} Calling ${account.slug} API via "${account.name}" to create ${input.orderType} shipment for ${input.orderId}`,
  );
  const providerResult = await provider.createOrder(providerParams);

  if (!providerResult.success || !providerResult.awb) {
    logger.error(
      `${TAG} ${account.name} (${account.slug}) rejected order ${input.orderId} — ${providerResult.error}`,
    );
    throw new OrderCreationError(
      502,
      `Courier partner (${account.name}) rejected the order: ${providerResult.error || "Unknown error"}`,
    );
  }

  logger.info(`${TAG} Provider confirmed — AWB: ${providerResult.awb}`);

  // ── 9. Atomic: wallet debit + order save in a single Postgres transaction ──
  const order: OrderRow = await db.transaction(async (tx) => {
    // 9a. Wallet debit
    const walletDebit = input.rate.totalCharge;
    if (walletDebit > 0) {
      const wallet = await tx.query.wallets.findFirst({ where: eq(wallets.userId, input.userId) });
      if (!wallet) {
        throw new OrderCreationError(404, "Wallet not found for user");
      }

      const reason =
        input.paymentType === "cod"
          ? "B2C COD Service Charges"
          : `${input.orderType} Prepaid Order Payment`;

      // Atomic balance debit with non-negative guard
      const [updated] = await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} - ${walletDebit}`,
          updatedAt: new Date(),
        })
        .where(and(eq(wallets.id, wallet.id), sql`${wallets.balance} >= ${walletDebit}`))
        .returning();

      if (!updated) {
        throw new OrderCreationError(400, "Insufficient wallet balance");
      }

      await tx.insert(walletTransactions).values({
        walletId: wallet.id,
        amount: String(walletDebit),
        currency: updated.currency,
        type: TransactionType.DEBIT,
        reason,
        ref: input.orderId,
        meta: {
          order_number: input.orderId,
          courier_name: courier.name,
          service_provider: courier.serviceProvider,
          freight_charges: input.rate.freightCharge,
          cod_charges: input.rate.codCharges,
          other_charges: input.rate.otherCharges,
          zone: input.rate.zone,
        },
      });

      logger.info(`${TAG} Wallet debited ₹${walletDebit} for order ${input.orderId}`);
    }

    const orderValues = {
        userId: input.userId,
        orderId: input.orderId,
        orderType: input.orderType.toLowerCase(),
        paymentMode: input.paymentType,
        status: "booked",
        courierId: input.courierId,
        // Record the actual provider variant used (e.g. "delhivery_b2b") so
        // webhook status resolution and tracking polling pick the right map.
        serviceProvider: providerResult.provider || courier.serviceProvider,
        awb: providerResult.awb,
        pickupAddressId: input.pickupAddressId,
        deliveryAddress: {
          contactName: input.buyerName,
          phone: input.buyerPhone,
          email: input.buyerEmail,
          addressLine1: input.address,
          addressLine2: input.address2,
          city: input.city,
          state: input.state,
          country: "India",
          pincode: input.pincode,
        },
        customer: {
          name: input.buyerName,
          phone: input.buyerPhone,
          email: input.buyerEmail,
        },
        items: input.products,
        weight: input.weight,
        dimensions: {
          length: input.length,
          breadth: input.breadth,
          height: input.height,
        },
        declaredValue: String(input.orderAmount),
        codAmount: String(input.codAmount),
        rateSnapshot: input.rate,
        metadata: {
          ...(((existingOrder?.metadata as Record<string, unknown> | null) ?? {})),
          orderDate: input.orderDate,
          chargeableWeight,
          providerOrderId: providerResult.providerOrderId,
          // The specific account this AWB was booked against — used by
          // tracking / cancel / manifest / NDR to dispatch back to the same
          // portal credentials.
          serviceProviderId: account.id,
          serviceProviderName: account.name,
          preferredPickupDate: input.preferredPickupDate,
          preferredPickupTime: input.preferredPickupTime,
          rtoAddress: rtoAddr,
          // B2B-specific fields parked in metadata
          ...(input.orderType === "B2B" && {
            companyName: input.companyName,
            companyGst: input.companyGst,
            packages: input.packages,
            invoices: input.invoices,
            chargesBreakdown: input.chargesBreakdown,
          }),
        },
      };

    const [createdOrder] = existingOrder
      ? await tx
          .update(orders)
          .set({ ...orderValues, updatedAt: new Date() })
          .where(and(eq(orders.id, existingOrder.id), eq(orders.userId, input.userId), eq(orders.status, "draft")))
          .returning()
      : await tx.insert(orders).values(orderValues).returning();

    return createdOrder;
  });

  logger.info(
    `${TAG} Order saved — id: ${order.id}, AWB: ${providerResult.awb}, provider: ${courier.serviceProvider} (${Date.now() - start}ms)`,
  );

  // ── 10. Post-creation: fire-and-forget tasks ──

  // 10a. Dispatch webhook events (non-blocking).
  // `order.created` says we accepted and stored the order; `order.booked` says
  // the courier confirmed it and an AWB exists. POST /orders does both in one
  // call, so both fire here — subscribers wanting only the AWB take `booked`.
  const bookedEventData = buildOrderEventData(order, {
    courierName: courier.name,
    eventTimestamp: order.createdAt,
  });
  dispatchWebhookEvent(input.userId, "order.created", {
    ...bookedEventData,
    status: "created",
  });
  dispatchWebhookEvent(input.userId, "order.booked", {
    ...bookedEventData,
    previous_status: "created",
  });

  // 10a-bis. In-app / email / whatsapp notifications (config-driven, non-blocking)
  notifyAsync({
    userId: input.userId,
    event: "order.booked",
    data: {
      orderId: order.orderId,
      orderObjectId: order.id,
      awb: order.awb,
      amount: Number(order.declaredValue),
      courier: courier.name,
    },
  });

  // Also notify admins about the new order.
  (async () => {
    const seller = await db.query.users.findFirst({
      where: eq(users.id, input.userId),
      columns: { name: true, firstName: true, email: true },
    });
    notifyAdmins("admin.new_order", {
      orderId: order.orderId,
      orderObjectId: order.id,
      amount: Number(order.declaredValue),
      courier: courier.name,
      sellerName: seller?.name ?? seller?.firstName ?? "a seller",
    });
  })().catch(() => {});

  // 10b. Pre-fetch and cache label (non-blocking)
  getOrderLabel(order).catch((err) => {
    logger.warn(`${TAG} Background label fetch failed for ${order.awb} — ${(err as Error).message}`);
  });

  // Silence unused-import warning when createWalletTransaction is bypassed inside tx
  void createWalletTransaction;

  return order;
}
