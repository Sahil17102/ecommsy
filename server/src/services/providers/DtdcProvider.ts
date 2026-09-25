import { BaseProvider, axios } from "./BaseProvider.js";
import type {
  ServiceabilityParams,
  ServiceabilityResult,
  OrderCreationParams,
  OrderCreationResult,
} from "../../types/provider.js";
import { externalUrls } from "../../config/externalUrls.js";
import {
  HTTP_TIMEOUT_SHORT,
  HTTP_TIMEOUT_MEDIUM,
  HTTP_TIMEOUT_LONG,
} from "../../config/constants.js";

/**
 * DTDC PX (B2C / Express) provider.
 *
 * Credential shape (`service_providers.credentials.b2c.values`):
 *   - apiKey            (required) — header `api-key` for booking/label/cancel
 *   - customerCode      (required) — DTDC customer code, sent on booking + cancel
 *   - serviceTypeId     (optional) — e.g. "B2C PRIORITY" (default), "B2C PREMIUM"
 *   - trackingUsername  (optional) — only needed if trackOrder is called
 *   - trackingPassword  (optional) — only needed if trackOrder is called
 *
 * Per-courier overrides (`couriers.metaData`):
 *   - commodityId       (optional) — numeric id or commodity name (default "OTHERS")
 *   - serviceTypeId     (optional) — overrides the credential default per courier
 */

/** DTDC's /authenticate endpoint doesn't document a TTL — cache for 1h. */
const TRACKING_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Default commodity descriptor when neither courier nor order specifies one. */
const DEFAULT_COMMODITY = "OTHERS";

/** Supported DTDC label codes (see Shipping Label API doc). */
export type DtdcLabelCode =
  | "SHIP_LABEL_A4"
  | "SHIP_LABEL_A6"
  | "SHIP_LABEL_POD"
  | "SHIP_LABEL_4X6"
  | "ROUTE_LABEL_A4"
  | "ROUTE_LABEL_4X4"
  | "ADDR_LABEL_A4"
  | "ADDR_LABEL_4X2"
  | "INVOICE";

export class DtdcProvider extends BaseProvider {
  get displayName(): string {
    return `DTDC:${this.accountName}`;
  }

  // ── Debug HTTP logging ──────────────────────────────────────
  //
  // Verbose per-request logging for debugging live DTDC issues: it prints the
  // URL, auth (api-key / x-access-token) + query params, and the full request
  // body. NOTE: this logs secrets (api-key, tokens, credentials) in plaintext —
  // it's intentional for debugging; tighten or remove once the issue is found.

  private logHttp(
    tag: string,
    details: { url: string; headers?: Record<string, unknown>; params?: Record<string, unknown>; body?: unknown },
  ): void {
    this.log("info", `[${tag}] → URL: ${details.url}`);
    if (details.params) this.log("info", `[${tag}] → params: ${JSON.stringify(details.params)}`);
    if (details.headers) this.log("info", `[${tag}] → auth/headers: ${JSON.stringify(details.headers)}`);
    if (details.body !== undefined) this.log("info", `[${tag}] → body: ${JSON.stringify(details.body)}`);
  }

  // ── Credential helpers ──────────────────────────────────────

  private async getBookingCreds(): Promise<{
    apiKey: string;
    customerCode: string;
    serviceTypeId: string;
  } | null> {
    const creds = await this.getCredentials();
    const apiKey = creds?.apiKey;
    const customerCode = creds?.customerCode;
    // if (!apiKey || !customerCode) {
    //   this.log("warn", "Missing apiKey / customerCode in credentials");
    //   return null;
    // }
    return {
      apiKey: apiKey || "",
      customerCode: customerCode || ""  ,
      serviceTypeId: creds?.serviceTypeId || "B2C PRIORITY",
    };
  }

