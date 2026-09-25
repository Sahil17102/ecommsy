import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loading } from "@/components/common";

export function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/signup" replace />;
  if (user.onboardingComplete) return <Navigate to="/home" replace />;

  return <>{children}</>;
}
