import { Navigate } from "react-router";
import { useUserStore } from "@/frontend/stores/UserStore";

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, token } = useUserStore();

  // Not authenticated at all
  if (!user || !token) {
    return <Navigate to="/chat" replace />;
  }

  // Authenticated but not the admin user
  if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
