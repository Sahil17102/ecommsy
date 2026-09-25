import { api } from "@/lib/api";

export interface ChangePasswordPayload {
  currentPassword?: string;
  newPassword: string;
}

export const passwordApi = {
  change: async (payload: ChangePasswordPayload): Promise<{ message: string }> => {
    const { data } = await api.post("/auth/change-password", payload);
    return data;
  },
};
