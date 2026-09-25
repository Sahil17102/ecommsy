import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIME_5M } from "@/lib/constants";
import { labelSettingsApi } from "./api";
import { LABEL_SETTINGS_QUERY_KEY } from "./config";
import type { LabelSettings } from "./types";

export function useLabelSettings() {
  return useQuery({
    queryKey: LABEL_SETTINGS_QUERY_KEY,
    queryFn: labelSettingsApi.get,
    staleTime: STALE_TIME_5M,
    select: (data) => data.settings,
  });
}

export function useUpdateLabelSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<LabelSettings>) => labelSettingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LABEL_SETTINGS_QUERY_KEY });
    },
  });
}

export function useUploadLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => labelSettingsApi.uploadLogo(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LABEL_SETTINGS_QUERY_KEY });
    },
  });
}
