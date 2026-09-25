import { api } from "@/lib/api";
import type {
  ListOrdersResponse,
  GetOrderDetailResponse,
  OrderStatus,
  TrackingEvent,
  NdrEventItem,
  RtoEventItem,
  OrderListItem,
  NdrOrderListItem,
  RtoOrderListItem,
  ExpandableOrderRelation,
  ExportJob,
  ListExportJobsResponse,
} from "./types";

export interface OrderFiltersParams {
  search?: string;
  status?: string;
  orderType?: string;
  paymentType?: string;
  serviceProvider?: string;
  /** Filter by the named courier (couriers.id) rather than the aggregator slug. */
  courierId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: string;
  // Frontend-driven embedding — see server/src/utils/expand.ts. Pass the
  // relations you actually need on this page; absent ones are omitted.
  expand?: ExpandableOrderRelation[];
}

/**
 * Filters shared by the NDR and RTO lists. They accept the same names as the
 * main order list so one mental model (and one server-side where-builder)
 * covers all three screens — except `startDate`/`endDate`, which mean "NDR
 * date" / "RTO updated" on those screens rather than "order created".
 */
export interface NdrRtoFiltersParams {
  page?: number;
  limit?: number;
  search?: string;
  courierId?: string;
  userId?: string;
  paymentType?: string;
  orderType?: string;
  startDate?: string;
  endDate?: string;
  sortField?: string;
  sortOrder?: string;
}

function withExpand<T extends { expand?: ExpandableOrderRelation[] }>(
  params: T | undefined,
): (Omit<T, "expand"> & { expand?: string }) | undefined {
  if (!params) return params;
  const { expand, ...rest } = params;
  return expand && expand.length > 0
    ? ({ ...rest, expand: expand.join(",") } as Omit<T, "expand"> & { expand: string })
    : (rest as Omit<T, "expand">);
}

export const ordersApi = {
  list: async (params?: OrderFiltersParams): Promise<ListOrdersResponse> => {
    const { data } = await api.get("/orders", { params: withExpand(params) });
    return data as ListOrdersResponse;
  },

  getById: async (id: string, expand?: ExpandableOrderRelation[]): Promise<GetOrderDetailResponse> => {
    const { data } = await api.get(`/orders/${id}`, {
      params: expand && expand.length > 0 ? { expand: expand.join(",") } : undefined,
    });
    return data as GetOrderDetailResponse;
  },

  // ── Status Management ──

  updateStatus: async (
    id: string,
    payload: {
      status: OrderStatus;
      remarks?: string;
      location?: string;
      ndrReason?: string;
      ndrNextAction?: string;
      rtoCharges?: number;
      codAmount?: number;
    },
  ): Promise<{ order: OrderListItem }> => {
    const { data } = await api.patch(`/orders/${id}/status`, payload);
    return data;
  },

  getTransitions: async (id: string): Promise<{ currentStatus: string; validTransitions: OrderStatus[] }> => {
    const { data } = await api.get(`/orders/${id}/transitions`);
    return data;
  },

  cancelOrder: async (id: string, reason?: string): Promise<{ order: OrderListItem }> => {
    const { data } = await api.post(`/orders/${id}/cancel`, { reason });
    return data;
  },

  // ── Tracking ──

  getTracking: async (id: string): Promise<TrackingEvent[]> => {
    const { data } = await api.get(`/orders/${id}/tracking`);
    return data as TrackingEvent[];
  },

  // ── NDR ──

  listNdr: async (params?: NdrRtoFiltersParams): Promise<{ orders: NdrOrderListItem[]; total: number }> => {
    const { data } = await api.get("/orders/ndr/list", { params });
    return data;
  },

  getNdrEvents: async (id: string): Promise<NdrEventItem[]> => {
    const { data } = await api.get(`/orders/${id}/ndr-events`);
    return data as NdrEventItem[];
  },

  recordNdr: async (id: string, payload: { reason: string; remarks?: string; location?: string; nextAction?: string; attemptDate?: string }): Promise<void> => {
    await api.post(`/orders/${id}/ndr`, payload);
  },

  takeNdrAction: async (id: string, payload: { action: "reattempt" | "rto" | "reschedule"; remarks?: string; rescheduledDate?: string }): Promise<void> => {
    await api.post(`/orders/${id}/ndr-action`, payload);
  },

  // ── CSV export (async) ──

  /** Queue a server-side CSV build for the given filters. Returns instantly. */
  startExport: async (params: OrderFiltersParams = {}): Promise<{ job: ExportJob; reused: boolean; message?: string }> => {
    const { page, limit, sortField, sortOrder, expand, ...filters } = params;
    // `{}` rather than null — axios serialises a null body to the literal
    // string "null", which body-parser's strict JSON mode rejects.
    const { data } = await api.post("/orders/export", {}, { params: filters });
    return data;
  },

  listExports: async (params: { page?: number; limit?: number } = {}): Promise<ListExportJobsResponse> => {
    const { data } = await api.get("/orders/exports", { params });
    return data as ListExportJobsResponse;
  },

  rerunExport: async (id: string): Promise<{ job: ExportJob; reused: boolean }> => {
    const { data } = await api.post(`/orders/exports/${id}/rerun`, {});
    return data;
  },

  downloadExport: async (id: string): Promise<Blob> => {
    const { data } = await api.get(`/orders/exports/${id}/download`, { responseType: "blob" });
    return data as Blob;
  },

  // ── RTO ──

  listRto: async (params?: NdrRtoFiltersParams & { rtoPhase?: string }): Promise<{ orders: RtoOrderListItem[]; total: number }> => {
    const { data } = await api.get("/orders/rto/list", { params });
    return data;
  },

  getRtoEvents: async (id: string): Promise<RtoEventItem[]> => {
    const { data } = await api.get(`/orders/${id}/rto-events`);
    return data as RtoEventItem[];
  },

  updateRtoPhase: async (id: string, payload: { phase: "initiated" | "in_transit" | "delivered"; remarks?: string; rtoCharges?: number }): Promise<void> => {
    await api.post(`/orders/${id}/rto`, payload);
  },
};
