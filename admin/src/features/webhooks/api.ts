import { api } from "@/lib/api";
import type {
  AdminDeliveriesResponse,
  AdminDeliveryDetail,
  AdminEndpointsResponse,
  DeliveryFilters,
  EndpointFilters,
  WebhookEventInfo,
  WebhookHealth,
} from "./types";

export const adminWebhooksApi = {
  health: async (hours: number): Promise<WebhookHealth> => {
    const { data } = await api.get("/webhooks/health", { params: { hours } });
    return data as WebhookHealth;
  },

  events: async (): Promise<WebhookEventInfo[]> => {
    const { data } = await api.get("/webhooks/events");
    return data.events as WebhookEventInfo[];
  },

  listEndpoints: async (filters: EndpointFilters): Promise<AdminEndpointsResponse> => {
    const { data } = await api.get("/webhooks/endpoints", { params: filters });
    return data as AdminEndpointsResponse;
  },

  toggleEndpoint: async (id: string, isActive: boolean): Promise<void> => {
    await api.patch(`/webhooks/endpoints/${id}`, { isActive });
  },

  listDeliveries: async (filters: DeliveryFilters): Promise<AdminDeliveriesResponse> => {
    const { data } = await api.get("/webhooks/deliveries", { params: filters });
    return data as AdminDeliveriesResponse;
  },

  getDelivery: async (id: string): Promise<AdminDeliveryDetail> => {
    const { data } = await api.get(`/webhooks/deliveries/${id}`);
    return data.delivery as AdminDeliveryDetail;
  },

  redeliver: async (id: string): Promise<void> => {
    await api.post(`/webhooks/deliveries/${id}/redeliver`);
  },
};
