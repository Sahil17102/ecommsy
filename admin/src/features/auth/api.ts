import { api, setAccessToken, getAccessToken } from "@/lib/api";
import type { User } from "./types";

export const authApi = {
  // ── Session (called on mount to restore auth via silent refresh) ──

  getSession: async (): Promise<User | null> => {
    try {
      // After page refresh the in-memory token is gone.
      // Proactively call /refresh to restore it before hitting /me,
      // avoiding a wasted 401 → refresh → retry cycle.
      if (!getAccessToken()) {
        const { data } = await api.post<{ accessToken: string }>("/auth/refresh");
        setAccessToken(data.accessToken);
      }

      const { data } = await api.get("/auth/me");
      return data.user as User;
    } catch (err) {
      // 401 = genuinely unauthenticated (expired/invalid token) → return null (no retry needed)
      // 5xx / network errors = transient → re-throw so TanStack Query retries
      const status = (err as any)?.status;
      if (status && status >= 400 && status < 500) return null;
      throw err;
    }
  },

  // ── Password login (admin-only) ──

  login: async (params: {
    email: string;
    password: string;
  }): Promise<{ user: User }> => {
    const { data } = await api.post("/auth/login", params);
    setAccessToken(data.accessToken);
    return { user: data.user as User };
  },

  // ── Logout ──

  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
    setAccessToken(null);
  },

  // ── Change own password (self-service) ──

  changePassword: async (params: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ message: string }> => {
    const { data } = await api.post("/auth/change-password", params);
    return data as { message: string };
  },
};
