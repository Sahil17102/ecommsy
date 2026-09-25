import { BaseProvider, axios } from "./BaseProvider.js";
import type { ServiceabilityParams, ServiceabilityResult, OrderCreationParams, OrderCreationResult } from "../../types/provider.js";
import { externalUrls } from "../../config/externalUrls.js";
import { HTTP_TIMEOUT_MEDIUM, HTTP_TIMEOUT_EXTRA_LONG } from "../../config/constants.js";

/** Shipex auth tokens are valid for 20 hours */
const TOKEN_TTL_MS = 20 * 60 * 60 * 1000;

export class ShipexProvider extends BaseProvider {
  get displayName(): string {
    return `Shipex:${this.accountName}`;
  }

  private async getAccessToken(): Promise<string | null> {
    const cached = this.getCachedToken();
    if (cached) return cached;

    const creds = await this.getCredentials();
    if (!creds) return null;

    const { email, password } = creds;
    if (!email || !password) {
      this.log("warn", "No email/password configured — cannot generate token");
      return null;
    }

    try {
      this.log("info", "Generating Shipex access token");
      const { data } = await axios.post(
        externalUrls.shipex.generateToken,
        { email, password },
        {
          headers: { "Content-Type": "application/json" },
          timeout: HTTP_TIMEOUT_EXTRA_LONG,
        },
      );

      const token = data?.data?.token;
      if (!token) {
        this.log("warn", `generateToken response missing token — ${JSON.stringify(data)}`);
        return null;
      }

      this.setCachedToken(token, TOKEN_TTL_MS);
      this.log("info", "Token generated and cached");
      return token;
    } catch (err) {
      this.log("error", `Token generation FAILED — ${this.formatError(err)}`);
      return null;
    }
  }

  async trackOrder(awb: string): Promise<Record<string, unknown> | null> {
    try {
      const token = await this.getAccessToken();
      if (!token) return null;

      const { data } = await axios.post(
        externalUrls.shipex.trackOrder,
        { awb },
        {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          timeout: HTTP_TIMEOUT_MEDIUM,
        },
      );
      return data?.data ?? null;
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      this.log("error", `Track FAILED for AWB=${awb} — ${this.formatError(err)}`);
      return null;
    }
  }

