import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ratesApi,
  type DelhiveryRate,
  type AvailableCourier,
  type AvailableCouriersParams,
  type B2bAvailableCourier,
  type B2bAvailableCouriersParams,
  type RateCardResponse,
} from "@/lib/ratesApi";

export type { DelhiveryRate, AvailableCourier, B2bAvailableCourier, RateCardResponse };

/** Fetch a Delhivery shipping rate on demand. */
export function useDelhiveryRate() {
  return useMutation({
    mutationFn: ratesApi.getDelhiveryRate,
  });
}

/** Fetch available couriers with rates for given shipment params. */
export function useAvailableCouriers() {
  return useMutation<AvailableCourier[], Error, AvailableCouriersParams>({
    mutationFn: ratesApi.getAvailableCouriers,
  });
}

const RATE_CARD_KEY = ["rate-card"];

/** Fetch the user's rate card (pricing for their plan). */
export function useRateCard() {
  return useQuery<RateCardResponse>({
    queryKey: RATE_CARD_KEY,
    queryFn: ratesApi.getRateCard,
  });
}

/** Fetch available B2B couriers with per-kg rates and overhead breakdown. */
export function useB2bAvailableCouriers() {
  return useMutation<B2bAvailableCourier[], Error, B2bAvailableCouriersParams>({
    mutationFn: ratesApi.getB2bAvailableCouriers,
  });
}
