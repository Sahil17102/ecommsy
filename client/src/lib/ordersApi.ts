import { api } from "./api";
import { downloadBlob } from "./utils";
import type { Order, CreateOrderPayload, TrackingEvent } from "./ordersTypes";

// Re-export types for backward compatibility
export type { Order, OrderStatus, OrderAddress, OrderProduct, OrderRate, CreateOrderPayload, TrackingEvent } from "./ordersTypes";

/**
 * Result of an "Initiate Pickup" call. `warnings` carries orders that went
 * through without a pickup of their own — e.g. the courier already had one for
 * that warehouse/date — so the UI can avoid reporting a false clean success.
 */
export interface ManifestResponse {
  manifestUrl?: string;
  ordersProcessed: number;
  errors: Array<{ awb: string; error: string }>;
  warnings?: Array<{ awb: string; warning: string }>;
}

export interface OrderStats {
  total: number;
  draft: number;
  created: number;
  processing: number;
  booked: number;
  pickup_initiated: number;
  shipped: number;
  in_transit: number;
  out_for_delivery: number;
  delivered: number;
  ndr: number;
  rto_initiated: number;
  rto_in_transit: number;
  rto_delivered: number;
  cancelled: number;
  lost: number;
  totalRevenue: number;
}

/**
 * Filters shared by the NDR and RTO screens. Same names as the main order list
 * so the server can reuse one where-builder — except `startDate`/`endDate`,
 * which mean "NDR date" / "RTO updated" on those screens.
 */
export interface NdrRtoFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  courierId?: string;
  paymentType?: string;
  orderType?: string;
  startDate?: string;
  endDate?: string;
  sortField?: string;
  sortOrder?: string;
}

export interface OrderListParams {
  search?: string;
  status?: string;
  orderType?: string;
  paymentType?: string;
  pickupAddressId?: string;
  /** Filter by the named courier (couriers.id) — applied in SQL, not per page. */
  courierId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
}

export interface BulkCreateRowResult {
  rowNumber: number;
  orderId: string;
  success: boolean;
  order?: Order;
  error?: string;
}

export interface BulkCreateResponse {
  success: boolean;
  total: number;
  successCount: number;
  failedCount: number;
  results: BulkCreateRowResult[];
}

export interface OrderListResponse {
  orders: Order[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  stats: OrderStats;
}

export const ordersApi = {
  create: async (data: CreateOrderPayload): Promise<Order> => {
    const { data: result } = await api.post("/orders", data);
    return result.order as Order;
  },

  getAll: async (params?: OrderListParams): Promise<OrderListResponse> => {
    const { data } = await api.get("/orders", { params });
    return data as OrderListResponse;
  },

  getById: async (id: string): Promise<Order> => {
    const { data } = await api.get(`/orders/${id}`);
    return data.order as Order;
  },

  downloadLabel: async (id: string, awb: string): Promise<void> => {
    const { data } = await api.get(`/orders/${id}/label`, { responseType: "blob" });
    downloadBlob(data, `label-${awb}.pdf`);
  },

  downloadInvoice: async (id: string, orderId: string): Promise<void> => {
    const { data } = await api.get(`/orders/${id}/invoice`, { responseType: "blob" });
    downloadBlob(data, `invoice-${orderId}.pdf`);
  },

  // ── New lifecycle APIs ──

  manifestOrders: async (orderIds: string[]): Promise<ManifestResponse> => {
    const { data } = await api.post("/orders/manifest-orders", { orderIds });
    return data;
  },

  // ── Bulk B2C ──

  bulkCreate: async (orders: CreateOrderPayload[]): Promise<BulkCreateResponse> => {
    const { data } = await api.post("/orders/bulk-create", { orders });
    return data as BulkCreateResponse;
  },

  bulkCreateB2B: async (orders: CreateOrderPayload[]): Promise<BulkCreateResponse> => {
    const { data } = await api.post("/orders/bulk-create-b2b", { orders });
    return data as BulkCreateResponse;
  },

  bulkManifest: async (orderIds: string[]): Promise<ManifestResponse> => {
    const { data } = await api.post("/orders/bulk-manifest", { orderIds });
    return data;
  },

  downloadBulkLabels: async (orderIds: string[]): Promise<void> => {
    const { data } = await api.post("/orders/bulk-labels", { orderIds }, { responseType: "blob" });
    downloadBlob(data, `labels-${orderIds.length}.pdf`);
  },

  /** Download the pickup manifest for a single order. Same download-only rules as the bulk version. */
  downloadManifest: async (id: string, orderId: string): Promise<void> => {
    const { data } = await api.post("/orders/manifest", { orderIds: [id] }, { responseType: "blob" });
    downloadBlob(data, `manifest-${orderId.replace(/[^\w.-]+/g, "_")}.pdf`);
  },

  /**
   * Download the pickup manifest for a batch of orders — one sheet per courier
   * in a single PDF. Download only: it does NOT raise pickups or mark the
   * orders manifested (that stays with "Initiate Pickup").
   */
  downloadBulkManifest: async (orderIds: string[]): Promise<void> => {
    const { data } = await api.post("/orders/manifest", { orderIds }, { responseType: "blob" });
    downloadBlob(data, `manifest-${orderIds.length}.pdf`);
  },

  /** Couriers this seller has shipped with — options for the orders courier filter. */
  getCourierOptions: async (orderType?: string): Promise<Array<{ id: string; name: string }>> => {
    const { data } = await api.get("/orders/courier-options", { params: { orderType } });
    return (data.couriers ?? []) as Array<{ id: string; name: string }>;
  },

  downloadBulkTemplate: async (): Promise<void> => {
    const { data } = await api.get("/orders/bulk-template", { responseType: "blob" });
    downloadBlob(data, "b2c-bulk-upload-template.csv");
  },

  cancelOrder: async (id: string, reason?: string): Promise<Order> => {
    const { data } = await api.post(`/orders/${id}/cancel`, { reason });
    return data.order as Order;
  },

  getTracking: async (id: string): Promise<TrackingEvent[]> => {
    const { data } = await api.get(`/orders/${id}/tracking`);
    return data as TrackingEvent[];
  },

  // ── NDR ──

  listNdr: async (params?: NdrRtoFilterParams): Promise<{ orders: Order[]; total: number }> => {
    const { data } = await api.get("/orders/ndr/list", { params });
    return data;
  },

  takeNdrAction: async (id: string, payload: { action: "reattempt" | "rto" | "reschedule"; remarks?: string }): Promise<void> => {
    await api.post(`/orders/${id}/ndr-action`, payload);
  },

  // ── RTO ──

  listRto: async (params?: NdrRtoFilterParams & { rtoPhase?: string }): Promise<{ orders: Order[]; total: number }> => {
    const { data } = await api.get("/orders/rto/list", { params });
    return data;
  },
};
