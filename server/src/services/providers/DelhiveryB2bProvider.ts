import { BaseProvider, axios } from "./BaseProvider.js";
import type {
  ServiceabilityParams,
  ServiceabilityResult,
  OrderCreationParams,
  OrderCreationResult,
} from "../../types/provider.js";
import { externalUrls } from "../../config/externalUrls.js";
import { HTTP_TIMEOUT_SHORT, HTTP_TIMEOUT_MEDIUM } from "../../config/constants.js";

/**
 * Delhivery B2B (LTL — Less-than-Truckload) provider.
 *
 * Distinct from `DelhiveryProvider` (B2C) — separate API base URL, separate
 * auth flow (username/password → Bearer token, 24h expiry), separate manifest
 * payload, separate webhook taxonomy.
 *
 * Reference: https://one.delhivery.com/developer-portal/document/b2b/detail/
 *
 * Required B2B credentials in ServiceProvider doc (credentials.b2b.values):
 *   - username
 *   - password
 *   - clientWarehouse        (registered warehouse name on Delhivery, used as `pickup_location_name`)
 *   - webhookCallbackUrl     (optional — pushed back with LR/AWB after async manifestation)
 *
 * Manifest is asynchronous: a successful POST returns a Job ID. Delhivery
 * later pushes the LR (Lorry Receipt) and per-box AWBs to the registered
 * webhook callback URL. Until that callback fires, the order's `awb` field
 * holds the Job ID prefixed with `JOB:` so it's distinguishable.
 */
export class DelhiveryB2bProvider extends BaseProvider {
  get displayName(): string {
    return `Delhivery B2B:${this.accountName}`;
  }

  // ── Auth ───────────────────────────────────────────────────────
  //
  // Login response (UMS): { token, expiry, ... }
  // Token TTL is 24 hours per docs. We cache for 23h to leave headroom.

  private static readonly TOKEN_TTL_MS = 23 * 60 * 60 * 1000;

  /**
   * Get a valid Bearer token. Logs in fresh if no cached token, or if the
   * cached token has expired. The cache is shared across instances via the
   * static map in BaseProvider.
   */
  private async getToken(): Promise<string | null> {
    const cached = this.getCachedToken();
    if (cached) return cached;

    const creds = await this.getCredentials("b2b");
    if (!creds?.username || !creds?.password) {
      this.log("warn", "No B2B username/password in credentials — cannot login");
      return null;
    }

    try {
      const { data } = await axios.post(
        externalUrls.delhiveryB2b.login,
        { username: creds.username, password: creds.password },
        { headers: { "Content-Type": "application/json" }, timeout: HTTP_TIMEOUT_MEDIUM },
      );

      const token = (data?.token || data?.access_token || data?.data?.token) as string | undefined;
      if (!token) {
        this.log("warn", `Login succeeded but no token in response: ${JSON.stringify(data).slice(0, 200)}`);
        return null;
      }

      this.setCachedToken(token, DelhiveryB2bProvider.TOKEN_TTL_MS);
      this.log("info", "Logged in — token cached for 23h");
      return token;
    } catch (err) {
      this.log("error", `Login FAILED — ${this.formatError(err)}`);
      return null;
    }
  }

  /** Convenience: build auth headers, refreshing token on 401 once. */
  private async authHeader(): Promise<Record<string, string> | null> {
    const token = await this.getToken();
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  }

  // ── Serviceability ─────────────────────────────────────────────

  async checkServiceability(params: ServiceabilityParams): Promise<ServiceabilityResult> {
    const start = Date.now();
    try {
      const headers = await this.authHeader();
      if (!headers) return { accountId: this.account.id, provider: this.slug, serviceable: false };

      const weightKg = Math.max(1, Math.ceil((params.weight ?? 0) / 1000));

      this.log("info", `Checking B2B serviceability for pin=${params.destination} weight=${weightKg}kg`);

      const { data } = await axios.get(
        `${externalUrls.delhiveryB2b.pincodeServiceability}/${params.destination}`,
        {
          params: { weight: weightKg },
          headers,
          timeout: HTTP_TIMEOUT_SHORT,
        },
      );

      // Response shape (per docs): { success/serviceable flag, ... }
      // Be lenient — accept any of: { success: true }, { serviceable: true }, { data: { serviceable: true } }
      const serviceable =
        data?.serviceable === true ||
        data?.success === true ||
        data?.data?.serviceable === true ||
        data?.status === "success";

      this.log("info", `Pin ${params.destination} → ${serviceable ? "SERVICEABLE" : "NOT SERVICEABLE"} (${Date.now() - start}ms)`);
      return { accountId: this.account.id, provider: this.slug, serviceable };
    } catch (err) {
      // 401 → bust token cache so the next call re-logs in
      if (this.isUnauthorized(err)) this.clearCachedToken();
      this.log("error", `Serviceability FAILED — ${this.formatError(err)} (${Date.now() - start}ms)`);
      return { accountId: this.account.id, provider: this.slug, serviceable: false };
    }
  }

