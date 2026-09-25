import { useQuery } from "@tanstack/react-query";
import { brandApi } from "@/lib/brandApi";

/**
 * Prefetch and cache a brand logo via TanStack Query.
 * Returns the resolved image src (blob URL) on success, or null on failure.
 */
export function useBrandLogo(domain: string, size: number) {
  return useQuery({
    queryKey: ["brand-logo", domain, size],
    queryFn: () => brandApi.fetchLogo(domain, size),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30, // keep in cache for 30 min
    retry: 1,
  });
}