  async cancelOrder(awb: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAccessToken();
      if (!token) return { success: false, error: "No token available" };

      await axios.post(
        `${externalUrls.shipex.cancelOrder}/${awb}`,
        {},
        { headers: { Authorization: `Bearer ${token}` }, timeout: HTTP_TIMEOUT_MEDIUM },
      );
      this.log("info", `Order cancelled — AWB: ${awb}`);
      return { success: true };
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      this.log("error", `Cancel FAILED for AWB=${awb} — ${this.formatError(err)}`);
      return { success: false, error: this.formatError(err) };
    }
  }

  async ndrAction(
    awb: string,
    params: { action: string },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAccessToken();
      if (!token) return { success: false, error: "No token available" };

      await axios.post(
        externalUrls.shipex.ndrAction,
        {
          awb_number: awb,
          action: params.action === "reattempt" ? "RE-ATTEMPT" : "RTO",
          comments: params.action,
        },
        { headers: { Authorization: `Bearer ${token}` }, timeout: HTTP_TIMEOUT_MEDIUM },
      );
      this.log("info", `NDR action "${params.action}" taken for AWB=${awb}`);
      return { success: true };
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      this.log("error", `NDR action FAILED for AWB=${awb} — ${this.formatError(err)}`);
      return { success: false, error: this.formatError(err) };
    }
  }

  async registerPickupAddress(params: {
    contactName: string;
    email: string;
    phone: string;
    address: string;
    pincode: string;
    city: string;
    state: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAccessToken();
      if (!token) return { success: false, error: "No token available" };

      const payload = {
        contactName: params.contactName,
        email: params.email,
        phoneNumber: params.phone.replace(/\D/g, "").slice(-10),
        address: params.address,
        pinCode: params.pincode,
        city: params.city,
        state: params.state,
      };

      const { data } = await axios.post(externalUrls.shipex.createPickupAddress, payload, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: HTTP_TIMEOUT_MEDIUM,
      });

      if (data?.success) {
        this.log("info", `Pickup address registered — ${params.contactName}`);
        return { success: true };
      }

      this.log("warn", `Pickup address registration failed — ${data?.message}`);
      return { success: false, error: data?.message || "Pickup address creation failed" };
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      this.log("error", `Pickup address registration FAILED — ${this.formatError(err)}`);
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

      const weightKg = params.weight / 1000;
      const payload = {
        pickUpPincode: params.origin,
        deliveryPincode: params.destination,
        applicableWeight: weightKg,
        length: params.length ?? 10,
        width: params.breadth ?? 10,
        height: params.height ?? 10,
        paymentType: params.paymentType === "cod" ? "COD" : "Prepaid",
        declaredValue: params.orderAmount ?? 0,
      };

      const { data } = await axios.post(externalUrls.shipex.serviceability, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        timeout: HTTP_TIMEOUT_EXTRA_LONG,
      });

      const rates = Array.isArray(data?.data) ? data.data : [];
      const serviceableRates = rates.filter((r: { serviceable: boolean }) => r.serviceable);
      const serviceable = serviceableRates.length > 0;

      const serviceableCouriers = serviceableRates.map(
        (r: { courierServiceName: string }) => r.courierServiceName,
      );

      this.log("info", `${params.origin} → ${params.destination} → ${serviceable ? "SERVICEABLE" : "NOT SERVICEABLE"} (${serviceableCouriers.length} couriers, ${Date.now() - start}ms)`);
      return { accountId: this.account.id, provider: this.slug, serviceable, serviceableCouriers };
    } catch (err) {
      if (this.isUnauthorized(err)) {
        this.clearCachedToken();
      }
      this.log("error", `Serviceability check FAILED — ${this.formatError(err)} (${Date.now() - start}ms)`);
      return { accountId: this.account.id, provider: this.slug, serviceable: false };
    }
  }

  /**
   * Resolves the ShipEx courierId for booking via their rate API.
   * Must be called after createOrder since the rate API requires an orderId.
   */
  private async resolveShipexCourierId(
    token: string,
    shipexOrderId: string,
    courierName: string,
  ): Promise<string | null> {
    const { data } = await axios.post(
      externalUrls.shipex.rateCalculate,
      { orderId: shipexOrderId },
      {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: HTTP_TIMEOUT_EXTRA_LONG,
      },
    );

    const rates = Array.isArray(data?.data) ? data.data : [];
    const match = rates.find(
      (r: { courierServiceName: string }) => r.courierServiceName.toLowerCase() === courierName.toLowerCase(),
    );

    if (match) {
      this.log("info", `Resolved courierId ${match.courierId} for "${courierName}"`);
    } else {
      this.log("warn", `Courier "${courierName}" not found in ${rates.length} available couriers`);
    }

    return match?.courierId ? String(match.courierId) : null;
  }

  /** Books a ShipEx order with the selected courier. Returns AWB on success. */
  private async bookOrder(
    token: string,
    shipexOrderId: string,
    courierServiceName: string,
    courierId: string,
  ): Promise<{ success: boolean; awb?: string; labelUrl?: string; error?: string; rawResponse?: unknown }> {
    const { data } = await axios.post(
      externalUrls.shipex.orderBooking,
      { orderId: shipexOrderId, courierServiceName, courierId },
      {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: HTTP_TIMEOUT_EXTRA_LONG,
      },
    );

    const resData = data?.data as Record<string, unknown> | undefined;
    if (data?.status === "success" && resData?.awb_number) {
      return {
        success: true,
        awb: resData.awb_number as string,
        labelUrl: resData.labelUrl as string | undefined,
        rawResponse: data,
      };
    }

    return {
      success: false,
      error: (data?.message as string) || "Order booking failed",
      rawResponse: data,
    };
  }

  async createOrder(params: OrderCreationParams): Promise<OrderCreationResult> {
    const start = Date.now();

    try {
      const token = await this.getAccessToken();
      if (!token) {
        return { success: false, accountId: this.account.id, provider: this.slug, error: "No token available" };
      }

      const courierServiceName = params.metaData?.courierName as string | undefined;
      if (!courierServiceName) {
        return { success: false, accountId: this.account.id, provider: this.slug, error: "Missing courierName in courier metaData" };
      }

      // ── Step 1: Create the order on ShipEx ──
      this.log("info", `Creating order ${params.orderId} → ${params.delivery.pincode} (${courierServiceName})`);

      const isCod = params.paymentType === "cod";
      const weightKg = params.weight / 1000;
      const volWeight = (params.length * params.breadth * params.height) / 5000;

      const createPayload = {
        shipmentId: Date.now(),
        pickupAddress: {
          contactName: params.pickup.contactName,
          email: params.delivery.email || "",
          phoneNumber: params.pickup.phone,
          address: [params.pickup.addressLine1, params.pickup.addressLine2].filter(Boolean).join(", "),
          pinCode: params.pickup.pincode,
          city: params.pickup.city,
          state: params.pickup.state,
        },
        receiverAddress: {
          contactName: params.delivery.name,
          email: params.delivery.email || "",
          phoneNumber: params.delivery.phone,
          address: [params.delivery.addressLine1, params.delivery.addressLine2].filter(Boolean).join(", "),
          pinCode: params.delivery.pincode,
          city: params.delivery.city,
          state: params.delivery.state,
        },
        productDetails: params.products.map((p, i) => ({
          id: String(i + 1),
          quantity: p.quantity,
          name: p.name,
          sku: p.hsn || `SKU-${i + 1}`,
          unitPrice: String(p.unitPrice),
        })),
        packageDetails: {
          deadWeight: weightKg,
          applicableWeight: Math.max(weightKg, volWeight),
          volumetricWeight: {
            length: params.length,
            width: params.breadth,
            height: params.height,
            calculatedWeight: volWeight,
          },
        },
        paymentDetails: {
          method: isCod ? "COD" : "Prepaid",
          amount: isCod ? params.codAmount : params.orderAmount,
        },
      };

      const { data: createData } = await axios.post(externalUrls.shipex.createOrder, createPayload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: HTTP_TIMEOUT_EXTRA_LONG,
      });

      const shipexOrderId = createData?.data?.orderId;
      if (!createData?.success || !shipexOrderId) {
        const errorMsg = createData?.message || createData?.error || "Order creation failed";
        this.log("warn", `Order creation failed for ${params.orderId} — ${errorMsg} (${Date.now() - start}ms)`);
        return { success: false, accountId: this.account.id, provider: this.slug, error: errorMsg, rawResponse: createData };
      }

      this.log("info", `ShipEx order ${shipexOrderId} created, resolving courierId for "${courierServiceName}"`);

      // ── Step 2: Resolve courierId from rate API ──
      const courierId = await this.resolveShipexCourierId(token, String(shipexOrderId), courierServiceName);
      if (!courierId) {
        this.cancelOrder(String(shipexOrderId)).catch(() => {});
        return {
          success: false,
          accountId: this.account.id, provider: this.slug,
          error: `Courier "${courierServiceName}" is not serviceable for this route. Please select a different courier.`,
        };
      }

      // ── Step 3: Book the order ──
      const bookingResult = await this.bookOrder(token, String(shipexOrderId), courierServiceName, courierId);

      if (!bookingResult.success || !bookingResult.awb) {
        this.log("warn", `Booking failed for order ${shipexOrderId} — ${bookingResult.error} (${Date.now() - start}ms)`);
        this.cancelOrder(String(shipexOrderId)).catch(() => {});
        return {
          success: false,
          accountId: this.account.id, provider: this.slug,
          error: bookingResult.error || "Order booking failed",
          rawResponse: bookingResult.rawResponse,
        };
      }

      this.log("info", `Order ${params.orderId} booked — AWB: ${bookingResult.awb} (${Date.now() - start}ms)`);
      return {
        success: true,
        accountId: this.account.id, provider: this.slug,
        awb: bookingResult.awb,
        providerOrderId: String(shipexOrderId),
        rawResponse: bookingResult.rawResponse,
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