  /**
   * Get TAT (Turn-Around Time) estimate between two pincodes.
   * Returns the estimated delivery date string from Delhivery, or null on failure.
   */
  async getTatEstimate(originPin: string, destinationPin: string): Promise<{
    estimatedDeliveryDate?: string;
    tatDays?: number;
    raw?: unknown;
  } | null> {
    try {
      const headers = await this.authHeader();
      if (!headers) return null;

      const { data } = await axios.get(externalUrls.delhiveryB2b.tatEstimate, {
        params: { origin_pin: originPin, destination_pin: destinationPin },
        headers,
        timeout: HTTP_TIMEOUT_SHORT,
      });

      return {
        estimatedDeliveryDate:
          (data?.estimated_delivery_date as string) ||
          (data?.edd as string) ||
          (data?.data?.estimated_delivery_date as string),
        tatDays: (data?.tat_days as number) || (data?.data?.tat_days as number),
        raw: data,
      };
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      this.log("error", `TAT estimate FAILED — ${this.formatError(err)}`);
      return null;
    }
  }

  // ── Manifest (Order Creation) ──────────────────────────────────

  /**
   * Create a B2B shipment (manifest). This is asynchronous on Delhivery's side:
   * a successful POST returns a Job ID, and the LR/AWB numbers are pushed to
   * the registered webhook callback URL once Delhivery has provisioned them.
   *
   * We persist `JOB:<job_id>` as the order AWB so that:
   *   1. The order can be saved immediately (the Order schema requires AWB).
   *   2. The webhook receiver can find the order and replace the placeholder
   *      with the real LR number when Delhivery calls back.
   */
  async createOrder(params: OrderCreationParams): Promise<OrderCreationResult> {
    const start = Date.now();

    try {
      const headers = await this.authHeader();
      if (!headers) {
        return { success: false, accountId: this.account.id, provider: this.slug, error: "B2B login failed — check username/password" };
      }

      const creds = await this.getCredentials("b2b");
      const pickupLocationName = creds?.clientWarehouse || params.pickup.contactName;

      // Total weight in kg (Delhivery B2B expects kg, not grams).
      const totalWeightKg = params.packages && params.packages.length > 0
        ? params.packages.reduce((sum, p) => sum + p.weight, 0)
        : (params.weight || 0) / 1000;

      // Build dropoff_location object — Delhivery expects an object that we
      // serialize to JSON for the multipart field.
      const dropoffLocation = {
        consignee_name: params.delivery.name,
        address: [params.delivery.addressLine1, params.delivery.addressLine2].filter(Boolean).join(", "),
        city: params.delivery.city,
        state: params.delivery.state,
        zip: params.delivery.pincode,
        phone: params.delivery.phone.replace(/\D/g, "").slice(-10),
        email: params.delivery.email || "",
      };

      // Invoices array — Delhivery requires this. Build from B2B invoices if
      // provided, otherwise synthesize a single placeholder so the request
      // doesn't get rejected for missing invoice metadata.
      const invoices = params.invoices && params.invoices.length > 0
        ? params.invoices.map((inv) => ({
            ewaybill: inv.ebn || "",
            inv_num: inv.invoiceNumber,
            inv_amt: inv.invoiceValue,
            inv_qr_code: "",
          }))
        : [
            {
              ewaybill: "",
              inv_num: params.orderId,
              inv_amt: params.orderAmount,
              inv_qr_code: "",
            },
          ];

      // shipment_details — one entry per "shipment" line. We model the entire
      // order as a single shipment with `box_count = packages.length`. The
      // waybills array stays empty so Delhivery generates them; we get them
      // back via the webhook callback.
      const shipmentDetails = [
        {
          order_id: params.orderId,
          box_count: params.packages?.length || 1,
          description: params.products.map((p) => p.name).slice(0, 5).join(", ") || params.orderId,
          weight: Math.round(totalWeightKg * 1000), // grams (per curl example: weight: 1000 for 1kg)
          waybills: [],
          master: false,
        },
      ];

      // Billing address — fall back to pickup address with company info.
      const billingAddress = {
        name: params.pickup.contactName,
        company: params.companyName || params.pickup.contactName,
        consignor: params.companyName || params.pickup.contactName,
        address: [params.pickup.addressLine1, params.pickup.addressLine2].filter(Boolean).join(", "),
        city: params.pickup.city,
        state: params.pickup.state,
        pin: params.pickup.pincode,
        phone: params.pickup.phone.replace(/\D/g, "").slice(-10),
        ...(params.companyGst ? { gst_number: params.companyGst } : {}),
      };

      const form = new FormData();
      form.append("lrn", ""); // empty → Delhivery generates
      form.append("pickup_location_name", pickupLocationName);
      form.append("payment_mode", params.paymentType === "cod" ? "cod" : "prepaid");
      form.append("cod_amount", String(params.codAmount || 0));
      form.append("weight", String(Math.round(totalWeightKg * 1000))); // grams
      form.append("dropoff_location", JSON.stringify(dropoffLocation));
      form.append("rov_insurance", "False");
      form.append("invoices", JSON.stringify(invoices));
      form.append("shipment_details", JSON.stringify(shipmentDetails));
      form.append("fm_pickup", "False");
      form.append("freight_mode", "fop"); // freight on payee
      form.append("billing_address", JSON.stringify(billingAddress));

      // Optional callback URL for async LR/AWB push.
      if (creds?.webhookCallbackUrl) {
        form.append("callback_url", creds.webhookCallbackUrl);
      }

      this.log("info", `Manifesting B2B order ${params.orderId} → ${params.delivery.pincode}`);

      const { data } = await axios.post(externalUrls.delhiveryB2b.manifest, form, {
        headers: {
          ...headers,
          // FormData sets its own content-type with boundary; let axios handle it.
        },
        timeout: HTTP_TIMEOUT_MEDIUM,
        maxBodyLength: Infinity,
      });

      // Response shapes seen across Delhivery LTL APIs:
      //   { success: true, job_id: "...", ... }
      //   { status: "success", data: { job_id: "..." } }
      //   { lrn: "...", waybills: [...] } — synchronous (rare, only if pre-allocated)
      const jobId =
        (data?.job_id as string) ||
        (data?.jobId as string) ||
        (data?.data?.job_id as string);

      const lrn = (data?.lrn as string) || (data?.data?.lrn as string);
      const waybills = (data?.waybills as string[]) || (data?.data?.waybills as string[]) || [];

      if (!jobId && !lrn) {
        const errorMsg =
          (data?.error as string) ||
          (data?.message as string) ||
          (data?.rmk as string) ||
          "Manifest API returned no job_id or LR";
        this.log("warn", `Manifest failed for ${params.orderId} — ${errorMsg} (${Date.now() - start}ms)`);
        return { success: false, accountId: this.account.id, provider: this.slug, error: errorMsg, rawResponse: data };
      }

      // Prefer LR if returned synchronously, otherwise use JOB: prefix as placeholder.
      const awb = lrn || `JOB:${jobId}`;
      const providerOrderId = jobId || lrn;

      this.log(
        "info",
        `Manifest accepted for ${params.orderId} — ${lrn ? `LR=${lrn}` : `JobID=${jobId} (LR/AWB will arrive via webhook)`}, boxes=${waybills.length} (${Date.now() - start}ms)`,
      );

      return {
        success: true,
        accountId: this.account.id, provider: this.slug,
        awb,
        providerOrderId,
        rawResponse: data,
      };
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      this.log("error", `createOrder FAILED — ${this.formatError(err)} (${Date.now() - start}ms)`);
      return { success: false, accountId: this.account.id, provider: this.slug, error: this.formatError(err) };
    }
  }

