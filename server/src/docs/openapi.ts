import {
  WEBHOOK_API_VERSION,
  WEBHOOK_EVENT_CATALOGUE,
  sampleOrderEventData,
} from "../services/webhookEvents.js";

/**
 * OpenAPI 3.1 description of the public Searchcraft API.
 *
 * This object is the ONLY source of truth for the published docs: the HTML
 * page at /api/docs and the machine-readable spec at /api/docs/openapi.json are
 * both rendered from it, so they can never disagree.
 *
 * Every operation here mirrors a route that actually exists in src/routes.
 * Request and response `example` blocks are written out in full rather than
 * inferred from schemas — what a reader copies is what the server accepts.
 */

const SITE_URL = (process.env.PUBLIC_SITE_URL || "https://searchcraftdigital.com").replace(/\/+$/, "");
const API_URL = (process.env.PUBLIC_API_URL || `${SITE_URL}/api`).replace(/\/+$/, "");
const LOCAL_API_URL = `http://localhost:${process.env.PORT ?? 3001}/api`;

/* ────────────────────────────── Examples ───────────────────────────────── */

const ORDER_EXAMPLE = {
  _id: "6f1c6b6c-3a1e-4d9a-9d0b-6b2b2f9a41c7",
  id: "6f1c6b6c-3a1e-4d9a-9d0b-6b2b2f9a41c7",
  orderId: "ORD-10021",
  orderType: "b2c",
  status: "booked",
  awb: "3419810012345",
  serviceProvider: "delhivery",
  courierId: "0f2f9a0d-1f8b-4a63-9a86-9a2f37c0a111",
  pickupAddressId: "b0b0d5a1-7c9e-4a2f-9d4b-2c1a5f6e8d90",
  paymentType: "cod",
  orderAmount: 1499,
  codAmount: 1499,
  weight: 850,
  length: 20,
  breadth: 15,
  height: 10,
  chargeableWeight: 900,
  products: [{ name: "Cotton Kurta", unitPrice: 1499, quantity: 1, hsn: "6206", taxRate: 5 }],
  deliveryAddress: {
    contactName: "Rahul Verma",
    phone: "9876543210",
    email: "rahul@example.com",
    addressLine1: "42 Malviya Nagar",
    addressLine2: "Near Jain Mandir",
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    pincode: "302017",
  },
  rate: {
    forward: 62,
    rto: 55,
    codCharges: 35,
    otherCharges: 0,
    freightCharge: 62,
    totalCharge: 97,
    zone: "B",
  },
  orderDate: "2026-08-25",
  preferredPickupDate: "2026-08-26",
  preferredPickupTime: "16:00",
  labelUrl: null,
  createdAt: "2026-08-25T10:41:55.000Z",
  updatedAt: "2026-08-25T10:41:56.000Z",
};

const CREATE_ORDER_EXAMPLE = {
  orderId: "ORD-10021",
  orderDate: "2026-08-25",
  orderType: "B2C",
  paymentType: "cod",
  buyerName: "Rahul Verma",
  buyerPhone: "9876543210",
  buyerEmail: "rahul@example.com",
  address: "42 Malviya Nagar",
  address2: "Near Jain Mandir",
  city: "Jaipur",
  state: "Rajasthan",
  pincode: "302017",
  weight: 850,
  length: 20,
  breadth: 15,
  height: 10,
  chargeableWeight: 900,
  products: [{ name: "Cotton Kurta", unitPrice: 1499, quantity: 1, hsn: "6206", taxRate: 5 }],
  orderAmount: 1499,
  codAmount: 1499,
  courierId: "0f2f9a0d-1f8b-4a63-9a86-9a2f37c0a111",
  pickupAddressId: "b0b0d5a1-7c9e-4a2f-9d4b-2c1a5f6e8d90",
  preferredPickupDate: "2026-08-26",
  preferredPickupTime: "16:00",
  rate: {
    forward: 62,
    rto: 55,
    codCharges: 35,
    otherCharges: 0,
    freightCharge: 62,
    totalCharge: 97,
    zone: "B",
  },
};

const PICKUP_ADDRESS_EXAMPLE = {
  id: "b0b0d5a1-7c9e-4a2f-9d4b-2c1a5f6e8d90",
  nickname: "Jaipur Warehouse",
  contactName: "Aman Sharma",
  phone: "9876500011",
  email: "warehouse@yourbrand.in",
  role: "warehouse_manager",
  addressLine1: "Plot 14, Sitapura Industrial Area",
  addressLine2: "Phase III",
  landmark: "Opposite HDFC Bank",
  city: "Jaipur",
  state: "Rajasthan",
  country: "India",
  pincode: "302022",
  gstNumber: "08AABCU9603R1ZM",
  isPrimary: true,
  isSameAsRto: true,
  rtoAddress: null,
  createdAt: "2026-07-02T06:11:00.000Z",
};

const COURIER_EXAMPLE = {
  id: "0f2f9a0d-1f8b-4a63-9a86-9a2f37c0a111",
  name: "Delhivery Surface",
  serviceProvider: "delhivery",
  courierType: "surface",
  businessType: ["B2C"],
  logo: "https://cdn.searchcraftdigital.com/couriers/delhivery.png",
};

const AVAILABLE_COURIER_EXAMPLE = {
  courierId: "0f2f9a0d-1f8b-4a63-9a86-9a2f37c0a111",
  name: "Delhivery Surface",
  serviceProviderId: "3f9a2b21-0f7e-4c1a-9d31-88ef1c0a2233",
  serviceProvider: "delhivery",
  serviceProviderDisplayName: "Delhivery-1",
  logo: "https://cdn.searchcraftdigital.com/couriers/delhivery.png",
  mode: "surface",
  zone: { code: "B", name: "Within State" },
  chargeableWeight: 900,
  minWeight: 500,
  rate: {
    forward: 62,
    rto: 55,
    codCharges: 35,
    otherCharges: 0,
    freightCharge: 62,
    totalCharge: 97,
  },
  tag: "economy",
};