  /**
   * Fetch (or return cached) tracking token via /authenticate.
   * Tracking is the only DTDC surface that uses bearer-style auth — booking,
   * label, and cancel all use the static api-key header.
   */
  private async getTrackingToken(): Promise<string | null> {
    const cached = this.getCachedToken();
    if (cached) return cached;

    const creds = await this.getCredentials();
    const username = creds?.trackingUsername;
    const password = creds?.trackingPassword;
    if (!username || !password) {
      this.log("warn", "Missing trackingUsername / trackingPassword — cannot pull tracking");
      return null;
    }

    try {
      this.logHttp("getTrackingToken", {
        url: externalUrls.dtdc.trackingAuth,
        params: { username, password },
      });
      const { data, headers } = await axios.get(externalUrls.dtdc.trackingAuth, {
        params: { username, password },
        timeout: HTTP_TIMEOUT_SHORT,
      });
      this.log("info", `[getTrackingToken] ← response: ${JSON.stringify(data)?.slice(0, 300)}`);

      // DTDC returns the token either in the body (string or { token }) or in
      // the response headers depending on the API version. Be generous.
      const rawToken =
        (typeof data === "string" ? data : null) ||
        data?.token ||
        data?.access_token ||
        headers?.["x-access-token"] ||
        headers?.["access-token"];

      if (!rawToken) {
        this.log("warn", `Auth response had no token — ${JSON.stringify(data).slice(0, 200)}`);
        return null;
      }

      // The /authenticate body comes back as "<username>:<token>"
      // (e.g. "SL2850_trk_json:5ceb7140…"). Only the part after the first colon
      // is the actual value to send as x-access-token.
      const tokenStr = String(rawToken);
      const token = tokenStr.includes(":")
        ? tokenStr.slice(tokenStr.indexOf(":") + 1)
        : tokenStr;

      this.setCachedToken(token, TRACKING_TOKEN_TTL_MS);
      this.log("info", `Tracking token obtained and cached — token: ${token}`);
      return token;
    } catch (err) {
      this.log("error", `Tracking auth FAILED — ${this.formatError(err)}`);
      return null;
    }
  }

  // ── Serviceability ──────────────────────────────────────────
  //
  // DTDC exposes a public pincode-pair API (no auth). It returns whether a
  // movement between two pincodes is feasible. The shape of the response isn't
  // formally documented; a 200 with a non-empty, non-error body is treated as
  // serviceable. False-positive risk is low because the same pincodes are
  // also gated at booking time by DTDC.

  async checkServiceability(params: ServiceabilityParams): Promise<ServiceabilityResult> {
    const start = Date.now();
    try {
      // The pincode API needs both ends. Most callers pass `origin` as the
      // seller's pincode and `destination` as the buyer's; if origin is missing
      // we can't ask DTDC anything useful.
      if (!params.origin || !params.destination) {
        this.log("warn", "Missing origin/destination pincode — marking not serviceable");
        return this.serviceabilityResult(false);
      }

      this.logHttp("checkServiceability", {
        url: externalUrls.dtdc.pincodeServiceability,
        body: { orgPincode: params.origin, desPincode: params.destination },
      });
      const { data, status } = await axios.post(
        externalUrls.dtdc.pincodeServiceability,
        { orgPincode: params.origin, desPincode: params.destination },
        {
          headers: { "Content-Type": "application/json" },
          timeout: HTTP_TIMEOUT_SHORT,
          // Accept any 2xx/4xx so we can read DTDC's own error string instead
          // of throwing on a structured "not serviceable" response.
          validateStatus: (s) => s >= 200 && s < 500,
        },
      );

      // Heuristic: HTTP 200 with a truthy body, no `ERROR` marker, is serviceable.
      // Known shapes seen in the wild:
      //   { ZONE: "...", SERVICE_TYPE_ID: [...] }   → serviceable
      //   { ERROR: "PINCODE NOT SERVICEABLE" }       → not serviceable
      //   "ERROR: ..."                                → not serviceable
      const ok =
        status === 200 &&
        data != null &&
        !(typeof data === "object" && (data as Record<string, unknown>).ERROR) &&
        !(typeof data === "string" && data.toUpperCase().includes("ERROR"));

      this.log(
        "info",
        `${params.origin} → ${params.destination} → ${ok ? "SERVICEABLE" : "NOT SERVICEABLE"} (${Date.now() - start}ms)`,
      );
      return this.serviceabilityResult(ok);
    } catch (err) {
      this.log("error", `Serviceability check FAILED — ${this.formatError(err)} (${Date.now() - start}ms)`);
      return this.serviceabilityResult(false);
    }
  }

