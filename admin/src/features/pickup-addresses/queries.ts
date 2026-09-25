import { useQuery } from "@tanstack/react-query";
import { pickupAddressApi } from "./api";

const ADMIN_PICKUP_ADDRESSES_KEY = ["admin-pickup-addresses"] as const;

export function useAdminPickupAddresses(userId: string) {
  return useQuery({
    queryKey: [...ADMIN_PICKUP_ADDRESSES_KEY, userId],
    queryFn: () => pickupAddressApi.listByUser(userId),
    select: (data) => data.addresses,
    enabled: !!userId,
  });
}
