import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { b2bZonesApi, b2bPincodesApi, b2bZoneRatesApi, b2bAdditionalChargesApi, b2bRateCalculatorApi } from "./api";
import type {
  CreateB2bPincodePayload,
  UpsertB2bZoneRatePayload,
  UpsertB2bAdditionalChargePayload,
  CalculateB2bRatePayload,
  B2bZone,
} from "./types";

// ── Zone Hooks ──

export const B2B_ZONES_KEY = ["b2b-zones"] as const;

function useInvalidateZones() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: B2B_ZONES_KEY });
}

export function useB2bZones() {
  return useQuery({
    queryKey: B2B_ZONES_KEY,
    queryFn: () => b2bZonesApi.list(),
  });
}

export function useCreateB2bZone() {
  const onSuccess = useInvalidateZones();
  return useMutation({
    mutationFn: (payload: { code: string; name: string; description?: string }) =>
      b2bZonesApi.create(payload),
    onSuccess,
  });
}

export function useUpdateB2bZone() {
  const onSuccess = useInvalidateZones();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<B2bZone> & { id: string }) =>
      b2bZonesApi.update(id, payload),
    onSuccess,
  });
}

export function useDeleteB2bZone() {
  const onSuccess = useInvalidateZones();
  return useMutation({
    mutationFn: (id: string) => b2bZonesApi.delete(id),
    onSuccess,
  });
}

export function useToggleB2bZone() {
  const onSuccess = useInvalidateZones();
  return useMutation({
    mutationFn: (id: string) => b2bZonesApi.toggle(id),
    onSuccess,
  });
}

// ── Pincode Hooks ──

export const B2B_PINCODES_KEY = ["b2b-pincodes"] as const;

function useInvalidatePincodes() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: B2B_PINCODES_KEY });
}

export function useB2bPincodes(filters?: {
  pincode?: string;
  zone?: string;
  courier?: string;
  serviceProvider?: string;
  isOda?: string;
  isRemote?: string;
  isCsd?: string;
  isMall?: string;
  isSez?: string;
  isAirport?: string;
  isHighSecurity?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...B2B_PINCODES_KEY, filters],
    queryFn: () => b2bPincodesApi.list(filters),
  });
}

export function useCreateB2bPincode() {
  const onSuccess = useInvalidatePincodes();
  return useMutation({
    mutationFn: (payload: CreateB2bPincodePayload) => b2bPincodesApi.create(payload),
    onSuccess,
  });
}

export function useUpdateB2bPincode() {
  const onSuccess = useInvalidatePincodes();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<CreateB2bPincodePayload> & { id: string }) =>
      b2bPincodesApi.update(id, payload),
    onSuccess,
  });
}

export function useDeleteB2bPincode() {
  const onSuccess = useInvalidatePincodes();
  return useMutation({
    mutationFn: (id: string) => b2bPincodesApi.delete(id),
    onSuccess,
  });
}

export function useBulkImportB2bPincodes() {
  const onSuccess = useInvalidatePincodes();
  return useMutation({
    mutationFn: (pincodes: CreateB2bPincodePayload[]) => b2bPincodesApi.bulkImport(pincodes),
    onSuccess,
  });
}

// ── Zone Rate Hooks ──

export const B2B_ZONE_RATES_KEY = ["b2b-zone-rates"] as const;

function useInvalidateZoneRates() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: B2B_ZONE_RATES_KEY });
}

export function useB2bZoneRates(filters?: {
  courier?: string;
  plan?: string;
  originZone?: string;
  destinationZone?: string;
}) {
  return useQuery({
    queryKey: [...B2B_ZONE_RATES_KEY, filters],
    queryFn: () => b2bZoneRatesApi.list(filters),
  });
}

export function useUpsertB2bZoneRate() {
  const onSuccess = useInvalidateZoneRates();
  return useMutation({
    mutationFn: (payload: UpsertB2bZoneRatePayload) => b2bZoneRatesApi.upsert(payload),
    onSuccess,
  });
}

export function useBatchUpsertB2bZoneRates() {
  const onSuccess = useInvalidateZoneRates();
  return useMutation({
    mutationFn: (rates: UpsertB2bZoneRatePayload[]) => b2bZoneRatesApi.batchUpsert(rates),
    onSuccess,
  });
}

export function useDeleteB2bZoneRate() {
  const onSuccess = useInvalidateZoneRates();
  return useMutation({
    mutationFn: (id: string) => b2bZoneRatesApi.delete(id),
    onSuccess,
  });
}

// ── Additional Charges Hooks ──

export const B2B_ADDITIONAL_CHARGES_KEY = ["b2b-additional-charges"] as const;

function useInvalidateAdditionalCharges() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: B2B_ADDITIONAL_CHARGES_KEY });
}

export function useB2bAdditionalCharges(filters?: {
  courier?: string;
  plan?: string;
}) {
  return useQuery({
    queryKey: [...B2B_ADDITIONAL_CHARGES_KEY, filters],
    queryFn: () => b2bAdditionalChargesApi.list(filters),
  });
}

export function useUpsertB2bAdditionalCharges() {
  const onSuccess = useInvalidateAdditionalCharges();
  return useMutation({
    mutationFn: (payload: UpsertB2bAdditionalChargePayload) => b2bAdditionalChargesApi.upsert(payload),
    onSuccess,
  });
}

export function useDeleteB2bAdditionalCharge() {
  const onSuccess = useInvalidateAdditionalCharges();
  return useMutation({
    mutationFn: (id: string) => b2bAdditionalChargesApi.delete(id),
    onSuccess,
  });
}

// ── Rate Calculator Hook ──

export function useCalculateB2bRate() {
  return useMutation({
    mutationFn: (payload: CalculateB2bRatePayload) => b2bRateCalculatorApi.calculate(payload),
  });
}