  // ── Order creation (single + MPS) ───────────────────────────

  async createOrder(params: OrderCreationParams): Promise<OrderCreationResult> {
    const start = Date.now();

    const bookingCreds = await this.getBookingCreds();
    // if (!bookingCreds) {
    //   return {
    //     success: false,
    //     accountId: this.account.id,
    //     provider: this.slug,
    //     error: "Missing DTDC credentials (apiKey / customerCode)",
    //   };
    // }

    try {
      this.log("info", `[createOrder] ========== START ==========`);
      this.log("info", `[createOrder] orderId: ${params.orderId}`);

      const isCod = params.paymentType === "cod";
      const meta = (params.metaData ?? {}) as Record<string, unknown>;

      // Allow per-courier overrides for service type + commodity.
      const serviceTypeId =
        (typeof meta.serviceTypeId === "string" && meta.serviceTypeId) ||
        bookingCreds?.serviceTypeId;
      const commodityId =
        (typeof meta.commodityId === "string" || typeof meta.commodityId === "number"
          ? String(meta.commodityId)
          : null) || DEFAULT_COMMODITY;

      // Internal weight is grams; DTDC accepts kg. LxBxH already in cm.
      const weightKg = (params.weight / 1000).toFixed(3);

      // DTDC requires num_pieces. Treat the MPS case as >1 (when packages[] is provided).
      const numPieces = params.packages && params.packages.length > 0 ? params.packages.length : 1;

      const description = params.products
        .map((p) => p.name)
        .filter(Boolean)
        .join(", ")
        .slice(0, 250); // doc cap: 250 chars

      const consignment: Record<string, unknown> = {
        customer_code: bookingCreds?.customerCode,
        service_type_id: serviceTypeId,
        load_type: "NON-DOCUMENT",
        consignment_type: "Forward",
        description: description || "Goods",
        dimension_unit: "cm",
        length: String(params.length),
        width: String(params.breadth),
        height: String(params.height),
        weight_unit: "kg",
        weight: weightKg,
        declared_value: String(params.orderAmount),
        num_pieces: String(numPieces),

        origin_details: {
          name: params.pickup.contactName,
          phone: params.pickup.phone,
          alternate_phone: "",
          address_line_1: params.pickup.addressLine1,
          address_line_2: params.pickup.addressLine2 || "",
          pincode: params.pickup.pincode,
          city: params.pickup.city,
          state: params.pickup.state,
        },

        destination_details: {
          name: params.delivery.name,
          phone: params.delivery.phone,
          alternate_phone: "",
          address_line_1: params.delivery.addressLine1,
          address_line_2: params.delivery.addressLine2 || "",
          pincode: params.delivery.pincode,
          city: params.delivery.city,
          state: params.delivery.state,
        },

        customer_reference_number: params.orderId,
        cod_collection_mode: isCod ? "CASH" : "",
        cod_amount: isCod ? String(params.codAmount) : "",
        commodity_id: commodityId,
        is_risk_surcharge_applicable: "false",
        invoice_number: "",
        invoice_date: "",
        reference_number: "",
      };

      // Optional RTO address — DTDC's field names use city_name / state_name.
      if (params.rtoAddress) {
        consignment.return_details = {
          name: params.rtoAddress.contactName,
          phone: params.rtoAddress.phone,
          alternate_phone: "",
          address_line_1: params.rtoAddress.addressLine1,
          address_line_2: params.rtoAddress.addressLine2 || "",
          pincode: params.rtoAddress.pincode,
          city_name: params.rtoAddress.city,
          state_name: params.rtoAddress.state,
          email: "",
        };
      }

      // MPS: distribute order value evenly across pieces if no per-piece price.
      if (params.packages && params.packages.length > 0) {
        const perPieceValue = Math.max(1, Math.round(params.orderAmount / params.packages.length));
        consignment.pieces_detail = params.packages.map((pkg) => ({
          description: description || "Goods",
          declared_value: String(perPieceValue),
          weight: pkg.weight.toFixed(3), // already kg
          height: String(pkg.height),
          length: String(pkg.length),
          width: String(pkg.breadth),
        }));
      }

      const payload = { consignments: [consignment] };

      this.logHttp("createOrder", {
        url: externalUrls.dtdc.createOrder,
        headers: { "api-key": bookingCreds?.apiKey, "Content-Type": "application/json" },
        body: payload,
      });

      const { data } = await axios.post(externalUrls.dtdc.createOrder, payload, {
        headers: {
          "api-key": bookingCreds?.apiKey,
          "Content-Type": "application/json",
        },
        timeout: HTTP_TIMEOUT_MEDIUM,
      });

      this.log("info", `[createOrder] response: ${JSON.stringify(data).slice(0, 1000)}`);

      // DTDC processes each consignment independently. Top-level `status: "OK"`
      // just means the request was understood; per-consignment success lives in
      // `data[i].success`.
      const first = Array.isArray(data?.data) ? data.data[0] : null;
      const isSuccess = first?.success === true && !!first?.reference_number;

      if (!isSuccess) {
        const errorMsg =
          first?.message ||
          first?.error ||
          first?.remarks ||
          data?.message ||
          (data?.status && data.status !== "OK" ? `DTDC ${data.status}` : "Order creation failed");
        this.log("warn", `Order creation failed for ${params.orderId} — ${errorMsg} (${Date.now() - start}ms)`);
        return {
          success: false,
          accountId: this.account.id,
          provider: this.slug,
          error: String(errorMsg),
          rawResponse: data,
        };
      }

      const awb = String(first.reference_number);
      this.log("info", `Order ${params.orderId} created — AWB: ${awb} (${Date.now() - start}ms)`);
      return {
        success: true,
        accountId: this.account.id,
        provider: this.slug,
        awb,
        providerOrderId: awb,
        rawResponse: data,
      };
    } catch (err) {
      this.log("error", `[createOrder] error — ${this.formatError(err)} (${Date.now() - start}ms)`);
      return {
        success: false,
        accountId: this.account.id,
        provider: this.slug,
        error: this.formatError(err),
      };
    }
  }

