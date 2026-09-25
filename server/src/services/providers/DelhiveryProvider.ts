import { BaseProvider } from "./BaseProvider.js";
import type { ServiceabilityParams, ServiceabilityResult, OrderCreationParams, OrderCreationResult } from "../../types/provider.js";
import { externalUrls } from "../../config/externalUrls.js";
import { HTTP_TIMEOUT_SHORT, HTTP_TIMEOUT_MEDIUM } from "../../config/constants.js";

/**
 * Normalize a user-entered pickup time to the `HH:MM:SS` 24-hour format that
 * Delhivery's pickup-request API requires. Accepts:
 *   - "11:00 AM" / "1:30 PM" (12-hour with AM/PM — what we store on orders)
 *   - "13:30" (24-hour HH:MM)
 *   - "13:30:00" (already in target format)
 * Returns `null` for empty/unparseable input so the caller can apply a default.
 */
function normalizeDelhiveryTime(input?: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  // Already HH:MM:SS
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  // HH:MM (24-hour)
  const m24 = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (m24) return `${m24[1].padStart(2, "0")}:${m24[2]}:00`;
  // 12-hour with AM/PM
  const m12 = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/.exec(trimmed);
  if (m12) {
    let hour = parseInt(m12[1], 10);
    const minute = m12[2];
    const pm = m12[3].toUpperCase() === "PM";
    if (hour === 12) hour = pm ? 12 : 0;
    else if (pm) hour += 12;
    return `${String(hour).padStart(2, "0")}:${minute}:00`;
  }
  return null;
}

export class DelhiveryProvider extends BaseProvider {
  get displayName(): string {
    return `Delhivery:${this.accountName}`;
  }

  async checkServiceability(params: ServiceabilityParams): Promise<ServiceabilityResult> {
    const start = Date.now();

    try {
      const creds = await this.getCredentials();
      const token = creds?.accessToken || process.env.DELHIVERY_TOKEN;
      if (!token) {
        this.log("warn", "No access token in DB or DELHIVERY_TOKEN env var — marking not serviceable");
        return { accountId: this.account.id, provider: this.slug, serviceable: false };
      }

      this.log("info", `Checking pincode serviceability for ${params.destination}`);

      const data = await this.tracedRequest<any>("checkServiceability", {
        method: "GET",
        url: externalUrls.delhivery.heavyServiceability,
        params: { pincode: params.destination, product_type: "Heavy" },
        headers: { Authorization: `Token ${token}` },
        timeout: HTTP_TIMEOUT_SHORT,
      });

      if (!data?.success || !Array.isArray(data.data) || data.data.length === 0) {
        this.log("info", `Pincode ${params.destination} NOT serviceable — no data returned (${Date.now() - start}ms)`);
        return { accountId: this.account.id, provider: this.slug, serviceable: false };
      }

      const entry = data.data[0];
      // Heavy endpoint doesn't return fm_serviceable — a valid center means serviceable
      const serviceable = !!entry.center;

      this.log("info", `Pincode ${params.destination} → ${serviceable ? "SERVICEABLE" : "NOT SERVICEABLE"} (center: "${entry.center || "none"}") (${Date.now() - start}ms)`);
      return { accountId: this.account.id, provider: this.slug, serviceable };
    } catch (err) {
      this.log("error", `Serviceability check FAILED — ${this.formatError(err)} (${Date.now() - start}ms)`);
      return { accountId: this.account.id, provider: this.slug, serviceable: false };
    }
  }

  async registerPickupAddress(params: {
    name: string;
    phone: string;
    email: string;
    address: string;
    pin: string;
    city: string;
    state: string;
    country?: string;
    returnAddress?: string;
    returnPin?: string;
    returnCity?: string;
    returnState?: string;
    returnCountry?: string;
  }): Promise<{ success: boolean; facilityId?: string; error?: string }> {
    try {
      const creds = await this.getCredentials();
      const token = creds?.accessToken || process.env.DELHIVERY_TOKEN;
      if (!token) return { success: false, error: "No access token configured" };

      const phone = params.phone.replace(/\D/g, "").slice(-10);
      const returnAddress = params.returnAddress ?? params.address;
      const returnPin = params.returnPin ?? params.pin;
      const returnCity = params.returnCity ?? params.city;
      const returnState = params.returnState ?? params.state;
      const returnCountry = params.returnCountry ?? params.country ?? "India";

      const payload = {
        name: params.name,
        registered_name: params.name,
        phone,
        email: params.email,
        address: params.address,
        pin: params.pin,
        city: params.city,
        state: params.state,
        country: params.country ?? "India",
        return_address: returnAddress,
        return_pin: returnPin,
        return_city: returnCity,
        return_state: returnState,
        return_country: returnCountry,
      };

      const data = await this.tracedRequest<any>("registerPickupAddress", {
        method: "POST",
        url: externalUrls.delhivery.createWarehouse,
        data: payload,
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
        timeout: HTTP_TIMEOUT_MEDIUM,
      });

      // Delhivery returns the created facility data on success
      const facilityId = data?.facility_id ?? data?.id ?? data?.client_warehouse_uuid;
      if (data && !data.error) {
        this.log("info", `Pickup address "${params.name}" registered on Delhivery (facilityId: ${facilityId})`);
        return { success: true, facilityId };
      }

      const errorMsg = data?.error ?? data?.message ?? "Registration failed";
      this.log("warn", `Pickup address registration failed — ${errorMsg}`);
      return { success: false, error: errorMsg };
    } catch (err) {
      this.log("error", `registerPickupAddress FAILED — ${this.formatError(err)}`);
      return { success: false, error: this.formatError(err) };
    }
  }

