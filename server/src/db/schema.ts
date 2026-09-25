/**
 * Drizzle Postgres schema for Dream Services.
 * Derived from ../../../ER_DIAGRAM.md. RBAC tables (admin_role_presets,
 * admin_audit_logs) and manual courier tables are intentionally omitted.
 */

import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  integer,
  bigint,
  doublePrecision,
  numeric,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";

/* ───────────────────────────── Enums ───────────────────────────── */

export const userRoleEnum = pgEnum("user_role", ["user", "admin", "superadmin"]);
export const planFrequencyEnum = pgEnum("plan_frequency", ["weekly", "monthly", "custom"]);
export const remittanceStatusEnum = pgEnum("remittance_status", [
  "pending",
  "in_transit",
  "remitted",
  "on_hold",
  "failed",
]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "issued", "paid", "void"]);
export const bankAccountTypeEnum = pgEnum("bank_account_type", ["bank_account", "upi"]);
export const kycStatusEnum = pgEnum("kyc_status", [
  "not_submitted",
  "pending",
  "approved",
  "rejected",
]);

/* ───────────────────────────── Users ───────────────────────────── */

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 32 }),
    name: text("name"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    passwordHash: text("password_hash"),
    role: userRoleEnum("role").notNull().default("user"),

    // Team / seller hierarchy (kept; RBAC scoping/permissions removed)
    parentUserId: uuid("parent_user_id"),
    teamRole: text("team_role"),

    // Seller profile
    pincode: varchar("pincode", { length: 16 }),
    city: text("city"),
    state: text("state"),
    businessName: text("business_name"),
    website: text("website"),
    supportEmail: text("support_email"),
    contactNumber: varchar("contact_number", { length: 32 }),
    address: text("address"),
    sellsOn: jsonb("sells_on").$type<string[]>().default([]),
    monthlyShipmentVolume: text("monthly_shipment_volume"),
    integrationsOfInterest: jsonb("integrations_of_interest").$type<string[]>().default([]),

    lastLogin: timestamp("last_login", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    onboardingComplete: boolean("onboarding_complete").notNull().default(false),
    isVerified: boolean("is_verified").notNull().default(false),

    plan: varchar("plan", { length: 64 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailUq: uniqueIndex("users_email_uq").on(t.email),
    phoneUq: uniqueIndex("users_phone_uq").on(t.phone),
    parentIdx: index("users_parent_idx").on(t.parentUserId),
  }),
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    token: text("token").notNull(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "cascade" }),
    role: userRoleEnum("role").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tokenUq: uniqueIndex("refresh_tokens_token_uq").on(t.token),
    userIdx: index("refresh_tokens_user_idx").on(t.userId),
    expiresIdx: index("refresh_tokens_expires_idx").on(t.expiresAt),
  }),
);

export const otps = pgTable(
  "otps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    identifier: text("identifier").notNull(),
    code: text("code").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    identifierIdx: index("otps_identifier_idx").on(t.identifier),
    expiresIdx: index("otps_expires_idx").on(t.expiresAt),
  }),
);

/* ─────────────────────── Pickup Addresses ─────────────────────── */

export const pickupAddresses = pgTable(
  "pickup_addresses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    nickname: text("nickname"),
    contactName: text("contact_name"),
    phone: varchar("phone", { length: 32 }),
    email: text("email"),
    role: text("role"),
    landmark: text("landmark"),
    addressLine1: text("address_line_1"),
    addressLine2: text("address_line_2"),
    city: text("city"),
    state: text("state"),
    country: text("country").default("India"),
    pincode: varchar("pincode", { length: 16 }),
    gstNumber: text("gst_number"),
    isPrimary: boolean("is_primary").notNull().default(false),
    addressType: text("address_type"),
    isSameAsRto: boolean("is_same_as_rto").notNull().default(true),
    rtoAddress: jsonb("rto_address"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("pickup_user_idx").on(t.userId),
    userPrimaryIdx: index("pickup_user_primary_idx").on(t.userId, t.isPrimary),
  }),
);

