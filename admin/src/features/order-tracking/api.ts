import { api } from "@/lib/api";
import type { ListOrdersResponse, TrackingEvent } from "../orders/types";

export interface TrackingSearchParams {
  search?: string;
  page?: number;
  limit?: number;
}

export const orderTrackingApi = {
  search: async (params: TrackingSearchParams): Promise<ListOrdersResponse> => {
    // Always opt into the user expansion — the tracking UI shows the seller's
    // business name alongside each order.
    const { data } = await api.get("/orders", { params: { ...params, expand: "user" } });
    return data as ListOrdersResponse;
  },

  getTracking: async (orderId: string): Promise<TrackingEvent[]> => {
    const { data } = await api.get(`/orders/${orderId}/tracking`);
    return data as TrackingEvent[];
  },
};
