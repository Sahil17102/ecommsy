import { useQuery, useMutation } from "@tanstack/react-query";
import { reportsApi, type ReportFilters } from "@/lib/reportsApi";

export function useReportFields() {
  return useQuery({
    queryKey: ["reports", "fields"],
    queryFn: reportsApi.getFields,
    staleTime: Infinity,
  });
}

export function useReportPreview(
  filters: ReportFilters,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["reports", "preview", filters],
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