  /**
   * Cancel a Delhivery shipment via /api/p/edit.
   *
   * Delhivery only allows cancellation in certain package statuses:
   *  - Forward (COD/Prepaid): Manifested, In Transit, Pending
   *  - RVP (Pickup): Scheduled
   *  - REPL: Manifested, In Transit, Pending
   *
   * The API itself enforces these rules — if the shipment isn't in a
   * cancellable state, Delhivery rejects the request. We trust that
   * and parse the response to report what happened.
   */
  /**
   * Track a B2C shipment by waybill via GET /api/v1/packages/json/?waybill=xxx.
   * Returns the first ShipmentData entry (Delhivery wraps a single result in
   * `{ ShipmentData: [{ Shipment: {...} }] }`) or the raw payload if the
   * envelope is missing.
   */
  async trackOrder(awb: string): Promise<Record<string, unknown> | null> {
    try {
      const creds = await this.getCredentials();
      const token = creds?.accessToken || process.env.DELHIVERY_TOKEN;
      if (!token) return null;

      const data = await this.tracedRequest<Record<string, unknown>>("trackOrder", {
        method: "GET",
        url: externalUrls.delhivery.tracking,
        params: { waybill: awb },
        headers: { Authorization: `Token ${token}` },
        timeout: HTTP_TIMEOUT_MEDIUM,
      });

      return data ?? null;
    } catch (err) {
      this.log("error", `Track FAILED for AWB=${awb} — ${this.formatError(err)}`);
      return null;
    }
  }

