export type WebhookEventName =
  | "order.created"
  | "order.booked"
  | "order.pickup_initiated"
  | "order.shipped"
  | "order.in_transit"
  | "order.out_for_delivery"
  | "order.delivered"
  | "order.ndr"
  | "order.rto_initiated"
  | "order.rto_in_transit"
  | "order.rto_delivered"
  | "order.cancelled"
  | "order.lost";

export interface WebhookEventInfo {
  event: WebhookEventName;
  summary: string;
  description: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  isActive: boolean;
  description: string | null;
  /** Masked everywhere except the create and rotate responses. */
  secret: string;
  createdAt: string;
  updatedAt: string;
}

export type DeliveryStatus = "pending" | "retrying" | "success" | "failed";

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  url: string;
  payload: WebhookEnvelope | null;
  responseStatus: number | null;
  responseBody: string | null;
  attempts: number;
  status: DeliveryStatus;
  nextRetryAt: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEnvelope {
  id: string;
  event: string;
  api_version: string;
  created_at: string;
  data: Record<string, unknown>;
}

export interface WebhookFormValues {
  url: string;
  description: string;
}

export interface DeliveryListResponse {
  success: boolean;
  deliveries: WebhookDelivery[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
