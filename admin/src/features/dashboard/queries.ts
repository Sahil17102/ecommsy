import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "./api";
import type { DashboardFilters } from "./types";

export const DASHBOARD_KEY = ["admin-dashboard"] as const;

export function useAdminDashboard(filters?: DashboardFilters) {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, filters],
    queryFn: () => dashboardApi.get(filters),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}
