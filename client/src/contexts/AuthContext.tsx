import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession, useLogout, SESSION_QUERY_KEY } from "@/queries/useAuth";
import { setOnSessionExpired } from "@/lib/api";

export type UserRole = "user" | "admin";
export type TeamRole = "owner" | "member";

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  teamRole: TeamRole;
  parentUserId: string | null;
  isVerified: boolean;
  onboardingComplete: boolean;
  hasPassword: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user = null, isLoading, isError, isFetching } = useSession();

  // Treat "retrying after error" the same as initial loading so ProtectedRoute
  // shows a loader instead of redirecting to login during transient server outages.
  const loading = isLoading || (isError && isFetching);
  const logoutMutation = useLogout();

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

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
