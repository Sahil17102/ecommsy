import { publicApi } from "@/lib/api";
import type { AvailableCourier, AvailableCouriersParams } from "./types";

export const rateCalculatorApi = {
  getAvailableCouriers: async (
    params: AvailableCouriersParams,
  ): Promise<AvailableCourier[]> => {
    const { data } = await publicApi.post<{ success: boolean; data: AvailableCourier[] }>(
      "/rates/available",
      params,
    );
    return data.data;
  },
};
