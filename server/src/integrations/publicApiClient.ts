type JsonObject = Record<string, unknown>;

export type PublicApiClientOptions = {
  baseUrl?: string;
  accessToken?: string;
  fetchImpl?: typeof fetch;
};

export type RequestOptions = {
  accessToken?: string;
  query?: Record<string, string | number | boolean | null | undefined>;
};

export type LoginPayload = {
  identifier: string;
  password: string;
};

export type PickupAddressPayload = {
  nickname: string;
  contactName: string;
  phone: string;
  email?: string;
  role?: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  country?: string;
  pincode: string;
  gstNumber?: string;
  isSameAsRto?: boolean;
  rtoAddress?: JsonObject | null;
};

export type AvailableRatesPayload = {
  pickupPincode?: string;
  originPincode?: string;
  deliveryPincode?: string;
  destinationPincode?: string;
  paymentType?: "prepaid" | "cod";
  orderAmount?: number;
  codAmount?: number;
  weight?: number;
  length?: number;
  breadth?: number;
  height?: number;
  orderType?: "B2C" | "B2B" | "b2c" | "b2b";
  [key: string]: unknown;
};

export type CreateOrderPayload = {
  orderId: string;
  orderDate?: string;
  orderType: "B2C" | "B2B" | "b2c" | "b2b";
  paymentType: "prepaid" | "cod";
  courierId: string;
  pickupAddressId: string;
  rate?: JsonObject;
  [key: string]: unknown;
};

export type ManifestOrdersPayload = {
  orderIds: string[];
  preferredPickupDate?: string;
  preferredPickupTime?: string;
};

export type NdrActionPayload = {
  action: string;
  scheduledDate?: string;
  remarks?: string;
  address?: JsonObject;
  phone?: string;
};

export class PublicApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error?: unknown }).error)
        : `Public API request failed with status ${status}`;
    super(message);
    this.name = "PublicApiError";
    this.status = status;
    this.body = body;
  }
}

export class PublicApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private accessToken?: string;

  constructor(options: PublicApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "https://searchcraftdigital.com/api").replace(/\/+$/, "");
    this.accessToken = options.accessToken;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  setAccessToken(accessToken: string | undefined): void {
    this.accessToken = accessToken;
  }

  async login(payload: LoginPayload) {
    const result = await this.request<{ accessToken?: string }>("/auth/login", {
      method: "POST",
      body: payload,
      auth: false,
    });
    if (result.accessToken) this.accessToken = result.accessToken;
    return result;
  }

  listPickupAddresses(options?: RequestOptions) {
    return this.request("/pickup-addresses", { auth: true, options });
  }

  getPickupAddress(id: string, options?: RequestOptions) {
    return this.request(`/pickup-addresses/${encodeURIComponent(id)}`, { auth: true, options });
  }

  createPickupAddress(payload: PickupAddressPayload, options?: RequestOptions) {
    return this.request("/pickup-addresses", { method: "POST", body: payload, auth: true, options });
  }

  updatePickupAddress(id: string, payload: Partial<PickupAddressPayload>, options?: RequestOptions) {
    return this.request(`/pickup-addresses/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: payload,
      auth: true,
      options,
    });
  }

  deletePickupAddress(id: string, options?: RequestOptions) {
    return this.request(`/pickup-addresses/${encodeURIComponent(id)}`, {
      method: "DELETE",
      auth: true,
      options,
    });
  }

  setPrimaryPickupAddress(id: string, options?: RequestOptions) {
    return this.request(`/pickup-addresses/${encodeURIComponent(id)}/primary`, {
      method: "PATCH",
      auth: true,
      options,
    });
  }

  listCouriers(options?: RequestOptions) {
    return this.request("/couriers", { auth: true, options });
  }

  getAvailableRates(payload: AvailableRatesPayload, options?: RequestOptions) {
    return this.request("/rates/available", { method: "POST", body: payload, auth: true, options });
  }

  listOrders(options?: RequestOptions) {
    return this.request("/orders", { auth: true, options });
  }

  createOrder(payload: CreateOrderPayload, options?: RequestOptions) {
    return this.request("/orders", { method: "POST", body: payload, auth: true, options });
  }

  getOrder(id: string, options?: RequestOptions) {
    return this.request(`/orders/${encodeURIComponent(id)}`, { auth: true, options });
  }

  cancelOrder(id: string, options?: RequestOptions) {
    return this.request(`/orders/${encodeURIComponent(id)}/cancel`, { method: "POST", auth: true, options });
  }

  getOrderTracking(id: string, options?: RequestOptions) {
    return this.request(`/orders/${encodeURIComponent(id)}/tracking`, { auth: true, options });
  }

  getOrderLabel(id: string, options?: RequestOptions) {
    return this.requestBinary(`/orders/${encodeURIComponent(id)}/label`, { auth: true, options });
  }

  getOrderInvoice(id: string, options?: RequestOptions) {
    return this.requestBinary(`/orders/${encodeURIComponent(id)}/invoice`, { auth: true, options });
  }

  manifestOrders(payload: ManifestOrdersPayload, options?: RequestOptions) {
    return this.request("/orders/manifest-orders", { method: "POST", body: payload, auth: true, options });
  }

  listNdrOrders(options?: RequestOptions) {
    return this.request("/orders/ndr/list", { auth: true, options });
  }

  listRtoOrders(options?: RequestOptions) {
    return this.request("/orders/rto/list", { auth: true, options });
  }

  submitNdrAction(id: string, payload: NdrActionPayload, options?: RequestOptions) {
    return this.request(`/orders/${encodeURIComponent(id)}/ndr-action`, {
      method: "POST",
      body: payload,
      auth: true,
      options,
    });
  }

  trackShipment(query: string, options?: RequestOptions) {
    return this.request("/track", { auth: false, options: { ...options, query: { ...options?.query, q: query } } });
  }

  private async request<T = unknown>(
    path: string,
    config: {
      method?: string;
      body?: unknown;
      auth?: boolean;
      options?: RequestOptions;
    } = {},
  ): Promise<T> {
    const response = await this.send(path, config);
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    const body = text ? JSON.parse(text) : undefined;
    if (!response.ok) throw new PublicApiError(response.status, body);
    return body as T;
  }

  private async requestBinary(
    path: string,
    config: { auth?: boolean; options?: RequestOptions } = {},
  ): Promise<Blob> {
    const response = await this.send(path, config);
    if (!response.ok) {
      const text = await response.text();
      let body: unknown = text;
      try {
        body = text ? JSON.parse(text) : undefined;
      } catch {
        body = text;
      }
      throw new PublicApiError(response.status, body);
    }
    return response.blob();
  }

  private send(
    path: string,
    config: {
      method?: string;
      body?: unknown;
      auth?: boolean;
      options?: RequestOptions;
    },
  ): Promise<Response> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(config.options?.query ?? {})) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }

    const headers = new Headers();
    const token = config.options?.accessToken ?? this.accessToken;
    if (config.auth !== false && token) headers.set("Authorization", `Bearer ${token}`);
    if (config.body !== undefined) headers.set("Content-Type", "application/json");

    return this.fetchImpl(url, {
      method: config.method ?? "GET",
      headers,
      body: config.body === undefined ? undefined : JSON.stringify(config.body),
    });
  }
}
