import { useQuery } from "@tanstack/react-query";
import { pincodeApi } from "@/lib/pincodeApi";
import { regex, STALE_TIME_1H } from "@/lib/constants";

export function usePincodeLookup(pincode: string) {
  return useQuery({
    queryKey: ["pincode", pincode],
    queryFn: () => pincodeApi.lookup(pincode),
    enabled: regex.pincode.test(pincode),
    staleTime: STALE_TIME_1H,
    retry: 1,
  });
}