  // ── Tracking ───────────────────────────────────────────────────

  /**
   * Track a B2B shipment by LR number.
   * Note: AWB stored on the order may be `JOB:<jobId>` (placeholder) until
   * the webhook callback resolves it. In that case, tracking returns null
   * until the LR is provisioned.
   */
  async trackOrder(awb: string): Promise<Record<string, unknown> | null> {
    if (awb.startsWith("JOB:")) {
      this.log("info", `Skipping track for placeholder ${awb} — awaiting webhook callback`);
      return null;
    }

    try {
      const headers = await this.authHeader();
      if (!headers) return null;

      const { data } = await axios.get(externalUrls.delhiveryB2b.lrTrack, {
        params: { lrnum: awb, all_wbns: false },
        headers,
        timeout: HTTP_TIMEOUT_SHORT,
      });

      return data as Record<string, unknown>;
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      this.log("error", `Track FAILED for LR=${awb} — ${this.formatError(err)}`);
      return null;
    }
  }

  // ── Pickup request ─────────────────────────────────────────────

  async requestPickup(
    awb: string,
    params: { pickupDate?: string; pickupTime?: string; expectedPackageCount?: number },
  ): Promise<{ success: boolean; error?: string; pickupId?: string }> {
    try {
      const headers = await this.authHeader();
      if (!headers) return { success: false, error: "Auth failed" };

      const creds = await this.getCredentials("b2b");
      const clientWarehouse = creds?.clientWarehouse;
      if (!clientWarehouse) {
        return { success: false, error: "clientWarehouse not configured in B2B credentials" };
      }

      const pickupDate = params.pickupDate || new Date().toISOString().split("T")[0];
      // Delhivery B2B accepts HH:MM:SS, default to 10:00:00 (consistent with our default)
      const startTime = (params.pickupTime || "10:00").length === 5
        ? `${params.pickupTime || "10:00"}:00`
        : (params.pickupTime || "10:00:00");

      const { data } = await axios.post(
        externalUrls.delhiveryB2b.pickupRequest,
        {
          client_warehouse: clientWarehouse,
          pickup_date: pickupDate,
          start_time: startTime,
          expected_package_count: Math.max(1, params.expectedPackageCount ?? 1),
        },
        { headers: { ...headers, "Content-Type": "application/json" }, timeout: HTTP_TIMEOUT_MEDIUM },
      );

      this.log("info", `Pickup requested for AWB=${awb} on ${pickupDate} ${startTime} (pur_id: ${data?.pur_id || "?"})`);
      return { success: true, pickupId: data?.pur_id ? String(data.pur_id) : undefined };
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      this.log("error", `Pickup request FAILED for AWB=${awb} — ${this.formatError(err)}`);
      return { success: false, error: this.formatError(err) };
    }
  }