  async cancelOrder(awb: string): Promise<{ success: boolean; error?: string }> {
    try {
      const creds = await this.getCredentials();
      const token = creds?.accessToken || process.env.DELHIVERY_TOKEN;
      if (!token) return { success: false, error: "No access token configured" };

      const data = await this.tracedRequest<any>("cancelOrder", {
        method: "POST",
        url: externalUrls.delhivery.editOrder,
        data: { waybill: awb, cancellation: "true" },
        headers: { Authorization: `Token ${token}` },
        timeout: HTTP_TIMEOUT_MEDIUM,
      });

      // Delhivery returns { status: true/false, ... } or error details
      if (data?.status === false || data?.error) {
        const errorMsg = data?.error || data?.message || data?.rmk || "Cancellation rejected by Delhivery";
        this.log("warn", `Delhivery rejected cancel for AWB=${awb} — ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      this.log("info", `Order cancelled on Delhivery — AWB: ${awb}`);
      return { success: true };
    } catch (err) {
      this.log("error", `Cancel FAILED for AWB=${awb} — ${this.formatError(err)}`);
      return { success: false, error: this.formatError(err) };
    }
  }

  async ndrAction(
    awb: string,
    params: { action: string; rescheduledDate?: string; updatedPhone?: string; updatedAddress?: string },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const creds = await this.getCredentials();
      const token = creds?.accessToken || process.env.DELHIVERY_TOKEN;
      if (!token) return { success: false, error: "No access token configured" };

      let act: string;
      let actionData: Record<string, unknown> = {};

      if (params.action === "reattempt") {
        act = "RE-ATTEMPT";
      } else if (params.action === "reschedule" && params.rescheduledDate) {
        act = "DEFER_DLV";
        actionData = { deferred_date: params.rescheduledDate };
      } else if (params.updatedPhone || params.updatedAddress) {
        act = "EDIT_DETAILS";
        if (params.updatedPhone) actionData.phone = params.updatedPhone;
        if (params.updatedAddress) actionData.add = params.updatedAddress;
      } else {
        act = "RE-ATTEMPT";
      }

      await this.tracedRequest("ndrAction", {
        method: "POST",
        url: externalUrls.delhivery.ndrAction,
        data: { data: [{ waybill: awb, act, action_data: actionData }] },
        headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
        timeout: HTTP_TIMEOUT_MEDIUM,
      });
      this.log("info", `NDR action "${act}" taken for AWB=${awb}`);
      return { success: true };
    } catch (err) {
      this.log("error", `NDR action FAILED for AWB=${awb} — ${this.formatError(err)}`);
      return { success: false, error: this.formatError(err) };
    }
  }

  async requestPickup(
    awb: string,
    params: {
      pickupDate?: string;
      pickupTime?: string;
      pickupLocation?: string;
      expectedPackageCount?: number;
    },
  ): Promise<{
    success: boolean;
    error?: string;
    pickupId?: string;
    alreadyScheduled?: boolean;
    message?: string;
  }> {
    try {
      // Delhivery raises pickups against a registered *warehouse name*, not the
      // courier slug. The warehouse name must match what we sent when calling
      // /api/backend/clientwarehouse/create/ (we use pickupAddress.nickname).
      if (!params.pickupLocation) {
        return {
          success: false,
          error: "Missing pickup_location (registered warehouse name) — cannot raise Delhivery pickup",
        };
      }

      const creds = await this.getCredentials();
      const token = creds?.accessToken || process.env.DELHIVERY_TOKEN;
      if (!token) return { success: false, error: "No access token configured" };

      const pickupDate = params.pickupDate || new Date().toISOString().split("T")[0];
      const pickupTime = normalizeDelhiveryTime(params.pickupTime) ?? "18:00:00";

      const data = await this.tracedRequest<any>("requestPickup", {
        method: "POST",
        url: externalUrls.delhivery.pickupRequest,
        data: {
          pickup_time: pickupTime,
          pickup_date: pickupDate,
          pickup_location: params.pickupLocation,
          expected_package_count: Math.max(1, params.expectedPackageCount ?? 1),
        },
        headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
        timeout: HTTP_TIMEOUT_MEDIUM,
      });

      // Delhivery answers HTTP 201 EVEN WHEN IT REFUSES the request — the verdict
      // lives in the body (`success: false` + `error.message`), not the status
      // code. Ignoring it is why orders flipped to "pickup_initiated" here while
      // Delhivery never scheduled anything (no "Pickup scheduled" scan on the AWB).
      const pickupId = data?.pickup_id ?? data?.data?.pickup_id;
      const errorMessage =
        typeof data?.error === "string"
          ? data.error
          : Array.isArray(data?.error)
            ? data.error.join(", ")
            : (data?.error?.message as string | undefined) ??
              (data?.data?.message as string | undefined) ??
              (data?.message as string | undefined);

      // `pr_exist` = a pickup already exists for this warehouse + date. Delhivery
      // only accepts ONE request per pickup location per day, so nothing new was
      // raised: the warehouse is covered by that existing pickup, but this AWB
      // gets no pickup of its own. Reported upstream as a WARNING, never as a
      // plain success — the caller passes Delhivery's own wording to the user.
      if (data?.pr_exist === true) {
        this.log(
          "warn",
          `No new pickup raised for AWB=${awb} — ${errorMessage ?? `pickup ${pickupId ?? "?"} already exists for "${params.pickupLocation}" on ${pickupDate}`}`,
        );
        return {
          success: true,
          pickupId: pickupId ? String(pickupId) : undefined,
          alreadyScheduled: true,
          message: errorMessage,
        };
      }

      if (data?.success === false || (errorMessage && !pickupId)) {
        const reason = errorMessage ?? "Pickup request rejected by Delhivery";
        this.log("warn", `Pickup request REJECTED for AWB=${awb} — ${reason}`);
        return { success: false, error: reason };
      }

      this.log(
        "info",
        `Pickup requested for AWB=${awb} (warehouse: ${params.pickupLocation}, pickup_id: ${pickupId ?? "?"})`,
      );
      return { success: true, pickupId: pickupId ? String(pickupId) : undefined };
    } catch (err) {
      this.log("error", `Pickup request FAILED for AWB=${awb} — ${this.formatError(err)}`);
      return { success: false, error: this.formatError(err) };
    }
  }

  async createOrder(params: OrderCreationParams): Promise<OrderCreationResult> {
    const start = Date.now();

    try {
      const creds = await this.getCredentials();
      const token = creds?.accessToken || process.env.DELHIVERY_TOKEN;
      if (!token) {
        return { success: false, accountId: this.account.id, provider: this.slug, error: "No access token configured" };
      }

      this.log("info", `Creating order ${params.orderId} → ${params.delivery.pincode}`);

      // Delhivery matches the shipment to a warehouse registered on the portal
      // by *name*. We register pickup addresses under their nickname (see
      // pickupAddress.ts), so that's the value it expects here. Without it the
      // portal manifests the shipment with an empty pickup address and the
      // shipment lands as "Bad/Incomplete Address" at the hub.
      const warehouseName = params.pickup.nickname?.trim();
      if (!warehouseName) {
        this.log(
          "error",
          `[createOrder] Pickup address has no nickname — Delhivery has no registered warehouse to book against`,
        );
        return {
          success: false,
          accountId: this.account.id,
          provider: this.slug,
          error:
            "Pickup address is missing its nickname, which Delhivery uses as the registered warehouse name. Please re-save the pickup address and try again.",
        };
      }

      const productsDesc = params.products.map((p) => p.name).join(", ");
      const sellerAddress = [params.pickup.addressLine1, params.pickup.addressLine2]
        .filter(Boolean)
        .join(", ");
      // `weight` is in GRAMS on the manifest API — sending kilograms is why the
      // portal showed "0 gm" for every shipment.
      const weightGrams = Math.max(1, Math.round(params.weight));
      const rto = params.rtoAddress;

      const shipment = {
        name: params.delivery.name,
        add: [params.delivery.addressLine1, params.delivery.addressLine2].filter(Boolean).join(", "),
        pin: params.delivery.pincode,
        city: params.delivery.city,
        state: params.delivery.state,
        country: params.delivery.country || "India",
        phone: params.delivery.phone,
        order: params.orderId,
        order_date: params.orderDate,
        payment_mode: params.paymentType === "cod" ? "COD" : "Prepaid",
        cod_amount: params.codAmount || 0,
        total_amount: params.orderAmount,
        weight: weightGrams,
        shipment_length: params.length,
        shipment_width: params.breadth,
        shipment_height: params.height,
        products_desc: productsDesc,
        quantity: params.products.reduce((sum, p) => sum + p.quantity, 0),
        hsn_code: params.products[0]?.hsn || "",
        shipping_mode: "Surface",
        // ── Seller (what the portal renders as "Seller Details") ──
        seller_name: params.pickup.contactName,
        seller_add: sellerAddress,
        seller_inv: params.orderId,
        seller_gst_tin: params.pickup.gstNumber || "",
        // Buyer GSTIN only exists on B2B orders; sending "" for B2C is expected.
        consignee_gst_tin: params.companyGst || "",
        // ── Return / RTO (Delhivery names these `return_*`, not `rto_*`) ──
        ...(rto && {
          return_name: rto.contactName,
          return_phone: rto.phone,
          return_add: [rto.addressLine1, rto.addressLine2].filter(Boolean).join(", "),
          return_pin: rto.pincode,
          return_city: rto.city,
          return_state: rto.state,
          return_country: rto.country || "India",
        }),
      };

      // `pickup_location` is a SIBLING of `shipments`, not a shipment field.
      // Nesting it (or sending flat pickup_* keys) makes Delhivery silently
      // manifest the order with no pickup address.
      const body = {
        shipments: [shipment],
        pickup_location: {
          name: warehouseName,
          add: sellerAddress,
          city: params.pickup.city,
          pin_code: params.pickup.pincode,
          country: params.pickup.country || "India",
          phone: params.pickup.phone,
        },
      };

      const formData = `format=json&data=${encodeURIComponent(JSON.stringify(body))}`;

      // The form-encoded body is opaque in the logs — emit the decoded shipment
      // JSON too, since that's what actually needs eyeballing when a booking fails.
      this.log("info", `[createOrder] shipment JSON: ${this.prettyLog(body)}`);

      const data = await this.tracedRequest<any>("createOrder", {
        method: "POST",
        url: externalUrls.delhivery.createOrder,
        data: formData,
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: HTTP_TIMEOUT_MEDIUM,
      });

      const pkg = data?.packages?.[0];
      if (!data?.success || !pkg?.waybill) {
        const errorMsg = pkg?.remarks?.join(", ") || data?.rmk || "Order creation failed";
        this.log("warn", `Order creation failed for ${params.orderId} — ${errorMsg} (${Date.now() - start}ms)`);
        return { success: false, accountId: this.account.id, provider: this.slug, error: errorMsg, rawResponse: data };
      }

      this.log("info", `Order ${params.orderId} created — AWB: ${pkg.waybill} (${Date.now() - start}ms)`);
      return {
        success: true,
        accountId: this.account.id, provider: this.slug,
        awb: pkg.waybill,
        providerOrderId: pkg.refnum || params.orderId,
        rawResponse: data,
      };
    } catch (err) {
      this.log("error", `Order creation FAILED — ${this.formatError(err)} (${Date.now() - start}ms)`);
      return { success: false, accountId: this.account.id, provider: this.slug, error: this.formatError(err) };
    }
  }
}