/* ───────────────────────── Locations ──────────────────────────── */

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pincode: varchar("pincode", { length: 16 }).notNull(),
    city: text("city"),
    state: text("state"),
    tags: jsonb("tags").$type<string[]>().default([]),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pincodeUq: uniqueIndex("locations_pincode_uq").on(t.pincode),
    stateCityIdx: index("locations_state_city_idx").on(t.state, t.city),
    activeIdx: index("locations_active_idx").on(t.isActive),
  }),
);

/* ────────────────── Service Providers / Couriers ──────────────── */

export const serviceProviders = pgTable("service_providers", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull(),
  /**
   * Identifies the integration class that handles this row.
   * Multiple rows can share a brand (e.g. one account per franchise) while
   * still resolving to the same provider implementation. Nullable so legacy
   * rows can be backfilled without blocking the migration.
   */
  name: text("name").notNull(),
  baseUrl: text("base_url"),
  logoUrl: text("logo_url"),
  credentials: jsonb("credentials"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const couriers = pgTable(
  "couriers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    serviceProvider: varchar("service_provider", { length: 64 }).notNull(),
    courierType: text("courier_type"),
    businessType: jsonb("business_type").$type<string[]>().default([]),
    isEnabled: boolean("is_enabled").notNull().default(true),
    logo: text("logo"),
    metaData: jsonb("meta_data"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    providerIdx: index("couriers_provider_idx").on(t.serviceProvider),
  }),
);

/* ───────────────────────── B2C Pricing ────────────────────────── */

export const b2cZones = pgTable(
  "b2c_zones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 16 }).notNull(),
    name: text("name").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ codeUq: uniqueIndex("b2c_zones_code_uq").on(t.code) }),
);

/**
 * b2c_pricing keeps the original "weightSlabs[] + zoneRates[].slabRates" shape
 * inside JSONB for fidelity with the rate-calculation logic. If you ever need
 * relational reporting on slabs, split into two child tables.
 */
export const b2cPricing = pgTable(
  "b2c_pricing",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courierId: uuid("courier_id").notNull().references(() => couriers.id, { onDelete: "cascade" }),
    plan: varchar("plan", { length: 64 }).notNull(),
    mode: varchar("mode", { length: 32 }),
    otherCharges: numeric("other_charges", { precision: 12, scale: 2 }),
    weightSlabs: jsonb("weight_slabs").$type<Array<{ minWeight: number; maxWeight: number | null }>>(),
    zoneRates: jsonb("zone_rates").$type<
      Array<{
        zone: string;
        slabRates: Array<{ forward: number; rto: number; codCharges: number; codPercent: number }>;
      }>
    >(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    courierPlanUq: uniqueIndex("b2c_pricing_courier_plan_uq").on(t.courierId, t.plan),
  }),
);

/* ───────────────────────────── Orders ─────────────────────────── */

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    orderId: varchar("order_id", { length: 128 }).notNull(),
    orderType: varchar("order_type", { length: 16 }).notNull().default("b2c"),
    awb: varchar("awb", { length: 64 }),
    courierId: uuid("courier_id").references(() => couriers.id),
    serviceProvider: varchar("service_provider", { length: 64 }),
    pickupAddressId: uuid("pickup_address_id").references(() => pickupAddresses.id),

    // Customer / consignee
    customer: jsonb("customer"),
    deliveryAddress: jsonb("delivery_address"),
    items: jsonb("items"),

    // Package + payment
    weight: doublePrecision("weight"),
    dimensions: jsonb("dimensions"),
    paymentMode: varchar("payment_mode", { length: 16 }),
    codAmount: numeric("cod_amount", { precision: 12, scale: 2 }),
    declaredValue: numeric("declared_value", { precision: 12, scale: 2 }),

    // Snapshots
    rateSnapshot: jsonb("rate_snapshot"),
    labelUrl: text("label_url"),
    manifestUrl: text("manifest_url"),

    status: varchar("status", { length: 32 }).notNull().default("draft"),
    courierStatus: varchar("courier_status", { length: 64 }),

    pickedUpAt: timestamp("picked_up_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index("orders_user_created_idx").on(t.userId, t.createdAt),
    // Admin list + CSV export both walk every order newest-first; without this
    // the keyset scan degrades into a full sort of the table.
    createdIdx: index("orders_created_idx").on(t.createdAt, t.id),
    awbUq: uniqueIndex("orders_awb_uq").on(t.awb),
    orderUserUq: uniqueIndex("orders_order_user_uq").on(t.orderId, t.userId),
    statusIdx: index("orders_status_idx").on(t.status),
    providerIdx: index("orders_provider_idx").on(t.serviceProvider),
  }),
);

