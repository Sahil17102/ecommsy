export type DeliveryStatus = "pending" | "retrying" | "success" | "failed";

export interface WebhookSeller {
  id: string;
  name: string;
  email: string | null;
}

export interface WebhookEventInfo {
  event: string;
  summary: string;
  description: string;
}

export interface WebhookHealth {
  success: boolean;
  windowHours: number;
  totals: {
    total: number;
    delivered: number;
    failed: number;
    pending: number;
    /** Percentage over settled deliveries only; null when nothing has settled. */
    successRate: number | null;
  };
  endpoints: { total: number; active: number; paused: number; failing: number };
  topErrors: Array<{ error: string | null; count: number }>;
  failingEndpoints: Array<{
    webhookId: string;
    url: string;
    failed: number;
    lastFailedAt: string | null;
    lastError: string | null;
    lastResponseStatus: number | null;
    seller: WebhookSeller | null;
  }>;
}

export interface AdminEndpoint {
  id: string;
  url: string;
  isActive: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  seller: WebhookSeller | null;
  stats: {
    delivered: number;
    failed: number;
    pending: number;
    lastDeliveryAt: string | null;
    lastStatus: string | null;
    lastError: string | null;
  };
}

export interface AdminEndpointsResponse {
  success: boolean;
  windowHours: number;
  endpoints: AdminEndpoint[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface AdminDeliveryRow {
  id: string;
  webhookId: string;
  event: string;
  url: string;
  status: DeliveryStatus;
  attempts: number;
  responseStatus: number | null;
  error: string | null;
  nextRetryAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Lifted out of the stored envelope so the list can identify the shipment. */
  orderId: string | null;
  awb: string | null;
  eventId: string | null;
  seller: WebhookSeller | null;
}

export interface AdminDeliveriesResponse {
  success: boolean;
  deliveries: AdminDeliveryRow[];
  stats: { delivered: number; failed: number; pending: number; retrying: number };
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface AdminDeliveryDetail extends AdminDeliveryRow {
  userId: string;
  payload: {
    id: string;
    event: string;
    api_version: string;
    created_at: string;
    data: Record<string, unknown>;
  } | null;
  responseBody: string | null;
  endpoint: {
    id: string;
    url: string;
    isActive: boolean;
    description: string | null;
  } | null;
}

export interface DeliveryFilters {
  userId?: string;
  webhookId?: string;
  status?: string;
  event?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface EndpointFilters {
  search?: string;
  userId?: string;
  isActive?: string;
  page?: number;
  limit?: number;
}
