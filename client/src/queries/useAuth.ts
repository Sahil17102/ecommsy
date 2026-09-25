import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@/contexts/AuthContext";
import { authApi } from "@/lib/authApi";
import { STALE_TIME_5M } from "@/lib/constants";

export const SESSION_QUERY_KEY = ["auth", "session"] as const;

/** Restores the logged-in user on mount by calling /auth/me.
 *  If the access token is gone (page refresh), the axios interceptor silently
 *  calls /auth/refresh first using the httpOnly cookie, then retries /auth/me. */
export function useSession() {
  return useQuery<User | null>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: authApi.getSession,
    retry: 2,               // retry a couple times before giving up (handles transient failures)
    retryDelay: 1000,       // 1s between retries
    staleTime: STALE_TIME_5M,
    refetchOnWindowFocus: true, // re-check session when user returns to tab
  });
}

/** Send OTP to the given identifier (email or phone). */
export function useSendOtp() {
  return useMutation({
    mutationFn: authApi.sendOtp,
  });
}

/** Verify OTP and log in — updates the session cache on success. */
export function useVerifyOtp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: ({ user }) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, user);
    },
  });
}

/** Log in with email/phone + password — updates the session cache on success. */
export function useLoginWithPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.loginWithPassword,
    onSuccess: ({ user }) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, user);
    },
  });
}

/** Log in with Google credential — updates the session cache on success. */
export function useLoginWithGoogle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.loginWithGoogle,
    onSuccess: ({ user }) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, user);
    },
  });
}

/** Complete the onboarding form. */
export function useOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.onboarding,
    onSuccess: ({ user }) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, user);
    },
  });
}

/** Destroy the server session and clear local auth state. */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
    },
  });
}