/* ────────────────────────────── Plans ─────────────────────────── */

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 64 }).notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    features: jsonb("features"),
    sortOrder: integer("sort_order").notNull().default(0),
    isDefault: boolean("is_default").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugUq: uniqueIndex("plans_slug_uq").on(t.slug),
    sortIdx: index("plans_sort_idx").on(t.sortOrder),
  }),
);

/* ─────────────────────────── Wallets ──────────────────────────── */

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    balance: numeric("balance", { precision: 14, scale: 2 }).notNull().default("0"),
    currency: varchar("currency", { length: 8 }).notNull().default("INR"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ userUq: uniqueIndex("wallets_user_uq").on(t.userId) }),
);

export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    walletId: uuid("wallet_id").notNull().references(() => wallets.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 8 }).notNull().default("INR"),
    type: varchar("type", { length: 16 }).notNull(), // credit | debit
    reason: text("reason"),
    ref: text("ref"),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    walletCreatedIdx: index("wallet_tx_wallet_created_idx").on(t.walletId, t.createdAt),
    refIdx: index("wallet_tx_ref_idx").on(t.ref),
  }),
);

/* ────────────────────────── Webhooks ──────────────────────────── */

export const webhooks = pgTable(
  "webhooks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    secret: text("secret"),
    events: jsonb("events").$type<string[]>().notNull().default([]),
    isActive: boolean("is_active").notNull().default(true),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userActiveIdx: index("webhooks_user_active_idx").on(t.userId, t.isActive),
    userUrlUq: uniqueIndex("webhooks_user_url_uq").on(t.userId, t.url),
  }),
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    webhookId: uuid("webhook_id").notNull().references(() => webhooks.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    event: text("event").notNull(),
    url: text("url").notNull(),
    payload: jsonb("payload"),
    responseStatus: integer("response_status"),
    responseBody: text("response_body"),
    attempts: integer("attempts").notNull().default(0),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    webhookCreatedIdx: index("wd_webhook_created_idx").on(t.webhookId, t.createdAt),
    userCreatedIdx: index("wd_user_created_idx").on(t.userId, t.createdAt),
    retryIdx: index("wd_retry_idx").on(t.status, t.nextRetryAt),
  }),
);

/* ─────────────────────── KYC + Label Settings ─────────────────── */

export const kycDocuments = pgTable(
  "kyc_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    businessStructure: text("business_structure"),
    companyType: text("company_type"),
    status: kycStatusEnum("status").notNull().default("not_submitted"),
    selfie: jsonb("selfie"),
    panCard: jsonb("pan_card"),
    aadhaar: jsonb("aadhaar"),
    cancelledCheque: jsonb("cancelled_cheque"),
    boardResolution: jsonb("board_resolution"),
    partnershipDeed: jsonb("partnership_deed"),
    llpAgreement: jsonb("llp_agreement"),
    companyAddressProof: jsonb("company_address_proof"),
    businessPan: jsonb("business_pan"),
    gstCertificate: jsonb("gst_certificate"),
    gstin: text("gstin"),
    cin: text("cin"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userUq: uniqueIndex("kyc_user_uq").on(t.userId),
    statusIdx: index("kyc_status_idx").on(t.status),
  }),
);

