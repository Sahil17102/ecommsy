import { api } from "@/lib/api";
import type { CreateCourierPayload, UpdateCourierPayload, ListCouriersResponse } from "./types";

export const couriersApi = {
  list: async (params?: { serviceProvider?: string; businessType?: string; isEnabled?: string; page?: number; limit?: number }): Promise<ListCouriersResponse> => {
    const { data } = await api.get("/couriers", { params });
    return data as ListCouriersResponse;
  },

  create: async (payload: CreateCourierPayload): Promise<{ id: string; name: string; serviceProvider: string }> => {
    const { data } = await api.post("/couriers", payload);
    return data.courier as { id: string; name: string; serviceProvider: string };
  },

  update: async (id: string, payload: UpdateCourierPayload): Promise<{ id: string; name: string; serviceProvider: string }> => {
    const { data } = await api.patch(`/couriers/${id}`, payload);
    return data.courier as { id: string; name: string; serviceProvider: string };
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/couriers/${id}`);
  },

  toggle: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.patch(`/couriers/${id}/toggle`);
    return data as { message: string };
  },
};
