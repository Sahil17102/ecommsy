import { useMutation } from "@tanstack/react-query";
import { rateCalculatorApi } from "./api";
import type { AvailableCourier, AvailableCouriersParams } from "./types";

export function useAvailableCouriers() {
  return useMutation<AvailableCourier[], Error, AvailableCouriersParams>({
    mutationFn: rateCalculatorApi.getAvailableCouriers,
  });
}
