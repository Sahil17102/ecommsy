import { BaseProvider, axios } from "./BaseProvider.js";
import type {
  OrderCreationParams,
  OrderCreationResult,
  ServiceabilityParams,
  ServiceabilityResult,
} from "../../types/provider.js";
import { externalUrls } from "../../config/externalUrls.js";
import { HTTP_TIMEOUT_EXTRA_LONG, HTTP_TIMEOUT_MEDIUM } from "../../config/constants.js";

const TOKEN_TTL_MS = 14 * 60 * 1000;

type DreamzRateOption = {
  courierId?: string;
  id?: string;
  name?: string;
  serviceProvider?: string;
  serviceProviderDisplayName?: string;
  logo?: string | null;
  mode?: string;
  chargeableWeight?: number;
  minWeight?: number;
  zone?: { code?: string; name?: string };
  rate?: {
    forward?: number;
    rto?: number;
    codCharges?: number;
    otherCharges?: number;
    freightCharge?: number;
    totalCharge?: number;
    zone?: string;
  };
};

type DreamzPickupAddress = {
  id?: string;
  nickname?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  isPrimary?: boolean;
  isActive?: boolean;
};

export interface DreamzAvailableRate {
  externalCourierId: string;
  name: string;
  serviceProvider: string;
  serviceProviderDisplayName: string;
  logo: string | null;
  mode: "air" | "surface";
  zone: { code: string; name: string };
  chargeableWeight: number;
  minWeight: number;
  rate: {
    forward: number;
    rto: number;
    codCharges: number;
    otherCharges: number;
    freightCharge: number;
    totalCharge: number;
  };
}

export class DreamzProvider extends BaseProvider {
  get displayName(): string {
    return `Dreamz:${this.accountName}`;
  }

  private async getAccessToken(): Promise<string | null> {
    const cached = this.getCachedToken();
    if (cached) return cached;

    const creds = await this.getCredentials();
    const identifier = creds?.identifier || creds?.email || creds?.username;
    const password = creds?.password;
    if (!identifier || !password) {
      this.log("warn", "Missing identifier/password credentials");
      return null;
    }

    try {
      const { data } = await axios.post(
        externalUrls.dreamz.login,
        { identifier, password },
        { headers: { "Content-Type": "application/json" }, timeout: HTTP_TIMEOUT_MEDIUM },
      );
      const token = data?.accessToken;
      if (!token) {
        this.log("warn", "Login response did not include accessToken");
        return null;
      }
      this.setCachedToken(token, TOKEN_TTL_MS);
      return token;
    } catch (err) {
      this.log("error", `Login failed - ${this.formatError(err)}`);
      return null;
    }
  }

  private normalize(value: unknown): string {
    return String(value ?? "").trim().toLowerCase();
  }

  private resolveEmail(...values: Array<unknown>): string {
    for (const value of values) {
      const email = String(value ?? "").trim();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return email;
    }
    return "support@boxandbeyondservices.in";
  }

  private async resolvePickupAddressId(
    token: string,
    params: OrderCreationParams,
    creds: Record<string, string>,
  ): Promise<string | null> {
    const explicit =
      params.metaData?.dreamzPickupAddressId ??
      creds?.pickupAddressId;
    if (explicit) return String(explicit);

    const pickup = params.pickup;
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const { data } = await axios.get(externalUrls.dreamz.pickupAddresses, {
      headers,
      timeout: HTTP_TIMEOUT_MEDIUM,
    });
    const addresses = (Array.isArray(data?.addresses) ? data.addresses : []) as DreamzPickupAddress[];
    const active = addresses.filter((a) => a.id && a.isActive !== false);

    const samePincode = active.filter((a) => this.normalize(a.pincode) === this.normalize(pickup.pincode));
    const exact =
      samePincode.find((a) => this.normalize(a.nickname) === this.normalize(pickup.nickname)) ??
      samePincode.find(
        (a) =>
          this.normalize(a.addressLine1) === this.normalize(pickup.addressLine1) &&
          this.normalize(a.phone) === this.normalize(pickup.phone),
      ) ??
      samePincode.find((a) => a.isPrimary) ??
      samePincode[0];
    if (exact?.id) return exact.id;

    const payload = {
      nickname: pickup.nickname || pickup.contactName || `Box Beyond ${pickup.pincode}`,
      contactName: pickup.contactName || pickup.nickname || "Warehouse",
      phone: pickup.phone,
      email: this.resolveEmail(pickup.email, params.delivery.email, creds.email, creds.identifier, creds.username),
      role: "warehouse_manager",
      addressLine1: pickup.addressLine1,
      addressLine2: pickup.addressLine2,
      city: pickup.city,
      state: pickup.state,
      country: pickup.country || "India",
      pincode: pickup.pincode,
      addressType: "pickup",
      isSameAsRto: true,
      gstNumber: pickup.gstNumber,
    };

    const created = await axios.post(externalUrls.dreamz.pickupAddresses, payload, {
      headers,
      timeout: HTTP_TIMEOUT_EXTRA_LONG,
    });
    const address = created.data?.address ?? created.data?.data ?? created.data;
    return address?.id ? String(address.id) : null;
  }