  // ── Cancel ──────────────────────────────────────────────────

  async cancelOrder(awb: string): Promise<{ success: boolean; error?: string }> {
    const bookingCreds = await this.getBookingCreds();
    if (!bookingCreds) return { success: false, error: "Missing DTDC credentials" };

    try {
      this.logHttp("cancelOrder", {
        url: externalUrls.dtdc.cancel,
        headers: { "api-key": bookingCreds.apiKey, "Content-Type": "application/json" },
        body: { AWBNo: [awb], customerCode: bookingCreds.customerCode },
      });
      const { data } = await axios.post(
        externalUrls.dtdc.cancel,
        { AWBNo: [awb], customerCode: bookingCreds.customerCode },
        {
          headers: { "api-key": bookingCreds.apiKey, "Content-Type": "application/json" },
          timeout: HTTP_TIMEOUT_MEDIUM,
        },
      );
      this.log("info", `[cancelOrder] ← response: ${JSON.stringify(data)?.slice(0, 500)}`);

      // Response shape isn't tightly documented. Treat truthy `status`/`OK` as success,
      // anything else as failure — surfacing whatever message DTDC returned.
      const statusStr =
        (typeof data?.status === "string" ? data.status : null) ||
        (typeof data?.STATUS === "string" ? data.STATUS : null);
      const isSuccess = statusStr ? /ok|success/i.test(statusStr) : Boolean(data?.success);

      if (!isSuccess) {
        const msg = data?.message || data?.error || data?.remarks || "Cancellation rejected by DTDC";
        this.log("warn", `Cancel rejected for AWB=${awb} — ${msg}`);
        return { success: false, error: String(msg) };
      }

      this.log("info", `Order cancelled — AWB: ${awb}`);
      return { success: true };
    } catch (err) {
      this.log("error", `Cancel FAILED for AWB=${awb} — ${this.formatError(err)}`);
      return { success: false, error: this.formatError(err) };
    }
  }

