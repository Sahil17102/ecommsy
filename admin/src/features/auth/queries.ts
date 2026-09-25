import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "./api";
import type { User } from "./types";

export const SESSION_QUERY_KEY = ["auth", "session"] as const;

const STALE_TIME_5M = 1000 * 60 * 5;

/** Restores the admin session on mount.
 *  The axios interceptor handles silent token refresh via the httpOnly cookie. */
export function useSession() {
  return useQuery<User | null>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: authApi.getSession,
    retry: 2,               // retry a couple times before giving up (handles transient failures)
    retryDelay: 1000,       // 1s between retries
    staleTime: STALE_TIME_5M,
    refetchOnWindowFocus: true, // re-check session when admin returns to tab
  });
}

/** Log in with email + password. */
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ user }) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, user);
    },
  });
}

/** Destroy the admin session and clear local auth state. */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
    },
  });
}

/** Change the logged-in admin's own password. */
export function useChangePassword() {
  return useMutation({
    mutationFn: authApi.changePassword,
  });
}
