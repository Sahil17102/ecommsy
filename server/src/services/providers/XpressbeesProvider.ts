import { BaseProvider, axios } from "./BaseProvider.js";
import type { ServiceabilityParams, ServiceabilityResult, OrderCreationParams, OrderCreationResult } from "../../types/provider.js";
import { externalUrls } from "../../config/externalUrls.js";
import { HTTP_TIMEOUT_SHORT, HTTP_TIMEOUT_MEDIUM } from "../../config/constants.js";

/** Token TTL — Xpressbees franchise tokens expire in ~3 hours, refresh at 2.5h */
const TOKEN_TTL_MS = 2.5 * 60 * 60 * 1000;

export class XpressbeesProvider extends BaseProvider {
  get displayName(): string {
    return `Xpressbees:${this.accountName}`;
  }

  /**
   * Login via franchise_login and cache the JWT token.
   * Returns null if credentials are missing or login fails.
   */
  private async getToken(): Promise<string | null> {
    const cached = this.getCachedToken();
    if (cached) return cached;

    const creds = await this.getCredentials();
    if (!creds?.email || !creds?.password) {
      this.log("warn", "No email/password configured — cannot authenticate");
      return null;
    }

    try {
      const { data } = await axios.post(
        externalUrls.xpressbees.franchiseLogin,
        { email: creds.email, password: creds.password },
        { timeout: HTTP_TIMEOUT_SHORT },
      );

      if (!data.status || !data.data) {
        this.log("warn", `Login failed: ${data.message || "Unknown error"}`);
        return null;
      }

      const token = data.data as string;
      this.setCachedToken(token, TOKEN_TTL_MS);
      this.log("info", "JWT token obtained and cached");
      return token;
    } catch (err) {
      this.log("error", `Login request failed — ${this.formatError(err)}`);
      return null;
    }
  }

  /**
   * Uses the rate calculator endpoint as a serviceability check.
   * If the API returns `status: true`, the route is serviceable.
   * Empty body or `status: false` means not serviceable.
   */
  async requestPickup(
    awb: string,
    _params: { pickupDate?: string; pickupTime?: string },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getToken();
      if (!token) return { success: false, error: "No token available" };

      const { data } = await axios.post(
        externalUrls.xpressbees.pickupRequest,
        { awb_numbers: awb },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, timeout: HTTP_TIMEOUT_MEDIUM },
      );

      this.log("info", `Pickup request data: ${JSON.stringify(data, null, 2)}`);

      if (data?.status === false || data?.message === "Missing or invalid Token in request") {
        if (data?.message === "Missing or invalid Token in request") this.clearCachedToken();
        return { success: false, error: data?.message || "Pickup request failed" };
      }

