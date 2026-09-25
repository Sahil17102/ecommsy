import { useQuery, useMutation } from "@tanstack/react-query";
import { reportsApi } from "./api";
import type { ReportFilters } from "./types";

export const REPORTS_KEY = ["admin", "reports"] as const;

export function useReportFields() {
  return useQuery({
    queryKey: [...REPORTS_KEY, "fields"],
    queryFn: reportsApi.getFields,
    staleTime: Infinity,
  });
}

export function useReportPreview(
  filters: ReportFilters,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...REPORTS_KEY, "preview", filters],
    queryFn: () => reportsApi.getPreview(filters),
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
}

export function useDownloadReport() {
  return useMutation({
    mutationFn: ({ fields, filters }: { fields: string[]; filters: ReportFilters }) =>
      reportsApi.downloadCsv(fields, filters),
  });
}
