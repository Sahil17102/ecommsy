import { api } from "@/lib/api";
import type { PickupAddressesResponse } from "./types";

export const pickupAddressApi = {
  listByUser: async (userId: string): Promise<PickupAddressesResponse> => {
    const { data } = await api.get(`/users/${userId}/pickup-addresses`);
    return data;
  },
};
