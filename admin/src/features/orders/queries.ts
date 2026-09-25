import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ordersApi, type OrderFiltersParams, type NdrRtoFiltersParams } from "./api";
import type { ListOrdersResponse, GetOrderDetailResponse, TrackingEvent, NdrEventItem, RtoEventItem, OrderStatus, ExpandableOrderRelation, ListExportJobsResponse } from "./types";
import { message } from "antd";
import { downloadBlob } from "@/lib/utils";

export const ORDERS_KEY = ["admin-orders"] as const;

function useInvalidateOrders() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ORDERS_KEY });
}

// ── List & Detail ──

export function useAdminOrders(filters: OrderFiltersParams = {}) {
  return useQuery<ListOrdersResponse>({
    queryKey: [...ORDERS_KEY, filters],
    queryFn: () => ordersApi.list(filters),
  });
}

export function useAdminOrderDetail(
  id: string | undefined,
  expand?: ExpandableOrderRelation[],
) {
  return useQuery<GetOrderDetailResponse>({
    queryKey: [...ORDERS_KEY, "detail", id, expand],
    queryFn: () => ordersApi.getById(id!, expand),
    enabled: !!id,
  });
}

// ── Status Management ──

export function useUpdateOrderStatus() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; status: OrderStatus; remarks?: string; location?: string; ndrReason?: string; ndrNextAction?: string; rtoCharges?: number; codAmount?: number }) =>
      ordersApi.updateStatus(id, payload),
    onSuccess: () => {
      message.success("Status updated");
      invalidate();
    },
    onError: (err: Error) => message.error(err.message),
  });
}

export function useOrderTransitions(id: string | undefined) {
  return useQuery({
    queryKey: [...ORDERS_KEY, "transitions", id],
    queryFn: () => ordersApi.getTransitions(id!),
    enabled: !!id,
  });
}

export function useCancelOrder() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => ordersApi.cancelOrder(id, reason),
    onSuccess: () => {
      message.success("Order cancelled");
      invalidate();
    },
    onError: (err: Error) => message.error(err.message),
  });
}

// ── Tracking ──

export function useOrderTracking(id: string | undefined) {
  return useQuery<TrackingEvent[]>({
    queryKey: [...ORDERS_KEY, "tracking", id],
    queryFn: () => ordersApi.getTracking(id!),
    enabled: !!id,
  });
}

// ── NDR ──

export function useNdrOrders(params: NdrRtoFiltersParams = {}) {
  return useQuery({
    queryKey: [...ORDERS_KEY, "ndr", params],
    queryFn: () => ordersApi.listNdr(params),
  });
}

export function useNdrEvents(id: string | undefined) {
  return useQuery<NdrEventItem[]>({
    queryKey: [...ORDERS_KEY, "ndr-events", id],
    queryFn: () => ordersApi.getNdrEvents(id!),
    enabled: !!id,
  });
}

export function useRecordNdr() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; reason: string; remarks?: string; location?: string; nextAction?: string }) =>
      ordersApi.recordNdr(id, payload),
    onSuccess: () => {
      message.success("NDR recorded");
      invalidate();
    },
    onError: (err: Error) => message.error(err.message),
  });
}

export function useNdrAction() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; action: "reattempt" | "rto" | "reschedule"; remarks?: string; rescheduledDate?: string }) =>
      ordersApi.takeNdrAction(id, payload),
    onSuccess: () => {
      message.success("NDR action taken");
      invalidate();
    },
    onError: (err: Error) => message.error(err.message),
  });
}

// ── CSV export (async) ──

export const EXPORTS_KEY = [...ORDERS_KEY, "exports"] as const;

/**
 * Export history. While any job is still queued/processing the list polls so
 * the progress bar moves without the admin touching anything.
 */
export function useOrderExports(enabled = true, params: { page?: number; limit?: number } = {}) {
  return useQuery<ListExportJobsResponse>({
    queryKey: [...EXPORTS_KEY, params],
    queryFn: () => ordersApi.listExports(params),
    enabled,
    refetchInterval: (query) => {
      const jobs = query.state.data?.jobs ?? [];
      return jobs.some((j) => j.status === "queued" || j.status === "processing") ? 2000 : false;
    },
  });
}

export function useStartOrderExport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (filters: OrderFiltersParams) => ordersApi.startExport(filters),
    onSuccess: (res) => {
      message.success(
        res.reused
          ? "That export is already running — see export history"
          : "Export queued — you can keep working, it'll appear in export history",
      );
      qc.invalidateQueries({ queryKey: EXPORTS_KEY });
    },
    onError: (err: Error) => message.error(err.message),
  });
}

export function useRerunOrderExport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ordersApi.rerunExport(id),
    onSuccess: () => {
      message.success("Export re-queued");
      qc.invalidateQueries({ queryKey: EXPORTS_KEY });
    },
    onError: (err: Error) => message.error(err.message),
  });
}

export function useDownloadExport() {
  return useMutation({
    mutationFn: async (job: { id: string; fileName: string | null }) => {
      const blob = await ordersApi.downloadExport(job.id);
      downloadBlob(blob, job.fileName || `orders-export-${job.id}.csv`);
    },
    onError: (err: Error) => message.error(err.message),
  });
}

// ── RTO ──

export function useRtoOrders(params: NdrRtoFiltersParams & { rtoPhase?: string } = {}) {
  return useQuery({
    queryKey: [...ORDERS_KEY, "rto", params],
    queryFn: () => ordersApi.listRto(params),
  });
}

export function useRtoEvents(id: string | undefined) {
  return useQuery<RtoEventItem[]>({
    queryKey: [...ORDERS_KEY, "rto-events", id],
    queryFn: () => ordersApi.getRtoEvents(id!),
    enabled: !!id,
  });
}

export function useUpdateRtoPhase() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; phase: "initiated" | "in_transit" | "delivered"; remarks?: string; rtoCharges?: number }) =>
      ordersApi.updateRtoPhase(id, payload),
    onSuccess: () => {
      message.success("RTO phase updated");
      invalidate();
    },
    onError: (err: Error) => message.error(err.message),
  });
}
