import { useQuery } from "@tanstack/react-query";
import { homeApi } from "@/lib/homeApi";

export const HOME_QUERY_KEY = ["home"] as const;

export function useHome() {
  return useQuery({
    queryKey: HOME_QUERY_KEY,
    queryFn: homeApi.get,
    staleTime: 30_000, // 30s — home page should feel fresh
    refetchInterval: 2 * 60_000, // auto-refresh every 2 minutes
  });
}
