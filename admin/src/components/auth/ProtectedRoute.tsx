import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import FullPageLoader from "@/components/common/FullPageLoader";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <FullPageLoader />;

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

/**
 * Gates a route to superadmins only. Renders its children if the current user
 * has `role: "superadmin"`, otherwise redirects to the dashboard.
 */
export function SuperadminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isSuperadmin } = useAuth();

  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isSuperadmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}
