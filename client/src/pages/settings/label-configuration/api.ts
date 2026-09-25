import { api } from "@/lib/api";
import type { LabelSettings, LabelSettingsResponse } from "./types";

export const labelSettingsApi = {
  get: async (): Promise<LabelSettingsResponse> => {
    const { data } = await api.get("/label-settings");
    return data;
  },

  update: async (payload: Partial<LabelSettings>): Promise<LabelSettingsResponse> => {
    const { data } = await api.put("/label-settings", payload);
    return data;
  },

  uploadLogo: async (file: File): Promise<{ logoUrl: string }> => {
    const formData = new FormData();
    formData.append("logo", file);
    const { data } = await api.post("/label-settings/logo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};