  async checkServiceability(params: ServiceabilityParams): Promise<ServiceabilityResult> {
    try {
      const options = await this.getAvailableRates(params);
      return this.serviceabilityResult(options.length > 0, {
        serviceableCouriers: options.map((c) => c.name).filter(Boolean) as string[],
        serviceableCourierIds: options.map((c) => c.externalCourierId).filter(Boolean) as string[],
      });
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      this.log("error", `Serviceability failed - ${this.formatError(err)}`);
      return this.serviceabilityResult(false);
    }
  }

  async getAvailableRates(params: ServiceabilityParams): Promise<DreamzAvailableRate[]> {
    const token = await this.getAccessToken();
    if (!token) return [];

    const { data } = await axios.post(
      externalUrls.dreamz.ratesAvailable,
      {
        origin: params.origin,
        destination: params.destination,
        weight: params.weight,
        length: params.length,
        breadth: params.breadth,
        height: params.height,
        paymentType: params.paymentType,
        orderAmount: params.orderAmount,
        orderType: "B2C",
      },
      {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: HTTP_TIMEOUT_EXTRA_LONG,
      },
    );

    const options = Array.isArray(data?.data) ? (data.data as DreamzRateOption[]) : [];
    return options
      .map((option) => {
        const externalCourierId = String(option.courierId ?? option.id ?? "");
        const rate = option.rate ?? {};
        const mode: "air" | "surface" = String(option.mode ?? option.name ?? "").toLowerCase().includes("air") ? "air" : "surface";
        return {
          externalCourierId,
          name: option.name ?? externalCourierId,
          serviceProvider: option.serviceProvider ?? "dreamz",
          serviceProviderDisplayName: option.serviceProviderDisplayName ?? "Dreamz Services",
          logo: option.logo ?? null,
          mode,
          zone: {
            code: option.zone?.code ?? rate.zone ?? "",
            name: option.zone?.name ?? option.zone?.code ?? rate.zone ?? "Dreamz Zone",
          },
          chargeableWeight: Number(option.chargeableWeight ?? params.weight),
          minWeight: Number(option.minWeight ?? params.weight),
          rate: {
            forward: Number(rate.forward ?? rate.freightCharge ?? 0),
            rto: Number(rate.rto ?? 0),
            codCharges: Number(rate.codCharges ?? 0),
            otherCharges: Number(rate.otherCharges ?? 0),
            freightCharge: Number(rate.freightCharge ?? rate.forward ?? 0),
            totalCharge: Number(rate.totalCharge ?? 0),
          },
        };
      })
      .filter((option) => option.externalCourierId && option.name && option.rate.totalCharge > 0);
  }