  /**
   * Cancel a pickup request by pur_id (NOT the LR — this cancels the pickup
   * appointment, not the shipment itself). LR cancellation requires a separate
   * endpoint that wasn't included in the docs we have; this method covers the
   * pickup-cancel case which is what most "cancel before pickup" flows hit.
   */
  async cancelOrder(awb: string): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = await this.authHeader();
      if (!headers) return { success: false, error: "Auth failed" };

      // For now, we only support pickup cancellation. Full LR cancellation
      // requires the LR cancel endpoint (not yet documented in our copy of the
      // spec). When that endpoint becomes available, branch on awb.startsWith("PUR:")
      // vs an actual LR number.
      if (!awb.startsWith("PUR:")) {
        this.log("warn", `LR cancel API not yet integrated — cannot cancel LR=${awb}. Use Delhivery panel.`);
        return { success: false, error: "LR cancellation must be done via Delhivery panel until cancel API is wired up" };
      }

      const purId = awb.replace(/^PUR:/, "");
      await axios.delete(`${externalUrls.delhiveryB2b.pickupRequest}/${purId}`, {
        headers,
        timeout: HTTP_TIMEOUT_MEDIUM,
      });

      this.log("info", `Pickup ${purId} cancelled`);
      return { success: true };
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      this.log("error", `Cancel FAILED for ${awb} — ${this.formatError(err)}`);
      return { success: false, error: this.formatError(err) };
    }
  }
}
