import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { webhooksApi, type DeliveryQuery } from "./api";
import type { WebhookFormValues } from "./types";

const ENDPOINTS_KEY = ["webhooks"] as const;
const DELIVERIES_KEY = ["webhook-deliveries"] as const;

export function useWebhooks() {
  return useQuery({
    queryKey: ENDPOINTS_KEY,
    queryFn: webhooksApi.list,
  });
}

/**
 * Deliveries are the live health signal, so they refetch on an interval while
 * the drawer is open rather than going stale behind the user.
 */
export function useWebhookDeliveries(query: DeliveryQuery, enabled = true) {
  return useQuery({
    queryKey: [...DELIVERIES_KEY, query],
    queryFn: () => webhooksApi.listDeliveries(query),
    enabled,
    refetchInterval: enabled ? 15_000 : false,
    placeholderData: (previous) => previous,
  });
}

function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ENDPOINTS_KEY });
    queryClient.invalidateQueries({ queryKey: DELIVERIES_KEY });
  };
}

export function useCreateWebhook() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (payload: WebhookFormValues) => webhooksApi.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateWebhook() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<WebhookFormValues> & { isActive?: boolean } }) =>
      webhooksApi.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteWebhook() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => webhooksApi.remove(id),
    onSuccess: invalidate,
  });
}

export function useRotateSecret() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => webhooksApi.rotateSecret(id),
    onSuccess: invalidate,
  });
}

export function useSendTestWebhook() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, event }: { id: string; event?: string }) => webhooksApi.sendTest(id, event),
    onSuccess: invalidate,
  });
}

export function useRedeliver() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (deliveryId: string) => webhooksApi.redeliver(deliveryId),
    onSuccess: invalidate,
  });
}
