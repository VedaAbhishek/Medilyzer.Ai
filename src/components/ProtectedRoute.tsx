import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: "patient" | "doctor";
}

const ProtectedRoute = ({ children, allowedRole }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && profile && profile.role !== allowedRole) {
    return <Navigate to={profile.role === "doctor" ? "/doctor-dashboard" : "/dashboard"} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
