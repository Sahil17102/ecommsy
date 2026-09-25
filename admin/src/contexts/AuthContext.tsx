import { createContext, useContext, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession, useLogout, SESSION_QUERY_KEY } from "@/features/auth/queries";
import { setOnSessionExpired } from "@/lib/api";
import type { User } from "@/features/auth/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLoggingOut: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  /** Convenience: true when role is "superadmin". */
  isSuperadmin: boolean;
  /**
   * `useCan(permission)` — returns true if the current user is allowed to
   * perform the action. Superadmin always passes. Staff admins pass only if
   * the permission is in their `permissions` array.
   *
   * Use this to disable buttons + show "ask your administrator" tooltips
   * across the app. Server-side gates also enforce the same checks.
   */
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user = null, isLoading, isError, isFetching } = useSession();
  const logoutMutation = useLogout();

  // Treat "retrying after error" the same as initial loading so ProtectedRoute
  // shows a loader instead of redirecting to login during transient server outages.
  const loading = isLoading || (isError && isFetching);

  // When the refresh token fails mid-session, invalidate the query so TanStack
  // retries getSession (which re-attempts /refresh). Only truly expired tokens
  // will result in null after retries are exhausted — transient failures recover.
  useEffect(() => {
    setOnSessionExpired(() => {
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    });
    return () => setOnSessionExpired(null);
  }, [queryClient]);

  const login = useCallback(
    (u: User) => queryClient.setQueryData(SESSION_QUERY_KEY, u),
    [queryClient],
  );

  const logout = useCallback(
    async () => { await logoutMutation.mutateAsync(); },
    [logoutMutation],
  );

  const isSuperadmin = user?.role === "superadmin";
  const permissionSet = useMemo(
    () => new Set(user?.permissions ?? []),
    [user?.permissions],
  );

  const can = useCallback(
    (permission: string) => isSuperadmin || permissionSet.has(permission),
    [isSuperadmin, permissionSet],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoggingOut: logoutMutation.isPending,
        login,
        logout,
        isSuperadmin,
        can,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Sugar for permission checks at call sites: `useCan("wallet.adjust")`. */
export function useCan(permission: string): boolean {
  return useAuth().can(permission);
}

/** Sugar for role gating: `if (useIsSuperadmin())`. */
export function useIsSuperadmin(): boolean {
  return useAuth().isSuperadmin;
}

/** Sugar for the staff admin's assigned sellers. Empty for superadmin. */
export function useAssignedSellerIds(): string[] {
  return useAuth().user?.assignedSellerIds ?? [];
}
