import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/dashboardApi";
import type { DashboardFilters } from "@/lib/dashboardApi";

export const DASHBOARD_QUERY_KEY = ["dashboard"] as const;

export function useDashboard(filters?: DashboardFilters) {
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, "summary", filters],
    queryFn: () => dashboardApi.getSummary(filters),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}
