import { api } from "@/lib/api";
import type { AdminDashboardData, DashboardFilters } from "./types";

export const dashboardApi = {
  get: async (filters?: DashboardFilters): Promise<AdminDashboardData> => {
    const params: Record<string, string | number> = {};
    if (filters?.days) params.days = filters.days;
    if (filters?.serviceProvider) params.serviceProvider = filters.serviceProvider;
    if (filters?.paymentType) params.paymentType = filters.paymentType;
    const { data } = await api.get("/dashboard", { params });
    return data as AdminDashboardData;
  },
};