export const labelSettings = pgTable(
  "label_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    showLogo: boolean("show_logo").notNull().default(true),
    logoUrl: text("logo_url"),
    hideCustomerMobile: boolean("hide_customer_mobile").notNull().default(false),
    hideCustomerOrderBar: boolean("hide_customer_order_bar").notNull().default(false),
    hideGstNumber: boolean("hide_gst_number").notNull().default(false),
    hidePickupAddress: boolean("hide_pickup_address").notNull().default(false),
    hideRtoAddress: boolean("hide_rto_address").notNull().default(false),
    hideRtoName: boolean("hide_rto_name").notNull().default(false),
    hidePickupMobile: boolean("hide_pickup_mobile").notNull().default(false),
    hideRtoMobile: boolean("hide_rto_mobile").notNull().default(false),
    hidePickupName: boolean("hide_pickup_name").notNull().default(false),
    hideHsn: boolean("hide_hsn").notNull().default(false),
    hideSku: boolean("hide_sku").notNull().default(false),
    hideQty: boolean("hide_qty").notNull().default(false),
    hideTotalAmount: boolean("hide_total_amount").notNull().default(false),
    hideOrderAmount: boolean("hide_order_amount").notNull().default(false),
    hideProduct: boolean("hide_product").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ userUq: uniqueIndex("label_settings_user_uq").on(t.userId) }),
);

/* ─────────────── Tracking / NDR / RTO event tables ────────────── */

export const trackingEvents = pgTable(
  "tracking_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    awb: varchar("awb", { length: 64 }),
    statusCode: varchar("status_code", { length: 32 }),
    statusText: text("status_text"),
    location: text("location"),
    remarks: text("remarks"),
    source: varchar("source", { length: 64 }),
    rawPayload: jsonb("raw_payload"),
    courierEventCode: varchar("courier_event_code", { length: 64 }),
    eventTimestamp: timestamp("event_timestamp", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orderCreatedIdx: index("te_order_created_idx").on(t.orderId, t.createdAt),
    awbCreatedIdx: index("te_awb_created_idx").on(t.awb, t.createdAt),
    userCreatedIdx: index("te_user_created_idx").on(t.userId, t.createdAt),
  }),
);

export const ndrEvents = pgTable(
  "ndr_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    awb: varchar("awb", { length: 64 }),
    status: varchar("status", { length: 32 }),
    reason: text("reason"),
    remarks: text("remarks"),
    nextAction: text("next_action"),
    location: text("location"),
    attemptDate: timestamp("attempt_date", { withTimezone: true }),
    attemptCount: integer("attempt_count"),
    actionTaken: text("action_taken"),
    actionTakenAt: timestamp("action_taken_at", { withTimezone: true }),
    actionResult: text("action_result"),
    source: varchar("source", { length: 64 }),
    rawPayload: jsonb("raw_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orderCreatedIdx: index("ndr_order_created_idx").on(t.orderId, t.createdAt),
    userCreatedIdx: index("ndr_user_created_idx").on(t.userId, t.createdAt),
    awbIdx: index("ndr_awb_idx").on(t.awb),
  }),
);

export const rtoEvents = pgTable(
  "rto_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    awb: varchar("awb", { length: 64 }),
    status: varchar("status", { length: 32 }),
    phase: varchar("phase", { length: 32 }),
    reason: text("reason"),
    remarks: text("remarks"),
    rtoCharges: numeric("rto_charges", { precision: 12, scale: 2 }),
    source: varchar("source", { length: 64 }),
    rawPayload: jsonb("raw_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orderCreatedIdx: index("rto_order_created_idx").on(t.orderId, t.createdAt),
    userCreatedIdx: index("rto_user_created_idx").on(t.userId, t.createdAt),
    awbIdx: index("rto_awb_idx").on(t.awb),
  }),
);

/* ──────────────────── Bank Accounts + COD ─────────────────────── */

export const bankAccounts = pgTable(
  "bank_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: bankAccountTypeEnum("type").notNull(),
    accountHolderName: text("account_holder_name"),
    accountNumber: text("account_number"),
    ifscCode: text("ifsc_code"),
    bankName: text("bank_name"),
    branchName: text("branch_name"),
    accountType: text("account_type"),
    cancelledCheque: jsonb("cancelled_cheque"),
    upiId: text("upi_id"),
    upiVerified: boolean("upi_verified").notNull().default(false),
    isPrimary: boolean("is_primary").notNull().default(false),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ userIdx: index("bank_accounts_user_idx").on(t.userId) }),
);

