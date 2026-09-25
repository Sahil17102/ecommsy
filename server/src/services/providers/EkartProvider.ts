import { BaseProvider, axios } from "./BaseProvider.js";
import type { ServiceabilityParams, ServiceabilityResult, OrderCreationParams, OrderCreationResult } from "../../types/provider.js";
import { externalUrls } from "../../config/externalUrls.js";
import { HTTP_TIMEOUT_SHORT, HTTP_TIMEOUT_MEDIUM } from "../../config/constants.js";

/** Ekart auth tokens are valid for 20 hours */
const TOKEN_TTL_MS = 20 * 60 * 60 * 1000;

export class EkartProvider extends BaseProvider {
  get displayName(): string {
    return `Ekart:${this.accountName}`;
  }

  private async getAccessToken(): Promise<string | null> {
    const cached = this.getCachedToken();
    if (cached) return cached;

    const creds = await this.getCredentials();
    const clientId = creds?.clientId || creds?.accessToken || process.env.EKART_CLIENT_ID;
    const username = creds?.username || process.env.EKART_USERNAME;
    const password = creds?.password || process.env.EKART_PASSWORD;
    if (!clientId) {
      this.log("warn", "No client ID found in DB or EKART_CLIENT_ID env var");
      return null;
    }
    if (!username || !password) {
      this.log("warn", "No username/password found in DB or env vars");
      return null;
    }

    try {
      this.log("info", `Fetching auth token for client ${clientId}`);
      const { data } = await axios.post(
        `${externalUrls.ekart.authUrl}/${clientId}`,
        { username, password },
        { timeout: HTTP_TIMEOUT_SHORT },
      );

      const token = data?.token || data?.data?.token || data?.access_token;
      if (!token) {
        this.log("warn", `Auth response has no token — ${JSON.stringify(data)}`);
        return null;
      }

      this.setCachedToken(token, TOKEN_TTL_MS);
      this.log("info", "Auth token obtained and cached");
      return token;
    } catch (err) {
      this.log("error", `Auth token fetch FAILED — ${this.formatError(err)}`);
      return null;
    }
  }

