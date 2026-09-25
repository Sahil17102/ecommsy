import { api } from "./api";

export interface TrackingEvent {
  statusText: string | null;
  statusCode: string | null;
  location: string | null;
  remarks: string | null;
  timestamp: string | null;
}

export interface TrackingResult {
  found: boolean;
  message?: string;
  awb?: string | null;
  orderId?: string | null;
  status?: string | null;
  courierStatus?: string | null;
  courier?: string | null;
  origin?: string | null;
  destination?: string | null;
  weightKg?: number | null;
  events?: TrackingEvent[];
}

/** Public shipment lookup by AWB number or Order ID (no auth). */
export async function trackShipment(query: string): Promise<TrackingResult> {
  const { data } = await api.get<TrackingResult>("/track", { params: { q: query.trim() } });
  return data;
}