export const codRemittances = pgTable(
  "cod_remittances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id),
    orderType: varchar("order_type", { length: 16 }),
    orderNumber: varchar("order_number", { length: 128 }),
    awbNumber: varchar("awb_number", { length: 64 }),
    courierPartner: text("courier_partner"),
    codAmount: numeric("cod_amount", { precision: 12, scale: 2 }),
    remittableAmount: numeric("remittable_amount", { precision: 12, scale: 2 }),
    status: remittanceStatusEnum("status").notNull().default("pending"),
    collectedAt: timestamp("collected_at", { withTimezone: true }),
    creditedAt: timestamp("credited_at", { withTimezone: true }),
    walletTransactionId: uuid("wallet_transaction_id").references(() => walletTransactions.id),
    utrNumber: text("utr_number"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userStatusCreatedIdx: index("cod_user_status_created_idx").on(t.userId, t.status, t.createdAt),
    awbUq: uniqueIndex("cod_awb_uq").on(t.awbNumber),
    orderUq: uniqueIndex("cod_order_uq").on(t.orderId),
    statusCollectedIdx: index("cod_status_collected_idx").on(t.status, t.collectedAt),
  }),
);

export const invoiceCodOffsets = pgTable("invoice_cod_offsets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ────────────────────── Billing Invoices ──────────────────────── */

export const billingInvoices = pgTable(
  "billing_invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    invoiceNumber: varchar("invoice_number", { length: 64 }).notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }),
    periodEnd: timestamp("period_end", { withTimezone: true }),
    status: invoiceStatusEnum("status").notNull().default("draft"),
    type: varchar("type", { length: 32 }),
    taxableValue: numeric("taxable_value", { precision: 14, scale: 2 }),
    cgst: numeric("cgst", { precision: 14, scale: 2 }),
    sgst: numeric("sgst", { precision: 14, scale: 2 }),
    igst: numeric("igst", { precision: 14, scale: 2 }),
    gstRate: numeric("gst_rate", { precision: 6, scale: 2 }),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }),
    orderCount: integer("order_count"),
    orderNumbers: jsonb("order_numbers").$type<string[]>().default([]),
    remarks: text("remarks"),
    pdfUrl: text("pdf_url"),
    csvUrl: text("csv_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index("invoices_user_created_idx").on(t.userId, t.createdAt),
    numberUq: uniqueIndex("invoices_number_uq").on(t.invoiceNumber),
    userPeriodIdx: index("invoices_user_period_idx").on(t.userId, t.periodEnd),
  }),
);

export const billingPreferences = pgTable(
  "billing_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    frequency: planFrequencyEnum("frequency").notNull().default("monthly"),
    autoGenerate: boolean("auto_generate").notNull().default(true),
    customFrequencyDays: integer("custom_frequency_days"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ userUq: uniqueIndex("billing_prefs_user_uq").on(t.userId) }),
);

/* ────────────────────────── B2B Pricing ───────────────────────── */

export const b2bZones = pgTable(
  "b2b_zones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 16 }).notNull(),
    name: text("name").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ codeUq: uniqueIndex("b2b_zones_code_uq").on(t.code) }),
);

export const b2bPincodes = pgTable(
  "b2b_pincodes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pincode: varchar("pincode", { length: 16 }).notNull(),
    city: text("city"),
    state: text("state"),
    zoneId: uuid("zone_id").notNull().references(() => b2bZones.id),
    courierId: uuid("courier_id").notNull().references(() => couriers.id, { onDelete: "cascade" }),
    serviceProvider: varchar("service_provider", { length: 64 }),
    flags: jsonb("flags"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pincodeCourierUq: uniqueIndex("b2b_pincodes_pincode_courier_uq").on(t.pincode, t.courierId),
    providerIdx: index("b2b_pincodes_provider_idx").on(t.serviceProvider),
    zoneIdx: index("b2b_pincodes_zone_idx").on(t.zoneId),
  }),
);

