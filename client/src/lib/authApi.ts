import { api, setAccessToken, getAccessToken } from "./api";
import type { User } from "@/contexts/AuthContext";

export const authApi = {
  // ── Session ──

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

  // ── OTP flow ──

  sendOtp: async (email: string): Promise<{ isNewUser: boolean; devOtp?: string }> => {
    const { data } = await api.post("/auth/send-otp", { email });
    return data as { isNewUser: boolean; devOtp?: string };
  },

  verifyOtp: async (params: {
    identifier: string;
    code: string;
  }): Promise<{ user: User; isNewUser: boolean }> => {
    const { data } = await api.post("/auth/verify-otp", { email: params.identifier, code: params.code });
    setAccessToken(data.accessToken);
    return { user: data.user as User, isNewUser: data.isNewUser };
  },

  // ── Password login ──

  loginWithPassword: async (params: {
    identifier: string;
    password: string;
  }): Promise<{ user: User }> => {
    const { data } = await api.post("/auth/login", { identifier: params.identifier, password: params.password });
    setAccessToken(data.accessToken);
    return { user: data.user as User };
  },

  // ── Google OAuth ──

  loginWithGoogle: async (params: {
    accessToken: string;
  }): Promise<{ user: User; isNewUser: boolean }> => {
    const { data } = await api.post("/auth/google", params);
    setAccessToken(data.accessToken);
    return { user: data.user as User, isNewUser: data.isNewUser };
  },

  // ── Onboarding ──

  onboarding: async (payload: Record<string, unknown>): Promise<{ user: User }> => {
    const { data } = await api.post("/auth/onboarding", payload);
    return data as { user: User };
  },

  // ── Logout ──

  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
    setAccessToken(null);
  },
};
