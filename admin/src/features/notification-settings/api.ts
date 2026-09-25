import { api } from "@/lib/api";
import type { PreferencesResponse, UpdatePreferencePayload } from "./types";

export const notificationSettingsApi = {
  getPreferences: async (): Promise<PreferencesResponse> => {
    const { data } = await api.get<PreferencesResponse>("/notifications/preferences");
    return data;
  },
  updatePreference: async (payload: UpdatePreferencePayload): Promise<void> => {
    await api.put("/notifications/preferences", payload);
  },
};
