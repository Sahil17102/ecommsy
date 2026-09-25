import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationSettingsApi } from "./api";
import type { UpdatePreferencePayload } from "./types";

const PREFS_KEY = ["admin", "notification-preferences"] as const;

export function useNotificationPreferences() {
  return useQuery({
    queryKey: [...PREFS_KEY],
    queryFn: notificationSettingsApi.getPreferences,
  });
}

export function useUpdatePreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePreferencePayload) =>
      notificationSettingsApi.updatePreference(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: PREFS_KEY }),
  });
}
