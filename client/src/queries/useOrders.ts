import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { ordersApi, type CreateOrderPayload, type TrackingEvent, type OrderListParams, type BulkCreateResponse, type NdrRtoFilterParams } from "@/lib/ordersApi";
import { toast } from "sonner";

export const ORDERS_QUERY_KEY = ["orders"] as const;

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => ordersApi.create(payload),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      toast.success("Order created successfully", {
        description: `AWB: ${order.awb} — ${order.serviceProvider}`,
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to create order", {
        description: error.message,
      });
    },
  });
}

export function useOrders(params?: OrderListParams) {
  return useQuery({
    queryKey: [...ORDERS_QUERY_KEY, "list", params],
    queryFn: () => ordersApi.getAll(params),
    placeholderData: keepPreviousData,
  });
}

/** Courier options for the orders filter — derived from the seller's own orders. */
export function useOrderCourierOptions(orderType?: string) {
  return useQuery({
    queryKey: [...ORDERS_QUERY_KEY, "courier-options", orderType ?? "all"],
    queryFn: () => ordersApi.getCourierOptions(orderType),
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: [...ORDERS_QUERY_KEY, id],
    queryFn: () => ordersApi.getById(id),
    enabled: !!id,
  });
}

export function useBulkCreateOrders() {
  const queryClient = useQueryClient();
  return useMutation<BulkCreateResponse, Error, CreateOrderPayload[]>({
    mutationFn: (orders) => ordersApi.bulkCreate(orders),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      if (result.failedCount === 0) {
        toast.success(`${result.successCount} order${result.successCount !== 1 ? "s" : ""} created`);
      } else {
        toast.warning(`${result.successCount} succeeded, ${result.failedCount} failed`, {
          description: "Check the results below for per-row errors.",
        });
      }
    },
    onError: (error) => {
      toast.error("Bulk upload failed", { description: error.message });
    },
  });
}

type ManifestOutcome = {
  ordersProcessed: number;
  errors: Array<{ awb: string; error: string }>;
  warnings?: Array<{ awb: string; warning: string }>;
};

/**
 * One toast for both manifest flows, with three distinct outcomes:
 *  - some orders failed the courier pickup outright  → warning + the reason
 *  - all went through, but on a pickup the courier already had (Delhivery's
 *    `pr_exist`) → warning, because the courier raised NOTHING new for them
 *  - a real, fresh pickup for every order            → success
 */
function showManifestToast(result: ManifestOutcome, successDescription: string) {
  const warnings = result.warnings ?? [];

  if (result.errors.length > 0) {
    // Partial success (total failure now returns a non-2xx → onError).
    toast.warning(`Pickup initiated for ${result.ordersProcessed}, ${result.errors.length} failed`, {
      description: result.errors[0]?.error,
    });
    return;
  }

  if (warnings.length > 0) {
    toast.warning(`No new pickup raised for ${warnings.length} order(s)`, {
      description: warnings[0]?.warning,
    });
    return;
  }

  toast.success(`Pickup initiated for ${result.ordersProcessed} order(s)`, {
    description: successDescription,
  });
}

export function useBulkManifest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderIds: string[]) => ordersApi.bulkManifest(orderIds),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      showManifestToast(result, "All processed successfully");
    },
    onError: (error: Error) => {
      toast.error("Initiate pickup failed", { description: error.message });
    },
  });
}

export function useManifestOrders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderIds: string[]) => ordersApi.manifestOrders(orderIds),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      showManifestToast(result, "All orders processed successfully");
    },
    onError: (error: Error) => {
      toast.error("Initiate pickup failed", { description: error.message });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => ordersApi.cancelOrder(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      toast.success("Order cancelled");
    },
    onError: (error: Error) => {
      toast.error("Cancel failed", { description: error.message });
    },
  });
}

export function useOrderTracking(id: string) {
  return useQuery<TrackingEvent[]>({
    queryKey: [...ORDERS_QUERY_KEY, "tracking", id],
    queryFn: () => ordersApi.getTracking(id),
    enabled: !!id,
  });
}

// ── NDR ──

export function useNdrOrders(params: NdrRtoFilterParams = {}) {
  return useQuery({
    queryKey: [...ORDERS_QUERY_KEY, "ndr", params],
    queryFn: () => ordersApi.listNdr(params),
  });
}

export function useNdrAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; action: "reattempt" | "rto" | "reschedule"; remarks?: string }) =>
      ordersApi.takeNdrAction(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      toast.success("NDR action submitted");
    },
    onError: (error: Error) => {
      toast.error("NDR action failed", { description: error.message });
    },
  });
}

// ── RTO ──

export function useRtoOrders(params: NdrRtoFilterParams & { rtoPhase?: string } = {}) {
  return useQuery({
    queryKey: [...ORDERS_QUERY_KEY, "rto", params],
    queryFn: () => ordersApi.listRto(params),
  });
}