export const b2bZoneRates = pgTable(
  "b2b_zone_rates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    plan: varchar("plan", { length: 64 }).notNull(),
    originZoneId: uuid("origin_zone_id").notNull().references(() => b2bZones.id),
    destinationZoneId: uuid("destination_zone_id").notNull().references(() => b2bZones.id),
    courierId: uuid("courier_id").notNull().references(() => couriers.id, { onDelete: "cascade" }),
    serviceProvider: varchar("service_provider", { length: 64 }),
    ratePerKg: numeric("rate_per_kg", { precision: 12, scale: 2 }),
    rtoRatePerKg: numeric("rto_rate_per_kg", { precision: 12, scale: 2 }),
    volumetricDivisor: integer("volumetric_divisor"),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    rateUq: uniqueIndex("b2b_rate_uq").on(t.plan, t.courierId, t.originZoneId, t.destinationZoneId),
    activeEffectiveIdx: index("b2b_rate_active_effective_idx").on(t.isActive, t.effectiveFrom),
  }),
);

export const b2bAdditionalCharges = pgTable(
  "b2b_additional_charges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    plan: varchar("plan", { length: 64 }).notNull(),
    courierId: uuid("courier_id").notNull().references(() => couriers.id, { onDelete: "cascade" }),
    serviceProvider: varchar("service_provider", { length: 64 }),
    awbCharges: numeric("awb_charges", { precision: 12, scale: 2 }),
    minimumChargeableWeight: numeric("minimum_chargeable_weight", { precision: 12, scale: 2 }),
    minimumChargeableAmount: numeric("minimum_chargeable_amount", { precision: 12, scale: 2 }),
    codChargesFlat: numeric("cod_charges_flat", { precision: 12, scale: 2 }),
    codPercent: numeric("cod_percent", { precision: 6, scale: 2 }),
    fuelSurchargePercent: numeric("fuel_surcharge_percent", { precision: 6, scale: 2 }),
    greenTax: numeric("green_tax", { precision: 12, scale: 2 }),
    odaCharges: numeric("oda_charges", { precision: 12, scale: 2 }),
    handlingCharges: jsonb("handling_charges").$type<Array<{ min: number; max: number; charge: number }>>(),
    rovPercent: numeric("rov_percent", { precision: 6, scale: 2 }),
    extras: jsonb("extras"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    planCourierUq: uniqueIndex("b2b_charges_plan_courier_uq").on(t.plan, t.courierId),
  }),
);

/* ───────────────────────── Notifications ──────────────────────── */

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    event: varchar("event", { length: 64 }).notNull(),
    title: text("title"),
    body: text("body"),
    data: jsonb("data"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index("notifications_user_created_idx").on(t.userId, t.createdAt),
  }),
);

export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  prefs: jsonb("prefs").$type<Record<string, { email?: boolean; push?: boolean; sms?: boolean }>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ userUq: uniqueIndex("notification_prefs_user_uq").on(t.userId) }));

/* ───────────────────────── Export Jobs ────────────────────────── */

/**
 * Background CSV/report exports. A request only ever *queues* a row here; a
 * worker fills the file in and flips the status, so a 100k-row export never
 * has to finish inside an HTTP request.
 */
export const exportJobs = pgTable(
  "export_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** What is being exported — "orders" today, room for reports later. */
    entity: varchar("entity", { length: 32 }).notNull().default("orders"),
    /** Admin (or staff) who asked for it. */
    requestedBy: uuid("requested_by").references(() => users.id, { onDelete: "set null" }),
    /** The exact filter set the export was built from — also used to re-run. */
    filters: jsonb("filters").$type<Record<string, unknown>>(),
    /** queued | processing | completed | failed | expired */
    status: varchar("status", { length: 16 }).notNull().default("queued"),
    totalRows: integer("total_rows").notNull().default(0),
    processedRows: integer("processed_rows").notNull().default(0),
    /** Storage key ("s3:<key>" or "local:<abs path>") — null until completed. */
    fileKey: text("file_key"),
    fileName: text("file_name"),
    fileSize: integer("file_size"),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    /** After this the file is purged and the row goes to "expired". */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    entityCreatedIdx: index("export_jobs_entity_created_idx").on(t.entity, t.createdAt),
    statusIdx: index("export_jobs_status_idx").on(t.status),
  }),
);