  // ── Tracking ────────────────────────────────────────────────

  async trackOrder(awb: string): Promise<Record<string, unknown> | null> {
    try {
      const token = await this.getTrackingToken();
      if (!token) return null;

      this.logHttp("trackOrder", {
        url: externalUrls.dtdc.tracking,
        headers: { "x-access-token": token, "Content-Type": "application/json" },
        body: { trkType: "cnno", strcnno: awb, addtnlDtl: "Y" },
      });
      const { data } = await axios.post(
        externalUrls.dtdc.tracking,
        { trkType: "cnno", strcnno: awb, addtnlDtl: "Y" },
        {
          headers: { "x-access-token": token, "Content-Type": "application/json" },
          timeout: HTTP_TIMEOUT_MEDIUM,
        },
      );
      this.log("info", `[trackOrder] ← response: ${JSON.stringify(data)?.slice(0, 500)}`);

      // statusFlag === false means DTDC couldn't find the consignment (no scans yet).
      if (data?.statusFlag === false) {
        this.log("info", `No tracking data yet for AWB=${awb}`);
        return null;
      }

      return (data ?? null) as Record<string, unknown> | null;
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      this.log("error", `Track FAILED for AWB=${awb} — ${this.formatError(err)}`);
      return null;
    }
  }

  // ── Label fetch (optional surface, not on BaseProvider) ─────
  //
  // Returns the raw label PDF / Base64 string from DTDC. Callers that prefer
  // the partner-issued label over our locally-generated one (see
  // `services/documents/getOrderLabel`) can use this and persist the buffer
  // via `uploadDocument`.

  async fetchLabel(
    awb: string,
    opts: { labelCode?: DtdcLabelCode; format?: "pdf" | "base64" } = {},
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const bookingCreds = await this.getBookingCreds();
    if (!bookingCreds) return null;

    const labelCode = opts.labelCode || "SHIP_LABEL_4X6";
    const format = opts.format || "pdf";

    try {
      this.logHttp("fetchLabel", {
        url: externalUrls.dtdc.shippingLabel,
        params: { reference_number: awb, label_code: labelCode, label_format: format },
        headers: { "api-key": bookingCreds.apiKey },
      });
      const { data, headers } = await axios.get(externalUrls.dtdc.shippingLabel, {
        params: { reference_number: awb, label_code: labelCode, label_format: format },
        headers: { "api-key": bookingCreds.apiKey },
        timeout: HTTP_TIMEOUT_LONG,
        responseType: format === "pdf" ? "arraybuffer" : "json",
      });

      if (format === "base64") {
        const b64 = (data?.label || data?.data || "") as string;
        if (!b64) {
          this.log("warn", `Base64 label response had no label payload for AWB=${awb}`);
          return null;
        }
        return { buffer: Buffer.from(b64, "base64"), contentType: "application/pdf" };
      }

      const buffer = Buffer.from(data as ArrayBuffer);
      const contentType =
        (typeof headers?.["content-type"] === "string" && headers["content-type"]) ||
        "application/pdf";
      this.log("info", `Label fetched for AWB=${awb} (${buffer.length} bytes, ${labelCode})`);
      return { buffer, contentType };
    } catch (err) {
      this.log("error", `Label fetch FAILED for AWB=${awb} — ${this.formatError(err)}`);
      return null;
    }
  }
}
