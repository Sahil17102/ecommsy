import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { b2cZonesApi, b2cPricingApi } from "./api";
import type {
  ListZonesResponse,
  CreateZonePayload,
  UpdateZonePayload,
  ListPricingResponse,
  GetPricingByCourierResponse,
  UpsertPricingPayload,
  BatchUpsertPricingPayload,
  B2cPricingItem,
} from "./types";

// ── Zone Hooks ──

export const B2C_ZONES_KEY = ["b2c-zones"] as const;

function useInvalidateZones() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: B2C_ZONES_KEY });
}

export function useB2cZones(filters?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery<ListZonesResponse>({
    queryKey: [...B2C_ZONES_KEY, filters],
    queryFn: () => b2cZonesApi.list(filters),
  });
}

export function useCreateZone() {
  const onSuccess = useInvalidateZones();
  return useMutation({
    mutationFn: (payload: CreateZonePayload) => b2cZonesApi.create(payload),
    onSuccess,
  });
}

export function useUpdateZone() {
  const onSuccess = useInvalidateZones();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateZonePayload & { id: string }) =>
      b2cZonesApi.update(id, payload),
    onSuccess,
  });
}

export function useDeleteZone() {
  const onSuccess = useInvalidateZones();
  return useMutation({
    mutationFn: (id: string) => b2cZonesApi.delete(id),
    onSuccess,
  });
}

export function useToggleZone() {
  const onSuccess = useInvalidateZones();
  return useMutation({
    mutationFn: (id: string) => b2cZonesApi.toggle(id),
    onSuccess,
  });
}

// ── Pricing Hooks ──

export const B2C_PRICING_KEY = ["b2c-pricing"] as const;

function useInvalidatePricing() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: B2C_PRICING_KEY });
}

export function useB2cPricingList(filters?: {
  page?: number;
  limit?: number;
  plan?: string;
  courier?: string;
  serviceProvider?: string;
  mode?: string;
  minWeight?: number;
}) {
  return useQuery<ListPricingResponse>({
    queryKey: [...B2C_PRICING_KEY, "list", filters],
    queryFn: () => b2cPricingApi.list(filters),
  });
}

export function useB2cPricingByCourier(courierId: string | undefined, plan?: string) {
  return useQuery<GetPricingByCourierResponse>({
    queryKey: [...B2C_PRICING_KEY, "courier", courierId, plan],
    queryFn: () => b2cPricingApi.getByCourier(courierId!, plan),
    enabled: !!courierId,
  });
}

export function useAllPricingByCourier(courierId: string | undefined) {
  return useQuery<{ pricing: B2cPricingItem[] }>({
    queryKey: [...B2C_PRICING_KEY, "courier-all", courierId],
    queryFn: () => b2cPricingApi.getAllByCourier(courierId!),
    enabled: !!courierId,
  });
}

export function useUpsertPricing() {
  const onSuccess = useInvalidatePricing();
  return useMutation({
    mutationFn: (payload: UpsertPricingPayload) =>
      b2cPricingApi.upsert(payload),
    onSuccess,
  });
}

export function useBatchUpsertPricing() {
  const onSuccess = useInvalidatePricing();
  return useMutation({
    mutationFn: (payload: BatchUpsertPricingPayload) =>
      b2cPricingApi.batchUpsert(payload),
    onSuccess,
  });
}

export function useDeletePricing() {
  const onSuccess = useInvalidatePricing();
  return useMutation({
    mutationFn: (id: string) => b2cPricingApi.delete(id),
    onSuccess,
  });
}
