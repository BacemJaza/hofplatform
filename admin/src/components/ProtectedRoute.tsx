import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Spinner } from "@/components/ui";

export function ProtectedRoute() {
  const { authenticated, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!authenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { authenticated, loading } = useAuth();

  if (loading) return <Spinner />;
  if (authenticated) return <Navigate to="/products" replace />;
  return <Outlet />;
}
