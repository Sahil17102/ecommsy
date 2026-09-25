import { BaseProvider, axios } from "./BaseProvider.js";
import type {
  ServiceabilityParams,
  ServiceabilityResult,
  OrderCreationParams,
  OrderCreationResult,
} from "../../types/provider.js";
import { externalUrls } from "../../config/externalUrls.js";
import { HTTP_TIMEOUT_SHORT, HTTP_TIMEOUT_MEDIUM } from "../../config/constants.js";

/** Token TTL — Xpressbees franchise tokens expire in ~3 hours, refresh at 2.5h */
const TOKEN_TTL_MS = 2.5 * 60 * 60 * 1000;

/**
 * Xpressbees B2B (Franchise B2B custom API) provider.
 *
 * Distinct from `XpressbeesProvider` (B2C franchise API) — uses the same
 * franchise_login auth flow and the same tracking/pickup endpoints, but the
 * shipment-create and shipment-cancel endpoints are entirely different:
 *
 *   B2C: POST /api/franchise/shipments/         + POST /api/franchise/shipments/cancel_shipment
 *   B2B: POST /api/b2b/shipments                + POST /api/b2b/shipments/cancel_shipment
 *
 * The B2B payload schema is also different — it expects per-product LWH +
 * weight, an `invoice` array, and `no_of_invoices` / `no_of_boxes` counts.
 *
 * Reference (Postman): https://documenter.getpostman.com/view/25714726/2sB3WsNeuv
 */
export class XpressbeesB2bProvider extends BaseProvider {
  get displayName(): string {
    return `Xpressbees B2B:${this.accountName}`;
  }

  private async getToken(): Promise<string | null> {
    const cached = this.getCachedToken();
    if (cached) return cached;

    // B2B may use the same franchise creds; getCredentials("b2b") will fall
    // back to B2C if `sameAsB2c` is set or B2B values are empty.
    const creds = await this.getCredentials("b2b");
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
   * Serviceability — Xpressbees doesn't expose a separate B2B serviceability
   * endpoint in the public docs. We delegate to the B2C rate calculator,
   * which works for both flows since pincodes are shared across networks.
   */
  async checkServiceability(params: ServiceabilityParams): Promise<ServiceabilityResult> {
    const start = Date.now();
    try {
      const token = await this.getToken();
      if (!token) return { accountId: this.account.id, provider: this.slug, serviceable: false };

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
      if (isCod) body.cod_amount = String(params.orderAmount || 0);

      const { data } = await axios.post(externalUrls.xpressbees.calculatePricing, body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: HTTP_TIMEOUT_SHORT,
      });

      const serviceable = data?.status === true;
      this.log("info", `${params.origin} → ${params.destination} → ${serviceable ? "SERVICEABLE" : "NOT"} (${Date.now() - start}ms)`);
      return { accountId: this.account.id, provider: this.slug, serviceable };
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      this.log("error", `Serviceability FAILED — ${this.formatError(err)} (${Date.now() - start}ms)`);
      return { accountId: this.account.id, provider: this.slug, serviceable: false };
    }
  }

