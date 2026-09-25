import { api } from "@/lib/api";
import type { ProfileResponse, ProfileUpdatePayload } from "./types";

export const profileApi = {
  get: async (): Promise<ProfileResponse> => {
    const { data } = await api.get("/profile");
    return data;
  },

  update: async (payload: ProfileUpdatePayload): Promise<ProfileResponse> => {
    const { data } = await api.put("/profile", payload);
    return data;
  },
};