  async trackOrder(awb: string): Promise<Record<string, unknown> | null> {
    try {
      const token = await this.getAccessToken();
      if (!token) return null;

      const { data } = await axios.get(`${externalUrls.ekart.tracking}/${awb}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: HTTP_TIMEOUT_MEDIUM,
      });
      return data ?? null;
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      this.log("error", `Track FAILED for AWB=${awb} — ${this.formatError(err)}`);
      return null;
    }
  }

  /**
   * Cancel an Ekart shipment via Elite API (DELETE /api/v1/package/cancel).
   */
  async cancelOrder(awb: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAccessToken();
      if (!token) return { success: false, error: "No token available" };

      const { data } = await axios.delete(externalUrls.ekart.cancelOrder, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        data: { tracking_id: awb },
        timeout: HTTP_TIMEOUT_MEDIUM,
      });

      if (data?.status === false) {
        const errorMsg = data?.description ?? data?.remark ?? data?.message ?? "Cancellation rejected by Ekart";
        this.log("warn", `Ekart rejected cancel for AWB=${awb} — ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      this.log("info", `Order cancelled on Ekart — AWB: ${awb}`);
      return { success: true };
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      this.log("error", `Cancel FAILED for AWB=${awb} — ${this.formatError(err)}`);
      return { success: false, error: this.formatError(err) };
    }
  }

  /**
   * Take NDR action via Elite API (POST /api/v2/package/ndr).
   */
  async ndrAction(
    awb: string,
    params: { action: string; rescheduledDate?: string; updatedPhone?: string; updatedAddress?: string },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAccessToken();
      if (!token) return { success: false, error: "No token available" };

      const payload: Record<string, unknown> = {
        tracking_id: awb,
        action: params.action,
      };
      if (params.rescheduledDate) payload.rescheduled_date = params.rescheduledDate;
      if (params.updatedPhone) payload.phone = params.updatedPhone;
      if (params.updatedAddress) payload.address = params.updatedAddress;

      const { data } = await axios.post(externalUrls.ekart.ndrAction, payload, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: HTTP_TIMEOUT_MEDIUM,
      });

      if (data?.status === false) {
        const errorMsg = data?.description ?? data?.remark ?? data?.message ?? "NDR action failed";
        this.log("warn", `Ekart NDR action failed for AWB=${awb} — ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      this.log("info", `NDR action "${params.action}" taken for AWB=${awb}`);
      return { success: true };
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      this.log("error", `NDR action FAILED for AWB=${awb} — ${this.formatError(err)}`);
      return { success: false, error: this.formatError(err) };
    }
  }

  async checkServiceability(params: ServiceabilityParams): Promise<ServiceabilityResult> {
    const start = Date.now();

    try {
      const token = await this.getAccessToken();
      if (!token) {
        this.log("warn", "No token available — marking not serviceable");
        return { accountId: this.account.id, provider: this.slug, serviceable: false };
      }

      this.log("info", `Checking pincode serviceability for ${params.destination}`);

      const { data } = await axios.get(`${externalUrls.ekart.serviceability}/${params.destination}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: HTTP_TIMEOUT_SHORT,
      });

      const serviceable = data?.status === true;
      const codSupported = data?.details?.cod === true;
      const city = data?.details?.city || "unknown";

      if (serviceable && params.paymentType === "cod" && !codSupported) {
        this.log("info", `Pincode ${params.destination} serviceable but COD NOT supported — marking not serviceable (${Date.now() - start}ms)`);
        return { accountId: this.account.id, provider: this.slug, serviceable: false };
      }

      this.log("info", `Pincode ${params.destination} → ${serviceable ? "SERVICEABLE" : "NOT SERVICEABLE"} (city: ${city}, cod: ${codSupported}) (${Date.now() - start}ms)`);
      return { accountId: this.account.id, provider: this.slug, serviceable };
    } catch (err) {
      if (this.isUnauthorized(err)) {
        this.clearCachedToken();
        this.log("warn", "401 — cleared cached token");
      }
      this.log("error", `Serviceability check FAILED — ${this.formatError(err)} (${Date.now() - start}ms)`);
      return { accountId: this.account.id, provider: this.slug, serviceable: false };
    }
  }

  async registerPickupAddress(params: {
    alias: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    pincode: string;
    city: string;
    state: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<{ success: boolean; alias?: string; error?: string }> {
    const token = await this.getAccessToken();
    if (!token) return { success: false, error: "No token available" };

    const payload = {
      alias: params.alias,
      phone: parseInt(params.phone.replace(/\D/g, "").slice(-10) || "0", 10) || 1000000000,
      address_line1: params.addressLine1,
      address_line2: params.addressLine2 || "",
      pincode: parseInt(params.pincode, 10) || 0,
      city: params.city,
      state: params.state,
      country: params.country || "India",
      geo: {
        lat: params.latitude ?? 0,
        lon: params.longitude ?? 0,
      },
    };

    try {
      const { data } = await axios.post(externalUrls.ekart.createPickupAddress, payload, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: HTTP_TIMEOUT_MEDIUM,
      });

      if (data?.status === true) {
        return { success: true, alias: data.alias };
      }

      const errorMsg = data?.remark ?? data?.message ?? "Registration failed";
      this.log("warn", `Pickup address registration failed — ${errorMsg}`);
      return { success: false, error: errorMsg };
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      this.log("error", `registerPickupAddress FAILED — ${this.formatError(err)}`);
      return { success: false, error: this.formatError(err) };
    }
  }

  async createOrder(params: OrderCreationParams): Promise<OrderCreationResult> {
    const start = Date.now();

    try {
      const token = await this.getAccessToken();
      if (!token) {
        return { success: false, accountId: this.account.id, provider: this.slug, error: "No token available" };
      }

      const creds = await this.getCredentials();
      const sellerName = creds?.sellerName ?? creds?.seller_name ?? "";
      const sellerAddress = (creds?.sellerAddress ?? creds?.seller_address ?? [params.pickup.addressLine1, params.pickup.addressLine2].filter(Boolean).join(", ")) || "";
      const sellerGstTin = creds?.sellerGstTin ?? creds?.seller_gst_tin ?? "";
      const templateName = creds?.templateName ?? creds?.template_name ?? process.env.EKART_TEMPLATE_NAME ?? "";

      const isCod = params.paymentType === "cod";
      const isB2b = params.orderType === "B2B";

      // For B2B, prefer summed multi-package weight (kg). For B2C, the
      // top-level weight (grams) is the source of truth.
      const weightKg = isB2b && params.packages && params.packages.length > 0
        ? params.packages.reduce((sum, p) => sum + p.weight, 0)
        : params.weight / 1000;
      const totalQty = params.products.reduce((sum, p) => sum + p.quantity, 0);

      // preferred_dispatch_date must be tomorrow or later (Ekart rejects today/past dates)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);
      const dispatchDate = params.preferredPickupDate && params.preferredPickupDate > new Date().toISOString().slice(0, 10)
        ? params.preferredPickupDate
        : tomorrowStr;

      // Ekart: use either templateName (pre-defined packaging in dashboard) OR length/width/height, not both
      const useTemplate = Boolean(templateName);

      const dropLocation = {
        location_type: "Office" as const,
        address: [params.delivery.addressLine1, params.delivery.addressLine2].filter(Boolean).join(", ") || " ",
        city: params.delivery.city,
        state: params.delivery.state,
        country: params.delivery.country || "India",
        name: params.delivery.name,
        phone: parseInt(params.delivery.phone.replace(/\D/g, "").slice(-10) || "0", 10) || 1000000000,
        pin: parseInt(params.delivery.pincode, 10) || 0,
      };

      const pickupLocation = {
        location_type: "Office" as const,
        address: [params.pickup.addressLine1, params.pickup.addressLine2].filter(Boolean).join(", ") || " ",
        city: params.pickup.city,
        state: params.pickup.state,
        country: params.pickup.country || "India",
        name: params.pickup.contactName,
        phone: parseInt(params.pickup.phone.replace(/\D/g, "").slice(-10) || "0", 10) || 1000000000,
        pin: parseInt(params.pickup.pincode, 10) || 0,
      };

      const returnLocation = params.rtoAddress
        ? {
          location_type: "Office" as const,
          address: [params.rtoAddress.addressLine1, params.rtoAddress.addressLine2].filter(Boolean).join(", ") || " ",
          city: params.rtoAddress.city,
          state: params.rtoAddress.state,
          country: params.rtoAddress.country || "India",
          name: params.rtoAddress.contactName,
          phone: parseInt(params.rtoAddress.phone.replace(/\D/g, "").slice(-10) || "0", 10) || 1000000000,
          pin: parseInt(params.rtoAddress.pincode, 10) || 0,
        }
        : pickupLocation;

      // ── B2B-specific fields ──
      // Ekart Elite uses the SAME create endpoint for B2C and B2B (large
      // shipments are auto-routed by weight + mps flag). For B2B we:
      //   - set mps: true when the order has > 1 package
      //   - use real invoice_number from params.invoices[0] (not orderId fallback)
      //   - distribute package dimensions across items
      //   - use buyer's GSTIN as consignee_gst_tin
      const primaryInvoice = isB2b ? params.invoices?.[0] : undefined;
      const invoiceNumber = primaryInvoice?.invoiceNumber || params.orderId;
      const invoiceDate = primaryInvoice?.invoiceDate || params.orderDate;
      const ewbn = primaryInvoice?.ebn || "";
      const useMps = isB2b && (params.packages?.length ?? 0) > 1;

      // For B2B with multiple packages, weight at top-level is ignored; per-item
      // weights are used. Distribute total weight evenly across items if no
      // per-package mapping is available.
      const buildItems = () => {
        if (useMps && params.packages && params.packages.length > 0) {
          // One item per package (treats each box as a self-contained shipment unit).
          const productNamesJoined = params.products.map((p) => p.name).join(", ") || "Goods";
          return params.packages.map((pkg, i) => ({
            product_name: productNamesJoined.slice(0, 50),
            sku: pkg.boxId || `BOX-${i + 1}`,
            taxable_value: Math.round(params.orderAmount / params.packages!.length),
            description: productNamesJoined,
            quantity: 1,
            length: pkg.length,
            height: pkg.height,
            breadth: pkg.breadth,
            weight: Math.round(pkg.weight * 1000), // grams per item
            hsn_code: params.products[0]?.hsn || "",
            cgst_tax_value: 0,
            sgst_tax_value: 0,
            igst_tax_value: 0,
          }));
        }
        return params.products.map((p, i) => ({
          product_name: p.name,
          sku: `SKU-${i + 1}`,
          taxable_value: p.unitPrice * p.quantity,
          description: p.name,
          quantity: p.quantity,
          length: 0,
          height: 0,
          breadth: 0,
          weight: 0,
          hsn_code: p.hsn,
          cgst_tax_value: 0,
          sgst_tax_value: 0,
          igst_tax_value: 0,
        }));
      };

      const payload = {
        seller_name: sellerName,
        seller_address: sellerAddress,
        seller_gst_tin: sellerGstTin,
        seller_gst_amount: 0,
        consignee_gst_amount: 0,
        integrated_gst_amount: 0,
        ...(ewbn ? { ewbn } : {}),
        order_number: params.orderId,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        consignee_gst_tin: isB2b ? (params.companyGst || "") : "",
        consignee_name: params.delivery.name,
        products_desc: params.products.map((p) => p.name).join(", ") || "Product",
        payment_mode: isCod ? "COD" : "Prepaid",
        category_of_goods: "General",
        hsn_code: params.products[0]?.hsn,
        total_amount: params.orderAmount,
        tax_value: 0,
        taxable_amount: params.orderAmount,
        commodity_value: String(params.orderAmount),
        cod_amount: isCod ? params.codAmount : 0,
        quantity: totalQty,
        // For MPS B2B, top-level LWH is ignored — per-item dims are used instead.
        ...(useMps ? {} : (useTemplate ? { templateName } : { length: params.length, height: params.height, width: params.breadth })),
        weight: weightKg,
        return_reason: "",
        drop_location: dropLocation,
        pickup_location: pickupLocation,
        return_location: returnLocation,
        preferred_dispatch_date: dispatchDate,
        delayed_dispatch: false,
        obd_shipment: false,
        mps: useMps,
        items: buildItems(),
        what3words_address: "",
      };

      if (isB2b) {
        this.log("info", `Creating B2B shipment ${params.orderId} — mps=${useMps} boxes=${params.packages?.length || 1} weight=${weightKg}kg`);
      }

      const { data } = await axios.put(externalUrls.ekart.createOrder, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: HTTP_TIMEOUT_MEDIUM,
      });

      // Response: { status: true, remark, tracking_id, vendor, barcodes: { wbn, order, cod } }
      const isSuccess = data?.status === true;
      const awb = data?.tracking_id ?? data?.barcodes?.wbn;
      const providerOrderId = data?.barcodes?.order ?? data?.tracking_id ?? params.orderId;

      if (!isSuccess) {
        const errorMsg = data?.description ?? data?.remark ?? data?.message ?? data?.error ?? "Order creation failed";
        this.log("warn", `Order creation failed for ${params.orderId} — ${errorMsg} (${Date.now() - start}ms)`);
        return { success: false, accountId: this.account.id, provider: this.slug, error: errorMsg, rawResponse: data };
      }

      this.log("info", `Order ${params.orderId} created — AWB: ${awb ?? providerOrderId} (${Date.now() - start}ms)`);
      return {
        success: true,
        accountId: this.account.id, provider: this.slug,
        ...(awb && { awb }),
        providerOrderId: String(providerOrderId),
        rawResponse: data,
      };
    } catch (err) {
      if (this.isUnauthorized(err)) {
        this.clearCachedToken();
        this.log("warn", "401 — cleared cached token during order creation");
      }
      this.log("error", `Order creation FAILED — ${this.formatError(err)} (${Date.now() - start}ms)`);
      return { success: false, accountId: this.account.id, provider: this.slug, error: this.formatError(err) };
    }
  }

}