  async createOrder(params: OrderCreationParams): Promise<OrderCreationResult> {
    try {
      const token = await this.getAccessToken();
      if (!token) return this.orderResult({ success: false, error: "No Dreamz token available" });
      const creds = await this.getCredentials();
      const credentialValues = creds ?? {};

      const dreamzCourierId = params.metaData?.dreamzCourierId ?? params.metaData?.externalCourierId;
      const pickupAddressId = await this.resolvePickupAddressId(token, params, credentialValues);
      if (!dreamzCourierId) {
        return this.orderResult({ success: false, error: "Missing Dreamz courierId in courier metadata" });
      }
      if (!pickupAddressId) {
        return this.orderResult({ success: false, error: "Missing Dreamz pickupAddressId in provider credentials or courier metadata" });
      }

      const payload = {
        orderId: params.orderId,
        orderDate: params.orderDate,
        orderType: params.orderType,
        paymentType: params.paymentType,
        buyerName: params.delivery.name,
        buyerPhone: params.delivery.phone,
        buyerEmail: this.resolveEmail(
          params.delivery.email,
          credentialValues.email,
          credentialValues.identifier,
          credentialValues.username,
        ),
        email: this.resolveEmail(
          params.delivery.email,
          credentialValues.email,
          credentialValues.identifier,
          credentialValues.username,
        ),
        address: params.delivery.addressLine1,
        address2: params.delivery.addressLine2,
        city: params.delivery.city,
        state: params.delivery.state,
        pincode: params.delivery.pincode,
        weight: params.weight,
        length: params.length,
        breadth: params.breadth,
        height: params.height,
        chargeableWeight: params.weight,
        products: params.products,
        orderAmount: params.orderAmount,
        codAmount: params.paymentType === "cod" ? params.codAmount : 0,
        courierId: String(dreamzCourierId),
        pickupAddressId: String(pickupAddressId),
        preferredPickupDate: params.preferredPickupDate,
        preferredPickupTime: params.preferredPickupTime,
        rate: {
          forward: params.shippingCharges ?? 0,
          rto: Number(params.metaData?.rtoCharge ?? 0),
          codCharges: params.codCharges ?? 0,
          otherCharges: Number(params.metaData?.otherCharges ?? 0),
          freightCharge: params.shippingCharges ?? 0,
          totalCharge: (params.shippingCharges ?? 0) + (params.codCharges ?? 0),
          zone: String(params.metaData?.zone ?? ""),
        },
      };

      const { data } = await axios.post(externalUrls.dreamz.orders, payload, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: HTTP_TIMEOUT_EXTRA_LONG,
      });

      const order = data?.order ?? data?.data ?? data;
      const awb = order?.awb ?? order?.awbNumber ?? order?.awb_number;
      const providerOrderId = order?.id ?? order?.shipmentId ?? order?.shipment_id;
      if (!awb) {
        return this.orderResult({
          success: false,
          error: data?.error || data?.message || "Dreamz order response did not include AWB",
          rawResponse: data,
        });
      }

      return this.orderResult({
        success: true,
        awb: String(awb),
        providerOrderId: providerOrderId ? String(providerOrderId) : undefined,
        rawResponse: data,
      });
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      return this.orderResult({ success: false, error: this.formatError(err) });
    }
  }

  async cancelOrder(
    awb: string,
    order?: { id?: string; orderId?: string | null; metadata?: unknown },
    reason = "Cancelled by user",
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAccessToken();
      if (!token) return { success: false, error: "No Dreamz token available" };

      const meta = (order?.metadata ?? {}) as Record<string, unknown>;
      const providerOrderId =
        typeof meta.providerOrderId === "string" && meta.providerOrderId
          ? meta.providerOrderId
          : undefined;
      const dreamzOrderId = providerOrderId ?? order?.id;
      if (!dreamzOrderId) {
        return { success: false, error: `Missing Dreamz order ID for AWB ${awb}` };
      }

      const { data } = await axios.post(
        `${externalUrls.dreamz.cancelOrder}/${encodeURIComponent(dreamzOrderId)}/cancel`,
        { reason },
        {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          timeout: HTTP_TIMEOUT_EXTRA_LONG,
        },
      );

      this.log("info", `Order cancelled on Dreamz — order=${order?.orderId ?? dreamzOrderId}, AWB=${awb}`);
      return { success: true };
    } catch (err) {
      if (this.isUnauthorized(err)) this.clearCachedToken();
      return { success: false, error: this.formatError(err) };
    }
  }

  async trackOrder(awb: string): Promise<Record<string, unknown> | null> {
    try {
      const { data } = await axios.get(externalUrls.dreamz.publicTrack, {
        params: { q: awb },
        timeout: HTTP_TIMEOUT_MEDIUM,
      });
      return data ?? null;
    } catch (err) {
      this.log("error", `Track failed for AWB=${awb} - ${this.formatError(err)}`);
      return null;
    }
  }
}
