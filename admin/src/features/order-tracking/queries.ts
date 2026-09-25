import { useMutation, useQuery } from "@tanstack/react-query";
import { orderTrackingApi, type TrackingSearchParams } from "./api";
import type { ListOrdersResponse, TrackingEvent } from "../orders/types";

export function useTrackingSearch() {
  return useMutation<ListOrdersResponse, Error, TrackingSearchParams>({
    mutationFn: orderTrackingApi.search,
  });
}

export function useOrderTracking(orderId: string | null) {
  return useQuery<TrackingEvent[]>({
    queryKey: ["order-tracking", orderId],
    queryFn: () => orderTrackingApi.getTracking(orderId!),
    enabled: !!orderId,
  });
}
