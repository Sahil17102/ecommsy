import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIME_5M } from "@/lib/constants";
import { pickupAddressApi } from "./api";
import { PICKUP_ADDRESS_QUERY_KEY } from "./config";
import type { PickupAddressFormValues, BulkAddressImportRow } from "./types";

// ── Queries ──

export function usePickupAddresses() {
  return useQuery({
    queryKey: PICKUP_ADDRESS_QUERY_KEY,
    queryFn: pickupAddressApi.list,
    staleTime: STALE_TIME_5M,
    select: (data) => data.addresses,
  });
}

// ── Mutations ──

export function useCreatePickupAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PickupAddressFormValues) => pickupAddressApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PICKUP_ADDRESS_QUERY_KEY });
    },
  });
}

export function useBulkImportPickupAddresses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (addresses: BulkAddressImportRow[]) => pickupAddressApi.bulkImport(addresses),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PICKUP_ADDRESS_QUERY_KEY });
    },
  });
}

export function useUpdatePickupAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PickupAddressFormValues> }) =>
      pickupAddressApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PICKUP_ADDRESS_QUERY_KEY });
    },
  });
}

export function useDeletePickupAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pickupAddressApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PICKUP_ADDRESS_QUERY_KEY });
    },
  });
}

export function useSetPrimaryAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pickupAddressApi.setPrimary(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PICKUP_ADDRESS_QUERY_KEY });
    },
  });
}
