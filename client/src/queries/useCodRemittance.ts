import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { codRemittanceApi } from "@/lib/codRemittanceApi";
import { STALE_TIME_5M } from "@/lib/constants";

export const COD_REMITTANCE_KEY = ["cod-remittance"] as const;
export const COD_REMITTANCE_STATS_KEY = ["cod-remittance", "stats"] as const;

export function useCodRemittanceStats() {
  return useQuery({
    queryKey: COD_REMITTANCE_STATS_KEY,
    queryFn: codRemittanceApi.getStats,
    staleTime: STALE_TIME_5M,
  });
}

export function useCodRemittances(params?: {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: string;
}) {
  return useQuery({
    queryKey: [...COD_REMITTANCE_KEY, "list", params],
    queryFn: () => codRemittanceApi.list(params),
    staleTime: STALE_TIME_5M,
    placeholderData: keepPreviousData,
  });
}
