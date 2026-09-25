import { api } from "@/lib/api";
import type {
  DeliveryListResponse,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookFormValues,
} from "./types";

export interface DeliveryQuery {
  webhookId?: string;
  status?: string;
  event?: string;
  page?: number;
  limit?: number;
}

export const webhooksApi = {
  list: async (): Promise<WebhookEndpoint[]> => {
    const { data } = await api.get("/webhooks");
    return data.webhooks;
  },

  create: async (payload: WebhookFormValues): Promise<WebhookEndpoint> => {
    const { data } = await api.post("/webhooks", payload);
    return data.webhook;
  },

  update: async (id: string, payload: Partial<WebhookFormValues> & { isActive?: boolean }): Promise<WebhookEndpoint> => {
    const { data } = await api.patch(`/webhooks/${id}`, payload);
    return data.webhook;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/webhooks/${id}`);
  },

  rotateSecret: async (id: string): Promise<WebhookEndpoint> => {
    const { data } = await api.post(`/webhooks/${id}/rotate-secret`);
    return data.webhook;
  },

  sendTest: async (
    id: string,
    event?: string,
  ): Promise<{ delivered: boolean; delivery: WebhookDelivery }> => {
    const { data } = await api.post(`/webhooks/${id}/test`, event ? { event } : {});
    return data;
  },

  listDeliveries: async ({ webhookId, ...params }: DeliveryQuery): Promise<DeliveryListResponse> => {
    const path = webhookId ? `/webhooks/${webhookId}/deliveries` : "/webhooks/deliveries";
    const { data } = await api.get(path, { params });
    return data;
  },

  redeliver: async (deliveryId: string): Promise<void> => {
    await api.post(`/webhooks/deliveries/${deliveryId}/redeliver`);
  },
};