const WEBHOOK_EXAMPLE = {
  id: "9c3a5f60-1d2e-4b8a-8f77-2a4b6c8d0e12",
  url: "https://yourbrand.in/hooks/searchcraft",
  isActive: true,
  description: "Production order feed",
  secret: "whsec_••••••••1f2a",
  createdAt: "2026-08-20T08:00:00.000Z",
  updatedAt: "2026-08-20T08:00:00.000Z",
};

const DELIVERY_EXAMPLE = {
  id: "1a5f7d90-77c4-4a01-9b2e-3d1f0a7c5b44",
  webhookId: "9c3a5f60-1d2e-4b8a-8f77-2a4b6c8d0e12",
  event: "order.delivered",
  url: "https://yourbrand.in/hooks/searchcraft",
  status: "success",
  attempts: 1,
  responseStatus: 200,
  responseBody: "{\"ok\":true}",
  error: null,
  nextRetryAt: null,
  createdAt: "2026-08-26T09:20:11.000Z",
  updatedAt: "2026-08-26T09:20:12.000Z",
};

const WEBHOOK_ENVELOPE_EXAMPLE = {
  id: "evt_1f4b2d8c-6d0a-4e2b-9a17-33c9f4a10b55",
  event: "order.out_for_delivery",
  api_version: WEBHOOK_API_VERSION,
  created_at: "2026-08-26T09:14:33.120Z",
  data: sampleOrderEventData(),
};

/* ─────────────────────────── Shared responses ──────────────────────────── */

const jsonContent = (example: unknown, schemaRef?: string) => ({
  "application/json": {
    ...(schemaRef ? { schema: { $ref: `#/components/schemas/${schemaRef}` } } : {}),
    example,
  },
});

const RESPONSE_401 = {
  description: "Missing, malformed or expired access token.",
  content: jsonContent({ error: "Authentication required" }),
};

const RESPONSE_400 = {
  description:
    "Validation failed. Field-level errors come back in `errors[]` exactly as express-validator reports them.",
  content: jsonContent({
    errors: [{ type: "field", value: "30201", msg: "Valid 6-digit pincode required", path: "pincode", location: "body" }],
  }),
};

const RESPONSE_404 = (what: string) => ({
  description: `${what} not found, or it belongs to another account.`,
  content: jsonContent({ success: false, error: `${what} not found` }),
});

const bearer = [{ bearerAuth: [] }];

const pathParam = (name: string, description: string) => ({
  name,
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
  description,
});

const queryParam = (
  name: string,
  description: string,
  schema: Record<string, unknown> = { type: "string" },
) => ({ name, in: "query", required: false, schema, description });

/* ──────────────────────────── The document ─────────────────────────────── */

