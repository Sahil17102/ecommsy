import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminWebhooksApi } from "./api";
import type { DeliveryFilters, EndpointFilters } from "./types";

const HEALTH_KEY = ["admin-webhook-health"] as const;
const ENDPOINTS_KEY = ["admin-webhook-endpoints"] as const;
const DELIVERIES_KEY = ["admin-webhook-deliveries"] as const;

/** Refreshed on a timer — this is an ops screen people leave open. */
export function useWebhookHealth(hours: number) {
  return useQuery({
    queryKey: [...HEALTH_KEY, hours],
    queryFn: () => adminWebhooksApi.health(hours),
    refetchInterval: 30_000,
  });
}

export function useWebhookEventCatalogue() {
  return useQuery({
    queryKey: ["admin-webhook-events"],
    queryFn: adminWebhooksApi.events,
    staleTime: 60 * 60 * 1000,
  });
}

export function useAdminEndpoints(filters: EndpointFilters, enabled = true) {
  return useQuery({
    queryKey: [...ENDPOINTS_KEY, filters],
    queryFn: () => adminWebhooksApi.listEndpoints(filters),
    enabled,
    placeholderData: (previous) => previous,
  });
}

export function useAdminDeliveries(filters: DeliveryFilters, enabled = true) {
  return useQuery({
    queryKey: [...DELIVERIES_KEY, filters],
    queryFn: () => adminWebhooksApi.listDeliveries(filters),
    enabled,
    refetchInterval: enabled ? 30_000 : false,
    placeholderData: (previous) => previous,
  });
}

export function useAdminDelivery(id: string | null) {
  return useQuery({
    queryKey: ["admin-webhook-delivery", id],
    queryFn: () => adminWebhooksApi.getDelivery(id!),
    enabled: !!id,
  });
}

function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: HEALTH_KEY });
    queryClient.invalidateQueries({ queryKey: ENDPOINTS_KEY });
    queryClient.invalidateQueries({ queryKey: DELIVERIES_KEY });
  };
}

export function useToggleEndpoint() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminWebhooksApi.toggleEndpoint(id, isActive),
    onSuccess: invalidate,
  });
}

export function useAdminRedeliver() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => adminWebhooksApi.redeliver(id),
    onSuccess: invalidate,
  });
}