/* ─────────────────────── Support Tickets ──────────────────────── */

export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  category: varchar("category", { length: 64 }),
  priority: varchar("priority", { length: 16 }).notNull().default("normal"),
  status: varchar("status", { length: 32 }).notNull().default("open"),
  messages: jsonb("messages"),
  metadata: jsonb("metadata"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ───────────────────────────── Blogs ──────────────────────────── */

export const blogs = pgTable(
  "blogs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 256 }).notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull(),
    content: text("content").notNull(),
    category: varchar("category", { length: 64 }).notNull(),
    author: text("author").notNull(),
    readTime: text("read_time").notNull().default("5 min read"),
    coverImageKey: text("cover_image_key"),
    accentColor: varchar("accent_color", { length: 7 }),
    status: varchar("status", { length: 16 }).notNull().default("draft"),
    isFeatured: boolean("is_featured").notNull().default(false),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugUq: uniqueIndex("blogs_slug_uq").on(t.slug),
    statusPublishedIdx: index("blogs_status_published_idx").on(t.status, t.publishedAt),
    categoryPublishedIdx: index("blogs_category_published_idx").on(t.category, t.publishedAt),
    featuredPublishedIdx: index("blogs_featured_published_idx").on(t.isFeatured, t.publishedAt),
  }),
);

/* ─────────────────────────── Relations ─────────────────────────── */
/* Defined here so `db.query.X.findFirst({ with: { ... } })` works for
   every populate-style join the old Mongoose code did. */

export const usersRelations = relations(users, ({ many, one }) => ({
  pickupAddresses: many(pickupAddresses),
  orders: many(orders),
  wallet: one(wallets, { fields: [users.id], references: [wallets.userId] }),
  kyc: one(kycDocuments, { fields: [users.id], references: [kycDocuments.userId] }),
  labelSettings: one(labelSettings, { fields: [users.id], references: [labelSettings.userId] }),
  bankAccounts: many(bankAccounts),
  billingPreference: one(billingPreferences, { fields: [users.id], references: [billingPreferences.userId] }),
  billingInvoices: many(billingInvoices),
  notifications: many(notifications),
  notificationPreference: one(notificationPreferences, { fields: [users.id], references: [notificationPreferences.userId] }),
  supportTickets: many(supportTickets),
  webhooks: many(webhooks),
  codRemittances: many(codRemittances),
  blogs: many(blogs),
}));

export const pickupAddressesRelations = relations(pickupAddresses, ({ one }) => ({
  user: one(users, { fields: [pickupAddresses.userId], references: [users.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  courier: one(couriers, { fields: [orders.courierId], references: [couriers.id] }),
  pickupAddress: one(pickupAddresses, { fields: [orders.pickupAddressId], references: [pickupAddresses.id] }),
  trackingEvents: many(trackingEvents),
  ndrEvents: many(ndrEvents),
  rtoEvents: many(rtoEvents),
}));

export const couriersRelations = relations(couriers, ({ many }) => ({
  b2cPricing: many(b2cPricing),
  b2bPincodes: many(b2bPincodes),
  b2bZoneRates: many(b2bZoneRates),
  b2bAdditionalCharges: many(b2bAdditionalCharges),
  orders: many(orders),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, { fields: [wallets.userId], references: [users.id] }),
  transactions: many(walletTransactions),
}));

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  wallet: one(wallets, { fields: [walletTransactions.walletId], references: [wallets.id] }),
}));