      this.log("info", `Pickup requested — AWB: ${awb}`);
      return { success: true };
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      this.log("error", `Pickup request FAILED for AWB=${awb} — ${this.formatError(err)}`);
      return { success: false, error: this.formatError(err) };
    }
  }

  async ndrAction(
    awb: string,
    params: { action: string },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getToken();
      if (!token) return { success: false, error: "No token available" };

      const { data } = await axios.post(
        externalUrls.xpressbees.ndrCreate,
        { awb_number: awb, action: params.action === "reattempt" ? "RE-ATTEMPT" : "RTO" },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, timeout: HTTP_TIMEOUT_MEDIUM },
      );

      if (data?.status === false) {
        return { success: false, error: data?.message || "NDR action failed" };
      }

      this.log("info", `NDR action "${params.action}" taken for AWB=${awb}`);
      return { success: true };
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      this.log("error", `NDR action FAILED for AWB=${awb} — ${this.formatError(err)}`);
      return { success: false, error: this.formatError(err) };
    }
  }

  async trackOrder(awb: string): Promise<Record<string, unknown> | null> {
    try {
      const token = await this.getToken();
      if (!token) return null;

      const { data } = await axios.post(
        externalUrls.xpressbees.tracking,
        { awb_number: awb },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, timeout: HTTP_TIMEOUT_MEDIUM },
      );
      return (data ?? null) as Record<string, unknown> | null;
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      this.log("error", `Track FAILED for AWB=${awb} — ${this.formatError(err)}`);
      return null;
    }
  }

  async cancelOrder(awb: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getToken();
      if (!token) return { success: false, error: "No token available" };

      await axios.post(
        externalUrls.xpressbees.cancel,
        { awb_number: awb },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, timeout: HTTP_TIMEOUT_MEDIUM },
      );
      this.log("info", `Order cancelled — AWB: ${awb}`);
      return { success: true };
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      this.log("error", `Cancel FAILED for AWB=${awb} — ${this.formatError(err)}`);
      return { success: false, error: this.formatError(err) };
    }
  }

  async checkServiceability(params: ServiceabilityParams): Promise<ServiceabilityResult> {
    const start = Date.now();

    try {
      const token = await this.getToken();
      if (!token) {
        this.log("warn", "No token available — marking not serviceable");
        return { accountId: this.account.id, provider: this.slug, serviceable: false };
      }

      this.log("info", `Checking serviceability ${params.origin} → ${params.destination} (${params.paymentType})`);

      const isCod = params.paymentType === "cod";

      const body: Record<string, string> = {
        order_type_user: "ecom",
        origin: params.origin,
        destination: params.destination,
        cod: isCod ? "yes" : "no",
        weight: String(params.weight),
        length: String(params.length || 10),
        breadth: String(params.breadth || 10),
        height: String(params.height || 10),
      };

      if (isCod) {
        body.cod_amount = String(params.orderAmount || 0);
      }

      const { data } = await axios.post(
        externalUrls.xpressbees.calculatePricing,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: HTTP_TIMEOUT_SHORT,
        },
      );

      // Empty response or non-object = not serviceable
      if (!data || typeof data !== "object") {
        this.log("info", `${params.origin} → ${params.destination} → NOT SERVICEABLE (empty response) (${Date.now() - start}ms)`);
        return { accountId: this.account.id, provider: this.slug, serviceable: false };
      }

      const serviceable = data.status === true;

      // If 401/token expired, clear cache for next attempt
      if (data.message === "Missing or invalid Token in request") {
        this.clearCachedToken();
        this.log("warn", `Token expired — cleared cache (${Date.now() - start}ms)`);
        return { accountId: this.account.id, provider: this.slug, serviceable: false };
      }

      this.log(
        "info",
        `${params.origin} → ${params.destination} → ${serviceable ? "SERVICEABLE" : "NOT SERVICEABLE"} (${Date.now() - start}ms)`,
      );
      return { accountId: this.account.id, provider: this.slug, serviceable };
    } catch (err) {
      if (this.isUnauthorized(err)) {
        this.clearCachedToken();
        this.log("warn", `Token expired (401) — cleared cache (${Date.now() - start}ms)`);
      } else {
        this.log("error", `Serviceability check FAILED — ${this.formatError(err)} (${Date.now() - start}ms)`);
      }
      return { accountId: this.account.id, provider: this.slug, serviceable: false };
    }
  }

  async createOrder(params: OrderCreationParams): Promise<OrderCreationResult> {
    const start = Date.now();

    try {
      const token = await this.getToken();
      if (!token) {
        this.log("error", `[createOrder] No token available — aborting`);
        return { success: false, accountId: this.account.id, provider: this.slug, error: "No token available" };
      }

      this.log("info", `[createOrder] ========== START ==========`);
      this.log("info", `[createOrder] orderId: ${params.orderId}`);

      const isCod = params.paymentType === "cod";
      const consignerAddress = [params.pickup.addressLine1, params.pickup.addressLine2].filter(Boolean).join(", ");
      const consigneeAddress = [params.delivery.addressLine1, params.delivery.addressLine2].filter(Boolean).join(", ");

      // Xpressbees API expects consigner_* (sender), consignee_* (receiver), string values, and pickup_location in [franchise,customer]
      const payload = {
        id: params.orderId,
        payment_method: isCod ? "COD" : "prepaid",
        // Consigner (pickup / sender)
        consigner_name: params.pickup.contactName,
        consigner_phone: params.pickup.phone,
        consigner_pincode: params.pickup.pincode,
        consigner_city: params.pickup.city,
        consigner_state: params.pickup.state,
        consigner_address: consignerAddress,
        consigner_gst_number: "",
        // Consignee (delivery / receiver)
        consignee_name: params.delivery.name,
        consignee_phone: params.delivery.phone,
        consignee_pincode: params.delivery.pincode,
        consignee_city: params.delivery.city,
        consignee_state: params.delivery.state,
        consignee_address: consigneeAddress,
        consignee_gst_number: "",
        // Products array
        products: params.products.map((p) => ({
          product_name: p.name,
          product_qty: String(p.quantity),
          product_price: String(p.unitPrice),
          product_tax_per: p.taxRate != null ? String(p.taxRate) : "",
          product_sku: p.name,
          product_hsn: p.hsn || "3004",
        })),
        invoice: [ //*empty for b2c
          {
            invoice_number: "",
            invoice_date: "",
            ebill_number: "",
            ebill_expiry_date: "",
          },
        ],
        weight: String(params.weight),
        length: String(params.length),
        height: String(params.height),
        breadth: String(params.breadth),
        courier_id: String(params.metaData?.franchiseCourierId ?? "13826"),
        pickup_location: "customer", //!harshita please verify this
        shipping_charges: params.shippingCharges != null ? String(params.shippingCharges) : "",
        cod_charges: params.codCharges != null ? String(params.codCharges) : "",
        discount: params.discount != null ? String(params.discount) : "",
        order_amount: String(params.orderAmount),
        collectable_amount: String(isCod ? params.codAmount : 0),
      };

      this.log("info", `[createOrder] payload: ${JSON.stringify(payload, null, 2)}`);

      const { data } = await axios.post(externalUrls.xpressbees.createOrder, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: HTTP_TIMEOUT_MEDIUM,
      });

      this.log("info", `[createOrder] data: ${JSON.stringify(data, null, 2)}`);

      // Xpressbees returns { response: true, message: "booked", awb_number, shipping_id, label }
      const isSuccess = data?.response === true || data?.status === true;
      const awb = data?.awb_number || data?.data?.awb_number;

      if (!isSuccess || !awb) {
        const errorMsg = data?.message || data?.error || "Order creation failed";
        this.log("warn", `Order creation failed for ${params.orderId} — ${errorMsg} (${Date.now() - start}ms)`);
        if (data?.message === "Missing or invalid Token in request") {
          this.clearCachedToken();
        }
        return { success: false, accountId: this.account.id, provider: this.slug, error: errorMsg, rawResponse: data };
      }

      this.log("info", `Order ${params.orderId} created — AWB: ${awb} (${Date.now() - start}ms)`);
      return {
        success: true,
        accountId: this.account.id, provider: this.slug,
        awb: String(awb),
        providerOrderId: String(data?.shipping_id || data?.data?.order_id || params.orderId),

        rawResponse: data,
      };
    } catch (err) {
      if (this.isUnauthorized(err)) {
        this.clearCachedToken();
        this.log("warn", `[createOrder] Token expired (401) — cleared cache`);
      }
      const axiosResponse = (err as any)?.response;
      this.log("error", `[createOrder] error response body: ${JSON.stringify(axiosResponse?.data ?? null, null, 2)}`);
      return { success: false, accountId: this.account.id, provider: this.slug, error: this.formatError(err) };
    }
  }
}