export function buildOpenApiDocument(): Record<string, unknown> {
  return {
    openapi: "3.1.0",
    info: {
      title: "Searchcraft Shipping API",
      version: "1.0.0",
      summary: "Book, track and manage shipments across every courier Searchcraft aggregates.",
      description: [
        "The Searchcraft API lets you book shipments across every courier we aggregate, download labels,",
        "track parcels and receive real-time status webhooks — from your own storefront, ERP or WMS.",
        "",
        "**Base URL**",
        "",
        "```",
        `${API_URL}`,
        "```",
        "",
        "Every request and response is JSON (`Content-Type: application/json`), every timestamp is",
        "ISO-8601 in UTC, every monetary amount is in Indian rupees, and every weight is in **grams**",
        "unless a field name says otherwise. Dimensions are in centimetres.",
        "",
        "**Getting started**",
        "",
        "1. `POST /auth/login` with your panel email and password to get an access token.",
        "2. `POST /pickup-addresses` to register the warehouse you ship from (once).",
        "3. `GET /couriers` for the courier catalogue, or `POST /rates/available` to see which of them serve a specific lane.",
        "4. `POST /orders` with the `courierId` you picked — the AWB comes back on the response.",
        "5. Turn on webhooks once in the panel (**Settings → Webhooks**) and every order status change is pushed to your URL — see *Webhook events* below.",
      ].join("\n"),
      contact: {
        name: "Searchcraft Integrations",
        url: `${SITE_URL}`,
        email: "support@searchcraftdigital.com",
      },
    },
    servers: [
      { url: API_URL, description: "Production" },
      { url: LOCAL_API_URL, description: "Local development" },
    ],
    tags: [
      {
        name: "Authentication",
        description:
          "One call: log in with your panel email and password, then send the token as `Authorization: Bearer <accessToken>` on every request. Tokens are short-lived, so log in again when one expires.",
      },
      {
        name: "Pickup Addresses",
        description:
          "The warehouses you ship from. A pickup address must exist before an order can reference it, and its `id` is what you send as `pickupAddressId`. Marking one primary makes it the default in the panel.",
      },
      {
        name: "Couriers",
        description:
          "`GET /couriers` is the full catalogue you can book with. `POST /rates/available` narrows that to the couriers that actually serve a given lane, and returns the priced `rate` object you send back when creating the order.",
      },
      {
        name: "Orders",
        description:
          "Booking and managing shipments. Creating an order books it with the courier and returns the AWB in the same response — there is no separate 'confirm' step.",
      },
      {
        name: "Tracking",
        description:
          "Scan history for a shipment. `GET /track` needs no authentication and is safe to expose to your buyers; the authenticated endpoint returns the full internal timeline.",
      },
      {
        name: "NDR & RTO",
        description:
          "Failed deliveries and returns. NDR orders are awaiting your instruction; RTO orders are already heading back to the pickup address.",
      },
      {
        name: "Webhooks",
        description:
          "Register callback URLs, send test events, inspect delivery logs and replay failed deliveries. Every active endpoint receives the full order lifecycle.",
      },
    ],
    security: bearer,

    paths: {
      /* ───────────────────────── Authentication ───────────────────────── */
      "/auth/login": {
        post: {
          tags: ["Authentication"],
          summary: "Log in with password",
          operationId: "login",
          security: [],
          description:
            "Returns an access token plus the account profile, and sets the refresh token as an httpOnly cookie. Rate limited to 10 attempts per 15 minutes per IP.",
          requestBody: {
            required: true,
            content: jsonContent({ identifier: "seller@yourbrand.in", password: "••••••••" }),
          },
          responses: {
            200: {
              description: "Authenticated.",
              content: jsonContent({
                user: {
                  id: "5a3f1c22-9b0e-4d77-8c31-1f2a3b4c5d6e",
                  name: "Your Brand Pvt Ltd",
                  email: "seller@yourbrand.in",
                  phone: "9876500011",
                  role: "user",
                  plan: "basic",
                  hasPassword: true,
                },
                accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
              }),
            },
            400: RESPONSE_400,
            401: {
              description: "Wrong identifier or password.",
              content: jsonContent({ error: "Invalid credentials" }),
            },
            429: {
              description: "Too many login attempts — try again after the window resets.",
              content: jsonContent({ error: "Too many login attempts, please try again later" }),
            },
          },
        },
      },
      /* ───────────────────────── Pickup addresses ─────────────────────── */
      "/pickup-addresses": {
        get: {
          tags: ["Pickup Addresses"],
          summary: "List pickup addresses",
          operationId: "listPickupAddresses",
          security: bearer,
          responses: {
            200: { description: "Every pickup address on the account.", content: jsonContent({ addresses: [PICKUP_ADDRESS_EXAMPLE] }) },
            401: RESPONSE_401,
          },
        },
        post: {
          tags: ["Pickup Addresses"],
          summary: "Create a pickup address",
          operationId: "createPickupAddress",
          security: bearer,
          description: [
            "Register the warehouse a shipment is collected from.",
            "",
            "Set `isSameAsRto: true` when undelivered parcels come back to this same address — that is the",
            "common case. Set it to `false` and supply a full `rtoAddress` object to route returns elsewhere.",
            "The first address you create is automatically the primary one.",
          ].join("\n"),
          requestBody: {
            required: true,
            content: jsonContent({
              nickname: "Jaipur Warehouse",
              contactName: "Aman Sharma",
              phone: "9876500011",
              email: "warehouse@yourbrand.in",
              role: "warehouse_manager",
              addressLine1: "Plot 14, Sitapura Industrial Area",
              addressLine2: "Phase III",
              landmark: "Opposite HDFC Bank",
              city: "Jaipur",
              state: "Rajasthan",
              country: "India",
              pincode: "302022",
              gstNumber: "08AABCU9603R1ZM",
              isSameAsRto: true,
            }),
          },
          responses: {
            201: { description: "Address created.", content: jsonContent({ message: "Address created", address: PICKUP_ADDRESS_EXAMPLE }) },
            400: RESPONSE_400,
            401: RESPONSE_401,
          },
        },
      },
      "/pickup-addresses/{id}": {
        get: {
          tags: ["Pickup Addresses"],
          summary: "Get a pickup address",
          operationId: "getPickupAddress",
          security: bearer,
          parameters: [pathParam("id", "Pickup address ID.")],
          responses: {
            200: { description: "The address.", content: jsonContent({ address: PICKUP_ADDRESS_EXAMPLE }) },
            401: RESPONSE_401,
            404: RESPONSE_404("Address"),
          },
        },
        put: {
          tags: ["Pickup Addresses"],
          summary: "Update a pickup address",
          operationId: "updatePickupAddress",
          security: bearer,
          description: "Partial update — send only the fields you want to change.",
          parameters: [pathParam("id", "Pickup address ID.")],
          requestBody: { required: true, content: jsonContent({ contactName: "Aman Sharma", phone: "9876500022" }) },
          responses: {
            200: { description: "Address updated.", content: jsonContent({ message: "Address updated", address: PICKUP_ADDRESS_EXAMPLE }) },
            400: RESPONSE_400,
            401: RESPONSE_401,
            404: RESPONSE_404("Address"),
          },
        },
        delete: {
          tags: ["Pickup Addresses"],
          summary: "Delete a pickup address",
          operationId: "deletePickupAddress",
          security: bearer,
          parameters: [pathParam("id", "Pickup address ID.")],
          responses: {
            200: { description: "Address deleted.", content: jsonContent({ message: "Address deleted" }) },
            401: RESPONSE_401,
            404: RESPONSE_404("Address"),
          },
        },
      },
      "/pickup-addresses/{id}/primary": {
        patch: {
          tags: ["Pickup Addresses"],
          summary: "Make an address primary",
          operationId: "setPrimaryPickupAddress",
          security: bearer,
          description: "The previous primary address is demoted in the same operation.",
          parameters: [pathParam("id", "Pickup address ID.")],
          responses: {
            200: { description: "Primary address changed.", content: jsonContent({ message: "Primary address updated", address: { ...PICKUP_ADDRESS_EXAMPLE, isPrimary: true } }) },
            401: RESPONSE_401,
            404: RESPONSE_404("Address"),
          },
        },
      },

      /* ─────────────────────── Couriers & rates ───────────────────────── */
      "/couriers": {
        get: {
          tags: ["Couriers"],
          summary: "List couriers",
          operationId: "listCouriers",
          security: bearer,
          description: [
            "Every courier enabled on the platform, with the `id` you pass to `POST /orders` as `courierId`.",
            "",
            "This is the plain catalogue — it does not tell you whether a courier serves a particular",
            "origin-destination pair. Use `POST /rates/available` for that.",
          ].join("\n"),
          responses: {
            200: { description: "The courier catalogue.", content: jsonContent({ success: true, couriers: [COURIER_EXAMPLE] }) },
            401: RESPONSE_401,
          },
        },
      },
      "/rates/available": {
        post: {
          tags: ["Couriers"],
          summary: "Couriers that serve a lane",
          operationId: "getAvailableCouriers",
          security: bearer,
          description: [
            "Narrows the catalogue to the couriers that actually serve `origin → destination` for this shipment.",
            "There is no separate serviceability endpoint — an empty `data` array means nobody serves the lane.",
            "",
            "Take the `courierId` and the whole `rate` object from the option you want and send them straight",
            "into `POST /orders`. `rate` is required there, and this is where it comes from.",
            "",
            "Prices are quoted against the **chargeable weight** — the greater of the actual weight and the",
            "volumetric weight computed from the dimensions you send, so always send dimensions if you have them.",
          ].join("\n"),
          requestBody: {
            required: true,
            content: jsonContent({
              origin: "302022",
              destination: "302017",
              weight: 850,
              length: 20,
              breadth: 15,
              height: 10,
              paymentType: "cod",
              orderAmount: 1499,
              orderType: "B2C",
            }),
          },
          responses: {
            200: {
              description: "Couriers that serve this lane, cheapest and fastest tagged. Empty when none do.",
              content: jsonContent({ success: true, data: [AVAILABLE_COURIER_EXAMPLE] }),
            },
            400: RESPONSE_400,
            401: RESPONSE_401,
          },
        },
      },
      /* ────────────────────────────── Orders ──────────────────────────── */
      "/external/orders/import": {
        post: {
          tags: ["Orders"],
          summary: "Import a store order as a draft",
          operationId: "importExternalStoreOrder",
          security: bearer,
          description: [
            "Use this for ecommerce stores that should sync customer orders into the seller panel without booking a courier immediately.",
            "",
            "Production URL: `POST https://api.searchcraftdigital.com/api/external/orders/import`.",
            "The shorter `https://api.searchcraftdigital.com/external/orders/import` URL is supported only as a compatibility alias; use the `/api` URL for new integrations.",
            "",
            "The order is stored as `status: \"draft\"`, no wallet debit happens, and no courier API is called.",
            "The seller later opens the draft in the panel, chooses pickup/courier, and books it through the normal flow.",
            "When the order is booked, webhooks include `data.external_order_id` so your store can attach the AWB and tracking updates to its own order.",
            "",
            "`externalOrderId` is idempotent per seller. Retrying the same value returns the existing draft/order instead of creating a duplicate.",
          ].join("\n"),
          requestBody: {
            required: true,
            content: jsonContent({
              externalOrderId: "STORE-10045",
              orderDate: "2026-09-22",
              paymentMode: "cod",
              orderAmount: 1299,
              codAmount: 1299,
              customer: { name: "Rahul Sharma", phone: "9876543210", email: "rahul@example.com" },
              deliveryAddress: {
                addressLine1: "House 12, Street 5",
                addressLine2: "Near Metro",
                city: "Delhi",
                state: "Delhi",
                pincode: "110012",
                country: "India",
              },
              items: [{ name: "T-shirt", sku: "TSHIRT-BLACK-M", quantity: 1, price: 1299 }],
              package: { weight: 500, length: 10, breadth: 10, height: 10 },
            }),
          },
          responses: {
            201: { description: "Draft imported.", content: jsonContent({ success: true, imported: true, order: { ...ORDER_EXAMPLE, status: "draft", awb: null, externalOrderId: "STORE-10045", source: "external_store" } }) },
            200: { description: "Duplicate retry. Existing order returned.", content: jsonContent({ success: true, imported: false, duplicate: true, order: { ...ORDER_EXAMPLE, status: "draft", awb: null, externalOrderId: "STORE-10045" } }) },
            400: RESPONSE_400,
            401: RESPONSE_401,
          },
        },
      },
      "/orders": {
        post: {
          tags: ["Orders"],
          summary: "Create and book an order",
          operationId: "createOrder",
          security: bearer,
          description: [
            "Creates the order **and books it with the courier in one call** — the response already carries the AWB.",
            "",
            "Before calling this you need a `pickupAddressId` (from `POST /pickup-addresses`) and a `courierId`",
            "plus its `rate` object (from `POST /rates/available`). Send the rate back unchanged: it is the quote",
            "you are charged against, and your wallet is debited for `rate.totalCharge` as part of this request.",
            "",
            "`orderId` is **your** reference and must be unique within your account — reusing one is rejected.",
            "It is what comes back as `data.order_id` on every webhook.",
            "",
            "For `orderType: \"B2B\"`, `packages[]` and `invoices[]` replace the flat weight/dimension fields and",
            "`companyName` becomes required.",
            "",
            "KYC must be approved on the account before any order can be booked.",
          ].join("\n"),
          requestBody: { required: true, content: jsonContent(CREATE_ORDER_EXAMPLE) },
          responses: {
            201: { description: "Order booked. `order.awb` is the courier tracking number.", content: jsonContent({ success: true, order: ORDER_EXAMPLE }) },
            400: RESPONSE_400,
            401: RESPONSE_401,
            402: {
              description: "Wallet balance is below the shipment's `rate.totalCharge`.",
              content: jsonContent({ error: "Insufficient wallet balance. Required ₹97.00, available ₹12.50" }),
            },
            403: { description: "KYC is not approved on this account.", content: jsonContent({ error: "KYC verification is pending" }) },
            409: { description: "`orderId` already exists on this account.", content: jsonContent({ error: "An order with this Order ID already exists" }) },
            502: { description: "The courier rejected the booking. Nothing is charged and no order is stored.", content: jsonContent({ error: "Delhivery booking failed: pincode not serviceable for COD" }) },
          },
        },
        get: {
          tags: ["Orders"],
          summary: "List orders",
          operationId: "listOrders",
          security: bearer,
          description: "Newest first by default. `stats` counts every status across the same filters minus `status` and `search`, so it stays stable while you page.",
          parameters: [
            queryParam("page", "1-based page number. Default 1.", { type: "integer", minimum: 1, default: 1 }),
            queryParam("limit", "Rows per page, 1–500. Default 20.", { type: "integer", minimum: 1, maximum: 500, default: 20 }),
            queryParam("status", "Filter by order status.", { type: "string", enum: ["draft", "created", "processing", "booked", "pickup_initiated", "shipped", "in_transit", "out_for_delivery", "delivered", "ndr", "rto_initiated", "rto_in_transit", "rto_delivered", "cancelled", "lost"] }),
            queryParam("orderType", "`B2B` or `B2C`.", { type: "string", enum: ["B2B", "B2C"] }),
            queryParam("paymentType", "`prepaid` or `cod`.", { type: "string", enum: ["prepaid", "cod"] }),
            queryParam("courierId", "Only orders shipped with this courier."),
            queryParam("pickupAddressId", "Only orders picked up from this address."),
            queryParam("search", "Matches order ID, AWB, buyer name, city, email or phone."),
            queryParam("startDate", "Inclusive lower bound on creation date (`YYYY-MM-DD`, IST).", { type: "string", format: "date" }),
            queryParam("endDate", "Inclusive upper bound on creation date (`YYYY-MM-DD`, IST).", { type: "string", format: "date" }),
            queryParam("sortBy", "`createdAt`, `status`, `orderAmount` or `rate.totalCharge`."),
            queryParam("sortOrder", "`asc` or `desc`. Default `desc`.", { type: "string", enum: ["asc", "desc"] }),
          ],
          responses: {
            200: {
              description: "A page of orders.",
              content: jsonContent({
                success: true,
                orders: [{ ...ORDER_EXAMPLE, courierName: "Delhivery Surface" }],
                pagination: { page: 1, limit: 20, total: 137, totalPages: 7 },
                stats: { total: 137, draft: 3, booked: 12, in_transit: 40, delivered: 71, ndr: 6, cancelled: 8, totalRevenue: 13291.5 },
              }),
            },
            401: RESPONSE_401,
          },
        },
      },
      "/orders/{id}": {
        get: {
          tags: ["Orders"],
          summary: "Get an order",
          operationId: "getOrder",
          security: bearer,
          description: "`id` is the Searchcraft shipment UUID (`order.id`), not your own `orderId`.",
          parameters: [pathParam("id", "Searchcraft shipment UUID.")],
          responses: {
            200: { description: "The order.", content: jsonContent({ success: true, order: ORDER_EXAMPLE }) },
            401: RESPONSE_401,
            404: RESPONSE_404("Order"),
          },
        },
      },
      "/orders/manifest-orders": {
        post: {
          tags: ["Orders"],
          summary: "Manifest orders and raise a pickup",
          operationId: "manifestOrders",
          security: bearer,
          description: [
            "Generates the manifest and asks the courier to collect. Orders move to `pickup_initiated` and an",
            "`order.pickup_initiated` webhook fires for each one.",
            "",
            "An order that the courier refuses a pickup for is reported in `errors[]` and keeps its previous status.",
            "`warnings[]` covers orders the courier folded into a pickup that already existed for that warehouse and",
            "date — the van is coming, but no fresh pickup was raised for those AWBs.",
          ].join("\n"),
          requestBody: { required: true, content: jsonContent({ orderIds: ["6f1c6b6c-3a1e-4d9a-9d0b-6b2b2f9a41c7"] }) },
          responses: {
            200: {
              description: "Manifest result.",
              content: jsonContent({
                manifestUrl: "https://cdn.searchcraftdigital.com/manifests/2026-08-26-delhivery.pdf",
                ordersProcessed: 1,
                errors: [],
                warnings: [],
              }),
            },
            400: RESPONSE_400,
            401: RESPONSE_401,
            404: RESPONSE_404("Orders"),
          },
        },
      },
      "/orders/{id}/cancel": {
        post: {
          tags: ["Orders"],
          summary: "Cancel an order",
          operationId: "cancelOrder",
          security: bearer,
          description: [
            "Cancels with the courier and refunds the freight to your wallet when the courier accepts.",
            "",
            "`cancelled` is terminal: later courier scans for the same AWB are recorded on the timeline but never",
            "move the order back out of it.",
          ].join("\n"),
          parameters: [pathParam("id", "Searchcraft shipment UUID.")],
          requestBody: { required: false, content: jsonContent({ reason: "Buyer cancelled on the storefront" }) },
          responses: {
            200: { description: "Cancelled.", content: jsonContent({ message: "Order cancelled", order: { ...ORDER_EXAMPLE, status: "cancelled" } }) },
            400: { description: "The shipment is too far along to cancel.", content: jsonContent({ error: "Cannot cancel an order that is already delivered" }) },
            401: RESPONSE_401,
            404: RESPONSE_404("Order"),
          },
        },
      },
      "/orders/{id}/label": {
        get: {
          tags: ["Orders"],
          summary: "Download the shipping label",
          operationId: "getOrderLabel",
          security: bearer,
          description: "Returns the label PDF itself, not JSON. Add `?force=1` to bypass the cached copy and regenerate.",
          parameters: [
            pathParam("id", "Searchcraft shipment UUID."),
            queryParam("force", "Set to `1` to regenerate instead of serving the cached label.", { type: "string", enum: ["1"] }),
          ],
          responses: {
            200: { description: "The label PDF.", content: { "application/pdf": { schema: { type: "string", format: "binary" } } } },
            401: RESPONSE_401,
            404: RESPONSE_404("Order"),
          },
        },
      },
      "/orders/{id}/invoice": {
        get: {
          tags: ["Orders"],
          summary: "Download the shipment invoice",
          operationId: "getOrderInvoice",
          security: bearer,
          parameters: [pathParam("id", "Searchcraft shipment UUID.")],
          responses: {
            200: { description: "The invoice PDF.", content: { "application/pdf": { schema: { type: "string", format: "binary" } } } },
            401: RESPONSE_401,
            404: RESPONSE_404("Order"),
          },
        },
      },

      /* ───────────────────────────── Tracking ─────────────────────────── */
      "/orders/{id}/tracking": {
        get: {
          tags: ["Tracking"],
          summary: "Full scan history",
          operationId: "getOrderTracking",
          security: bearer,
          description: "Every scan recorded for the shipment, newest first — courier pushes and our own polling both land here.",
          parameters: [pathParam("id", "Searchcraft shipment UUID.")],
          responses: {
            200: {
              description: "Tracking events, newest first.",
              content: jsonContent([
                {
                  id: "c1e2a3b4-5d6f-4708-9a1b-2c3d4e5f6071",
                  orderId: "6f1c6b6c-3a1e-4d9a-9d0b-6b2b2f9a41c7",
                  awb: "3419810012345",
                  statusCode: "out_for_delivery",
                  statusText: "Out for delivery",
                  location: "Jaipur_Sitapura_H (Rajasthan)",
                  remarks: null,
                  source: "webhook",
                  eventTimestamp: "2026-08-26T09:14:32.000Z",
                  createdAt: "2026-08-26T09:14:33.000Z",
                },
              ]),
            },
            401: RESPONSE_401,
          },
        },
      },
      "/track": {
        get: {
          tags: ["Tracking"],
          summary: "Public tracking lookup",
          operationId: "publicTrack",
          security: [],
          description: [
            "No authentication — safe to call straight from a buyer-facing page.",
            "",
            "Deliberately limited to status, city/state and the scan timeline: it never returns customer names,",
            "phone numbers or full addresses. Answers `200` with `found: false` for an unknown reference rather",
            "than a 404, so a lookup form can render the miss without error handling.",
          ].join("\n"),
          parameters: [queryParam("q", "AWB number or your `orderId`. Minimum 4 characters. Required.", { type: "string", minLength: 4 })],
          responses: {
            200: {
              description: "Tracking result, or `found: false`.",
              content: jsonContent({
                found: true,
                awb: "3419810012345",
                orderId: "ORD-10021",
                status: "out_for_delivery",
                courierStatus: "Out for delivery",
                courier: "Delhivery Surface",
                origin: "Jaipur, Rajasthan",
                destination: "Jaipur, Rajasthan",
                weightKg: 0.85,
                events: [
                  { statusText: "Out for delivery", statusCode: "out_for_delivery", location: "Jaipur_Sitapura_H (Rajasthan)", remarks: null, timestamp: "2026-08-26T09:14:32.000Z" },
                  { statusText: "Shipment picked up", statusCode: "shipped", location: "Jaipur_Sitapura_H (Rajasthan)", remarks: null, timestamp: "2026-08-25T14:02:10.000Z" },
                ],
              }),
            },
            400: { description: "`q` missing or shorter than 4 characters.", content: jsonContent({ found: false, message: "Enter a valid AWB number or Order ID" }) },
          },
        },
      },

      /* ────────────────────────────── NDR / RTO ───────────────────────── */
      "/orders/ndr/list": {
        get: {
          tags: ["NDR & RTO"],
          summary: "List NDR orders",
          operationId: "listNdrOrders",
          security: bearer,
          description: "Shipments whose delivery attempt failed and which are waiting on your instruction.",
          parameters: [
            queryParam("page", "1-based page number.", { type: "integer", minimum: 1, default: 1 }),
            queryParam("limit", "Rows per page.", { type: "integer", minimum: 1, default: 20 }),
            queryParam("sortBy", "`createdAt`, `ndrAttemptedAt` or `orderAmount`."),
            queryParam("sortOrder", "`asc` or `desc`.", { type: "string", enum: ["asc", "desc"] }),
          ],
          responses: {
            200: {
              description: "NDR orders.",
              content: jsonContent({
                orders: [{ ...ORDER_EXAMPLE, status: "ndr", ndrReason: "Customer not available", ndrAttemptedAt: "2026-08-26T13:20:00.000Z", ndrNextAction: null }],
                total: 6,
              }),
            },
            401: RESPONSE_401,
          },
        },
      },
      "/orders/{id}/ndr-action": {
        post: {
          tags: ["NDR & RTO"],
          summary: "Act on an NDR",
          operationId: "takeNdrAction",
          security: bearer,
          description: [
            "Tells the courier what to do with a failed delivery. The order must currently be in `ndr`.",
            "",
            "- `reattempt` — try delivery again. Send `updatedPhone` / `updatedAddress` to correct the details first.",
            "- `reschedule` — deliver on `rescheduledDate` instead.",
            "- `rto` — stop trying and return the parcel. Moves the order to `rto_initiated` and fires `order.rto_initiated`.",
          ].join("\n"),
          parameters: [pathParam("id", "Searchcraft shipment UUID.")],
          requestBody: {
            required: true,
            content: jsonContent({ action: "reattempt", remarks: "Buyer asked for delivery after 6pm", updatedPhone: "9876543299" }),
          },
          responses: {
            200: { description: "Action recorded and forwarded to the courier.", content: jsonContent({ message: 'NDR action "reattempt" taken' }) },
            400: { description: "Invalid action, or the order is not in `ndr`.", content: jsonContent({ error: 'Cannot take NDR action on order in "delivered" status' }) },
            401: RESPONSE_401,
            404: RESPONSE_404("Order"),
          },
        },
      },
      "/orders/rto/list": {
        get: {
          tags: ["NDR & RTO"],
          summary: "List RTO orders",
          operationId: "listRtoOrders",
          security: bearer,
          description: "Shipments on their way back to the pickup address.",
          parameters: [
            queryParam("page", "1-based page number.", { type: "integer", minimum: 1, default: 1 }),
            queryParam("limit", "Rows per page.", { type: "integer", minimum: 1, default: 20 }),
            queryParam("rtoPhase", "`initiated`, `in_transit` or `delivered`.", { type: "string", enum: ["initiated", "in_transit", "delivered"] }),
          ],
          responses: {
            200: { description: "RTO orders.", content: jsonContent({ orders: [{ ...ORDER_EXAMPLE, status: "rto_in_transit", rtoStatus: "in_transit" }], total: 3 }) },
            401: RESPONSE_401,
          },
        },
      },

      /* Webhook endpoint management */
      "/webhooks/events": {
        get: {
          tags: ["Webhooks"],
          summary: "List webhook event names",
          operationId: "listWebhookEvents",
          security: bearer,
          description: "Runtime reference for every order lifecycle event your endpoint may receive.",
          responses: {
            200: {
              description: "Webhook event catalogue.",
              content: jsonContent({
                success: true,
                apiVersion: WEBHOOK_API_VERSION,
                events: WEBHOOK_EVENT_CATALOGUE,
              }),
            },
            401: RESPONSE_401,
          },
        },
      },
      "/webhooks": {
        get: {
          tags: ["Webhooks"],
          summary: "List webhook endpoints",
          operationId: "listWebhooks",
          security: bearer,
          responses: {
            200: { description: "Registered endpoints for this account.", content: jsonContent({ success: true, webhooks: [WEBHOOK_EXAMPLE] }) },
            401: RESPONSE_401,
          },
        },
        post: {
          tags: ["Webhooks"],
          summary: "Create a webhook endpoint",
          operationId: "createWebhook",
          security: bearer,
          description: [
            "Registers an HTTPS callback URL. The signing secret is returned in full only in this response.",
            "Every active endpoint receives all order lifecycle events; there is no per-event subscription list.",
          ].join("\n"),
          requestBody: {
            required: true,
            content: jsonContent({
              url: "https://yourbrand.in/hooks/searchcraft",
              description: "Production order feed",
            }),
          },
          responses: {
            201: { description: "Endpoint created. Store the returned `secret` securely.", content: jsonContent({ success: true, webhook: { ...WEBHOOK_EXAMPLE, secret: "whsec_5f3d..." } }) },
            400: RESPONSE_400,
            401: RESPONSE_401,
            409: { description: "Duplicate URL or endpoint limit reached.", content: jsonContent({ success: false, error: "An endpoint with this URL is already registered" }) },
          },
        },
      },
      "/webhooks/{id}": {
        get: {
          tags: ["Webhooks"],
          summary: "Get one webhook endpoint",
          operationId: "getWebhook",
          security: bearer,
          parameters: [pathParam("id", "Webhook endpoint ID.")],
          responses: {
            200: { description: "The endpoint. The secret is masked.", content: jsonContent({ success: true, webhook: WEBHOOK_EXAMPLE }) },
            401: RESPONSE_401,
            404: RESPONSE_404("Webhook"),
          },
        },
        patch: {
          tags: ["Webhooks"],
          summary: "Update, pause or resume an endpoint",
          operationId: "updateWebhook",
          security: bearer,
          parameters: [pathParam("id", "Webhook endpoint ID.")],
          requestBody: { required: true, content: jsonContent({ isActive: false, description: "Paused during migration" }) },
          responses: {
            200: { description: "Endpoint updated.", content: jsonContent({ success: true, webhook: { ...WEBHOOK_EXAMPLE, isActive: false } }) },
            400: RESPONSE_400,
            401: RESPONSE_401,
            404: RESPONSE_404("Webhook"),
          },
        },
        delete: {
          tags: ["Webhooks"],
          summary: "Delete a webhook endpoint",
          operationId: "deleteWebhook",
          security: bearer,
          parameters: [pathParam("id", "Webhook endpoint ID.")],
          responses: {
            200: { description: "Endpoint deleted.", content: jsonContent({ success: true }) },
            401: RESPONSE_401,
            404: RESPONSE_404("Webhook"),
          },
        },
      },
      "/webhooks/{id}/rotate-secret": {
        post: {
          tags: ["Webhooks"],
          summary: "Rotate signing secret",
          operationId: "rotateWebhookSecret",
          security: bearer,
          description: "Issues a new secret and returns it once in full. Update your receiver before relying on new deliveries.",
          parameters: [pathParam("id", "Webhook endpoint ID.")],
          responses: {
            200: { description: "Secret rotated.", content: jsonContent({ success: true, webhook: { ...WEBHOOK_EXAMPLE, secret: "whsec_9a7b..." } }) },
            401: RESPONSE_401,
            404: RESPONSE_404("Webhook"),
          },
        },
      },
      "/webhooks/{id}/test": {
        post: {
          tags: ["Webhooks"],
          summary: "Send a test webhook",
          operationId: "testWebhook",
          security: bearer,
          description: "Sends `webhook.ping` by default, or a realistic sample for the lifecycle event supplied in `event`.",
          parameters: [pathParam("id", "Webhook endpoint ID.")],
          requestBody: { required: false, content: jsonContent({ event: "order.delivered" }) },
          responses: {
            200: { description: "Test attempted. `delivered` is true only when your endpoint returned 2xx.", content: jsonContent({ success: true, delivered: true, delivery: DELIVERY_EXAMPLE }) },
            400: RESPONSE_400,
            401: RESPONSE_401,
            404: RESPONSE_404("Webhook"),
          },
        },
      },
      "/webhooks/deliveries": {
        get: {
          tags: ["Webhooks"],
          summary: "List webhook delivery attempts",
          operationId: "listWebhookDeliveries",
          security: bearer,
          parameters: [
            queryParam("page", "1-based page number.", { type: "integer", minimum: 1, default: 1 }),
            queryParam("limit", "Rows per page, max 100.", { type: "integer", minimum: 1, maximum: 100, default: 20 }),
            queryParam("status", "Filter by delivery status.", { type: "string", enum: ["pending", "retrying", "success", "failed"] }),
            queryParam("event", "Filter by event name, e.g. `order.delivered`."),
          ],
          responses: {
            200: { description: "Delivery log.", content: jsonContent({ success: true, deliveries: [DELIVERY_EXAMPLE], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } }) },
            401: RESPONSE_401,
          },
        },
      },
      "/webhooks/{id}/deliveries": {
        get: {
          tags: ["Webhooks"],
          summary: "List deliveries for one endpoint",
          operationId: "listWebhookEndpointDeliveries",
          security: bearer,
          parameters: [
            pathParam("id", "Webhook endpoint ID."),
            queryParam("status", "Filter by delivery status.", { type: "string", enum: ["pending", "retrying", "success", "failed"] }),
            queryParam("event", "Filter by event name, e.g. `order.delivered`."),
          ],
          responses: {
            200: { description: "Endpoint delivery log.", content: jsonContent({ success: true, deliveries: [DELIVERY_EXAMPLE], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } }) },
            401: RESPONSE_401,
            404: RESPONSE_404("Webhook"),
          },
        },
      },
      "/webhooks/deliveries/{deliveryId}/redeliver": {
        post: {
          tags: ["Webhooks"],
          summary: "Replay a webhook delivery",
          operationId: "redeliverWebhook",
          security: bearer,
          description: "Queues a fresh retry with the same event payload. Use this after your receiver has been fixed.",
          parameters: [pathParam("deliveryId", "Webhook delivery ID.")],
          responses: {
            202: { description: "Redelivery queued.", content: jsonContent({ success: true, message: "Redelivery queued - it will be attempted within a minute" }) },
            401: RESPONSE_401,
            404: RESPONSE_404("Delivery"),
          },
        },
      },
    },

    /* OpenAPI 3.1 `webhooks`: what WE send to YOU. */
    webhooks: Object.fromEntries(
      WEBHOOK_EVENT_CATALOGUE.map((e) => [
        e.event,
        {
          post: {
            tags: ["Webhook Events"],
            summary: e.summary,
            description: e.description,
            operationId: `on${e.event.split(".").map((p) => p[0].toUpperCase() + p.slice(1)).join("")}`,
            requestBody: {
              required: true,
              description: "Signed event envelope.",
              content: jsonContent({ ...WEBHOOK_ENVELOPE_EXAMPLE, event: e.event }),
            },
            responses: {
              200: {
                description:
                  "Return any 2xx as soon as you have stored the event. Anything else — or no answer within 10 seconds — counts as a failure and is retried.",
              },
            },
          },
        },
      ]),
    ),

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "`Authorization: Bearer <accessToken>` — the token returned by `POST /auth/login`.",
        },
      },
      schemas: {
        WebhookEnvelope: {
          type: "object",
          required: ["id", "event", "api_version", "created_at", "data"],
          properties: {
            id: { type: "string", description: "Unique per event. Identical across every endpoint it fans out to — de-duplicate on this." },
            event: { type: "string", enum: WEBHOOK_EVENT_CATALOGUE.map((e) => e.event) },
            api_version: { type: "string", const: WEBHOOK_API_VERSION },
            created_at: { type: "string", format: "date-time" },
            data: { $ref: "#/components/schemas/WebhookOrderEventData" },
          },
        },
        WebhookOrderEventData: {
          type: "object",
          properties: {
            order_id: { type: "string", description: "Your own order reference — the `orderId` you sent to POST /orders." },
            external_order_id: { type: ["string", "null"], description: "Store/marketplace order id sent to POST /api/external/orders/import, when present." },
            source: { type: ["string", "null"], description: "Source channel captured at import time, e.g. `external_store`." },
            shipment_id: { type: "string", format: "uuid", description: "Searchcraft shipment UUID. Stable for the life of the shipment." },
            awb: { type: ["string", "null"], description: "Courier airway bill. Null until the courier assigns one." },
            awb_number: { type: ["string", "null"], deprecated: true, description: "Alias of `awb`, kept for pre-v1 subscribers." },
            status: { type: "string", description: "Searchcraft order status after this event." },
            previous_status: { type: ["string", "null"], description: "Status the order moved from, when the event is a transition." },
            order_type: { type: "string", enum: ["B2C", "B2B"] },
            payment_type: { type: ["string", "null"], enum: ["prepaid", "cod", null] },
            order_amount: { type: "number" },
            cod_amount: { type: "number" },
            weight_grams: { type: ["number", "null"] },
            service_provider: { type: ["string", "null"], description: "Integration slug, e.g. `delhivery`." },
            courier_partner: { type: ["string", "null"], deprecated: true, description: "Alias of `service_provider`." },
            courier_id: { type: ["string", "null"], format: "uuid" },
            courier_name: { type: ["string", "null"] },
            destination: { type: ["object", "null"], properties: { city: { type: ["string", "null"] }, state: { type: ["string", "null"] }, pincode: { type: ["string", "null"] } } },
            courier_status: { type: ["string", "null"], description: "Raw status text as the courier reported it, unmapped." },
            courier_status_code: { type: ["string", "null"] },
            location: { type: ["string", "null"] },
            remark: { type: ["string", "null"] },
            event_timestamp: { type: "string", format: "date-time", description: "When the underlying event happened. Falls back to dispatch time." },
            label_url: { type: ["string", "null"] },
            tracking_url: { type: ["string", "null"], description: "Public tracking page for this AWB." },
            ndr: { type: ["object", "null"], properties: { reason: { type: ["string", "null"] }, attempt_count: { type: ["integer", "null"] }, next_action: { type: ["string", "null"] } } },
            cancellation: { type: ["object", "null"], properties: { reason: { type: ["string", "null"] }, cancelled_at: { type: ["string", "null"], format: "date-time" } } },
            manifested_at: { type: ["string", "null"], format: "date-time" },
            created_at: { type: "string", format: "date-time", description: "When the order was created." },
          },
        },
      },
    },
  };
}