  /**
   * Create a B2B shipment.
   *
   * Per Postman spec, the B2B payload has these required fields:
   *   id, payment_method, consigner_*, consignee_*, weight (kg), courier_id,
   *   pickup_location, order_amount, no_of_invoices, no_of_boxes,
   *   global_weight_unit, products[], invoice[]
   *
   * `weight` here is in KG (B2C uses grams) — confirmed by example payload
   * weight=100 with global_weight_unit=kg.
   */
  async createOrder(params: OrderCreationParams): Promise<OrderCreationResult> {
    const start = Date.now();

    try {
      const token = await this.getToken();
      if (!token) {
        return { success: false, accountId: this.account.id, provider: this.slug, error: "No token available" };
      }

      const isCod = params.paymentType === "cod";

      // Total weight: prefer summed package weights (already in kg), fall back
      // to top-level weight (grams) converted to kg.
      const weightKg = params.packages && params.packages.length > 0
        ? params.packages.reduce((sum, p) => sum + p.weight, 0)
        : (params.weight || 0) / 1000;

      const consignerAddress = [params.pickup.addressLine1, params.pickup.addressLine2].filter(Boolean).join(", ");
      const consigneeAddress = [params.delivery.addressLine1, params.delivery.addressLine2].filter(Boolean).join(", ");

      // Products array — B2B expects per-product dimensions + tax. Distribute
      // the order's box dimensions across products if package-level dims aren't
      // available (single shared LWH for all products is acceptable per spec).
      const productDims = params.packages?.[0] ?? {
        length: params.length,
        breadth: params.breadth,
        height: params.height,
      };

      const products = params.products.map((p) => ({
        product_name: p.name,
        product_qty: p.quantity,
        product_hsn_code: p.hsn || "",
        product_price: p.unitPrice,
        product_tax_per: p.taxRate ?? 0,
        product_lbh_unit: "cm",
        product_length: productDims.length,
        product_breadth: productDims.breadth,
        product_height: productDims.height,
      }));

      // Invoice array — required for B2B. Use real B2B invoices if present,
      // otherwise synthesize a single invoice from the order metadata.
      const invoice = params.invoices && params.invoices.length > 0
        ? params.invoices.map((inv) => ({
            invoice_number: inv.invoiceNumber,
            invoice_date: inv.invoiceDate,
            invoice_value: inv.invoiceValue,
            ebill_number: inv.ebn || "",
            ebill_expiry_date: inv.ebnExpiry || "",
          }))
        : [
            {
              invoice_number: params.orderId,
              invoice_date: params.orderDate,
              invoice_value: params.orderAmount,
              ebill_number: "",
              ebill_expiry_date: "",
            },
          ];

      const payload = {
        id: params.orderId,
        payment_method: isCod ? "cod" : "prepaid",

        // Consigner (pickup / sender)
        consigner_name: params.pickup.contactName,
        consigner_phone: params.pickup.phone.replace(/\D/g, "").slice(-10),
        consigner_pincode: params.pickup.pincode,
        consigner_city: params.pickup.city,
        consigner_state: params.pickup.state,
        consigner_address: consignerAddress,
        // For B2B, consigner GST should ideally come from the seller's profile.
        // Falling back to companyGst (which is the buyer's) is wrong — leave empty
        // unless we have a dedicated seller GST credential.
        consigner_gst_number: "",

        // Consignee (delivery / receiver)
        consignee_name: params.delivery.name,
        consignee_phone: params.delivery.phone.replace(/\D/g, "").slice(-10),
        consignee_pincode: params.delivery.pincode,
        consignee_city: params.delivery.city,
        consignee_state: params.delivery.state,
        consignee_address: consigneeAddress,
        consignee_gst_number: params.companyGst || "",

        weight: weightKg,
        courier_id: String(params.metaData?.franchiseCourierId ?? params.metaData?.courierId ?? "12671"),
        pickup_location: "customer",
        order_amount: params.orderAmount,
        no_of_invoices: invoice.length,
        no_of_boxes: params.packages?.length || 1,
        global_weight_unit: "kg",
        products,
        invoice,
        ...(isCod && { cod_amount: params.codAmount }),
      };

      this.log("info", `Creating B2B shipment ${params.orderId} → ${params.delivery.pincode} weight=${weightKg}kg boxes=${payload.no_of_boxes}`);

      const { data } = await axios.post(externalUrls.xpressbees.createB2bOrder, payload, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: HTTP_TIMEOUT_MEDIUM,
      });

      // Response shape mirrors B2C: { status/response, awb_number, shipping_id, message }
      const isSuccess = data?.status === true || data?.response === true;
      const awb = data?.awb_number || data?.data?.awb_number;

      if (!isSuccess || !awb) {
        const errorMsg = data?.message || data?.error || "B2B order creation failed";
        this.log("warn", `Create B2B FAILED for ${params.orderId} — ${errorMsg} (${Date.now() - start}ms)`);
        if (data?.message === "Missing or invalid Token in request") this.clearCachedToken();
        return { success: false, accountId: this.account.id, provider: this.slug, error: errorMsg, rawResponse: data };
      }

      this.log("info", `B2B order ${params.orderId} created — AWB: ${awb} (${Date.now() - start}ms)`);
      return {
        success: true,
        accountId: this.account.id, provider: this.slug,
        awb: String(awb),
        providerOrderId: String(data?.shipping_id || data?.data?.order_id || params.orderId),
        rawResponse: data,
      };
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      this.log("error", `Create B2B FAILED — ${this.formatError(err)} (${Date.now() - start}ms)`);
      return { success: false, accountId: this.account.id, provider: this.slug, error: this.formatError(err) };
    }
  }

  // ── Tracking, pickup, cancel ────────────────────────────────────
  // Tracking and pickup use the SAME endpoints as B2C (unified franchise API),
  // so we just call them via the shared URL config.

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

  async requestPickup(
    awb: string,
    _params: { pickupDate?: string; pickupTime?: string },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getToken();
      if (!token) return { success: false, error: "No token available" };

      // Pickup endpoint uses awb_numbers (note plural in B2B docs — Postman
      // shows the same field name even for single AWBs).
      await axios.post(
        externalUrls.xpressbees.pickupRequest,
        { awb_numbers: awb },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, timeout: HTTP_TIMEOUT_MEDIUM },
      );

      this.log("info", `Pickup requested — AWB: ${awb}`);
      return { success: true };
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      this.log("error", `Pickup FAILED for AWB=${awb} — ${this.formatError(err)}`);
      return { success: false, error: this.formatError(err) };
    }
  }

  async cancelOrder(awb: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getToken();
      if (!token) return { success: false, error: "No token available" };

      const { data } = await axios.post(
        externalUrls.xpressbees.cancelB2bOrder,
        { awb_number: awb },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, timeout: HTTP_TIMEOUT_MEDIUM },
      );

      if (data?.status === false) {
        return { success: false, error: data?.message || "Cancel rejected by Xpressbees" };
      }

      this.log("info", `B2B order cancelled — AWB: ${awb}`);
      return { success: true };
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      this.log("error", `Cancel FAILED for AWB=${awb} — ${this.formatError(err)}`);
      return { success: false, error: this.formatError(err) };
    }
  }
}