export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  user: one(users, { fields: [webhooks.userId], references: [users.id] }),
  deliveries: many(webhookDeliveries),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  webhook: one(webhooks, { fields: [webhookDeliveries.webhookId], references: [webhooks.id] }),
  user: one(users, { fields: [webhookDeliveries.userId], references: [users.id] }),
}));

export const kycDocumentsRelations = relations(kycDocuments, ({ one }) => ({
  user: one(users, { fields: [kycDocuments.userId], references: [users.id] }),
}));

export const labelSettingsRelations = relations(labelSettings, ({ one }) => ({
  user: one(users, { fields: [labelSettings.userId], references: [users.id] }),
}));

export const bankAccountsRelations = relations(bankAccounts, ({ one }) => ({
  user: one(users, { fields: [bankAccounts.userId], references: [users.id] }),
}));

export const codRemittancesRelations = relations(codRemittances, ({ one }) => ({
  user: one(users, { fields: [codRemittances.userId], references: [users.id] }),
  order: one(orders, { fields: [codRemittances.orderId], references: [orders.id] }),
  walletTransaction: one(walletTransactions, { fields: [codRemittances.walletTransactionId], references: [walletTransactions.id] }),
}));

export const billingInvoicesRelations = relations(billingInvoices, ({ one }) => ({
  user: one(users, { fields: [billingInvoices.userId], references: [users.id] }),
}));

export const billingPreferencesRelations = relations(billingPreferences, ({ one }) => ({
  user: one(users, { fields: [billingPreferences.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, { fields: [notificationPreferences.userId], references: [users.id] }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one }) => ({
  user: one(users, { fields: [supportTickets.userId], references: [users.id] }),
}));

export const trackingEventsRelations = relations(trackingEvents, ({ one }) => ({
  order: one(orders, { fields: [trackingEvents.orderId], references: [orders.id] }),
  user: one(users, { fields: [trackingEvents.userId], references: [users.id] }),
}));

export const ndrEventsRelations = relations(ndrEvents, ({ one }) => ({
  order: one(orders, { fields: [ndrEvents.orderId], references: [orders.id] }),
  user: one(users, { fields: [ndrEvents.userId], references: [users.id] }),
}));

export const rtoEventsRelations = relations(rtoEvents, ({ one }) => ({
  order: one(orders, { fields: [rtoEvents.orderId], references: [orders.id] }),
  user: one(users, { fields: [rtoEvents.userId], references: [users.id] }),
}));

export const blogsRelations = relations(blogs, ({ one }) => ({
  creator: one(users, { fields: [blogs.createdBy], references: [users.id] }),
}));

export const b2cPricingRelations = relations(b2cPricing, ({ one }) => ({
  courier: one(couriers, { fields: [b2cPricing.courierId], references: [couriers.id] }),
}));

export const b2bZonesRelations = relations(b2bZones, ({ many }) => ({
  pincodes: many(b2bPincodes),
  originRates: many(b2bZoneRates, { relationName: "originZone" }),
  destinationRates: many(b2bZoneRates, { relationName: "destinationZone" }),
}));

export const b2bPincodesRelations = relations(b2bPincodes, ({ one }) => ({
  zone: one(b2bZones, { fields: [b2bPincodes.zoneId], references: [b2bZones.id] }),
  courier: one(couriers, { fields: [b2bPincodes.courierId], references: [couriers.id] }),
}));

export const b2bZoneRatesRelations = relations(b2bZoneRates, ({ one }) => ({
  originZone: one(b2bZones, { fields: [b2bZoneRates.originZoneId], references: [b2bZones.id], relationName: "originZone" }),
  destinationZone: one(b2bZones, { fields: [b2bZoneRates.destinationZoneId], references: [b2bZones.id], relationName: "destinationZone" }),
  courier: one(couriers, { fields: [b2bZoneRates.courierId], references: [couriers.id] }),
}));

export const b2bAdditionalChargesRelations = relations(b2bAdditionalCharges, ({ one }) => ({
  courier: one(couriers, { fields: [b2bAdditionalCharges.courierId], references: [couriers.id] }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
  actor: one(users, { fields: [refreshTokens.actorId], references: [users.id] }),
}));
