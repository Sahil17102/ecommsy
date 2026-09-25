import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { externalUrls } from "../config/externalUrls.js";
import { serviceProviders } from "../db/schema.js";
import { AppError } from "../utils/AppError.js";

type Json = Record<string, unknown>;

function detail(err: unknown): string {
  if (!(err instanceof AxiosError)) return err instanceof Error ? err.message : "Delhivery request failed";
  const data = err.response?.data as Json | string | undefined;
  if (typeof data === "string") return data;
  const value = data?.error ?? data?.message ?? data?.detail;
  return Array.isArray(value) ? value.join(", ") : typeof value === "string" ? value : err.message;
}

/** Low-level, allow-listed Delhivery B2C client used by the admin integration routes. */
export class DelhiveryB2cApi {
  private constructor(private readonly token: string) {}

  static async forAccount(accountId: string): Promise<DelhiveryB2cApi> {
    const row = await db.query.serviceProviders.findFirst({
      where: eq(serviceProviders.id, accountId),
    });
    if (!row || row.slug !== "delhivery" || !row.isActive) {
      throw new AppError(404, "Active Delhivery service-provider account not found");
    }
    const credentials = row.credentials as { b2c?: { values?: Record<string, string> } } | null;
    const token = credentials?.b2c?.values?.accessToken || process.env.DELHIVERY_TOKEN;
    if (!token) throw new AppError(503, "Delhivery access token is not configured");
    return new DelhiveryB2cApi(token);
  }

  private async request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await axios.request<T>({
        timeout: 30_000,
        ...config,
        headers: {
          Accept: "application/json",
          Authorization: `Token ${this.token}`,
          ...config.headers,
        },
      });
      return response.data;
    } catch (err) {
      const status = err instanceof AxiosError && err.response?.status ? err.response.status : 502;
      throw new AppError(status, detail(err));
    }
  }

  serviceability(pincode: string) {
    return this.request({ method: "GET", url: externalUrls.delhivery.serviceability, params: { filter_codes: pincode } });
  }
  heavyServiceability(pincode: string) {
    return this.request({ method: "GET", url: externalUrls.delhivery.heavyServiceability, params: { product_type: "Heavy", pincode } });
  }
  expectedTat(query: Json) {
    return this.request({ method: "GET", url: externalUrls.delhivery.expectedTat, params: { ...query, pdt: query.pdt || "B2C" } });
  }
  bulkWaybills(count: number) {
    return this.request({ method: "GET", url: externalUrls.delhivery.bulkWaybill, params: { token: this.token, count } });
  }
  singleWaybill() {
    return this.request({ method: "GET", url: externalUrls.delhivery.singleWaybill, params: { token: this.token } });
  }
  createShipment(body: Json) {
    const encoded = `format=json&data=${encodeURIComponent(JSON.stringify(body))}`;
    return this.request({ method: "POST", url: externalUrls.delhivery.createOrder, data: encoded, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  }
  editShipment(body: Json) {
    return this.request({ method: "POST", url: externalUrls.delhivery.editOrder, data: body, headers: { "Content-Type": "application/json" } });
  }
  cancelShipment(waybill: string) {
    return this.editShipment({ waybill, cancellation: "true" });
  }
  updateEwaybill(waybill: string, data: unknown) {
    return this.request({ method: "PUT", url: `${externalUrls.delhivery.ewaybill}/${encodeURIComponent(waybill)}/`, data: { data }, headers: { "Content-Type": "application/json" } });
  }
  track(query: Json) {
    return this.request({ method: "GET", url: externalUrls.delhivery.tracking, params: query });
  }
  rates(query: Json) {
    return this.request({ method: "GET", url: externalUrls.delhivery.rates, params: query });
  }
  label(waybill: string, pdfSize = "A4", pdf = true) {
    return this.request({ method: "GET", url: externalUrls.delhivery.label, params: { wbns: waybill, pdf, pdf_size: pdfSize } });
  }
  pickup(body: Json) {
    return this.request({ method: "POST", url: externalUrls.delhivery.pickupRequest, data: body, headers: { "Content-Type": "application/json" } });
  }
  createWarehouse(body: Json) {
    return this.request({ method: "POST", url: externalUrls.delhivery.createWarehouse, data: body, headers: { "Content-Type": "application/json" } });
  }
  editWarehouse(body: Json) {
    return this.request({ method: "POST", url: externalUrls.delhivery.editWarehouse, data: body, headers: { "Content-Type": "application/json" } });
  }
  document(waybill: string, docType: string) {
    return this.request({ method: "GET", url: externalUrls.delhivery.document, params: { waybill, doc_type: docType } });
  }
  ndr(body: Json) {
    const data = Array.isArray(body.data) ? body.data : [body];
    return this.request({ method: "POST", url: externalUrls.delhivery.ndrAction, data: { data }, headers: { "Content-Type": "application/json" } });
  }
  ndrStatus(requestId: string, verbose = true) {
    return this.request({ method: "GET", url: `${externalUrls.delhivery.ndrStatus}/${encodeURIComponent(requestId)}`, params: { verbose } });
  }
}
