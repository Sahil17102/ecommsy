import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { locationsApi } from "./api";
import type {
  ListLocationsResponse,
  CreateLocationPayload,
  BulkImportPayload,
  BulkImportResponse,
  BulkDeletePayload,
  PincodeLookupResponse,
} from "./types";

export const LOCATIONS_KEY = ["locations"] as const;

function useInvalidateLocations() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: LOCATIONS_KEY });
}

export function useLocations(filters?: {
  search?: string;
  state?: string;
  tag?: string;
  isActive?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery<ListLocationsResponse>({
    queryKey: [...LOCATIONS_KEY, filters],
    queryFn: () => locationsApi.list(filters),
  });
}

export function useCreateLocation() {
  const onSuccess = useInvalidateLocations();
  return useMutation({
    mutationFn: (payload: CreateLocationPayload) =>
      locationsApi.create(payload),
    onSuccess,
  });
}

export function useBulkImportLocations() {
  const onSuccess = useInvalidateLocations();
  return useMutation<BulkImportResponse, Error, BulkImportPayload>({
    mutationFn: (payload) => locationsApi.bulkImport(payload),
    onSuccess,
  });
}

export function useDeleteLocation() {
  const onSuccess = useInvalidateLocations();
  return useMutation({
    mutationFn: (id: string) => locationsApi.delete(id),
    onSuccess,
  });
}

export function useBulkDeleteLocations() {
  const onSuccess = useInvalidateLocations();
  return useMutation({
    mutationFn: (payload: BulkDeletePayload) =>
      locationsApi.bulkDelete(payload),
    onSuccess,
  });
}

export function useToggleLocation() {
  const onSuccess = useInvalidateLocations();
  return useMutation({
    mutationFn: (id: string) => locationsApi.toggle(id),
    onSuccess,
  });
}

export function usePincodeLookup() {
  return useMutation<PincodeLookupResponse, Error, string>({
    mutationFn: (pincode) => locationsApi.lookupPincode(pincode),
  });
}
