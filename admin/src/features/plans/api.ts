import { api } from "@/lib/api";
import type {
  ListPlansResponse,
  CreatePlanPayload,
  UpdatePlanPayload,
  Plan,
} from "./types";

export const plansApi = {
  list: async (params?: { isActive?: boolean }) => {
    const { data } = await api.get<ListPlansResponse>("/plans", { params });
    return data;
  },

  create: async (payload: CreatePlanPayload) => {
    const { data } = await api.post<{ message: string; plan: Plan }>(
      "/plans",
      payload,
    );
    return data;
  },

  update: async (id: string, payload: UpdatePlanPayload) => {
    const { data } = await api.put<{ message: string; plan: Plan }>(
      `/plans/${id}`,
      payload,
    );
    return data;
  },

  delete: async (id: string) => {
    await api.delete(`/plans/${id}`);
  },

  toggle: async (id: string) => {
    const { data } = await api.patch<{ message: string; plan: Plan }>(
      `/plans/${id}/toggle`,
    );
    return data;
  },
};
