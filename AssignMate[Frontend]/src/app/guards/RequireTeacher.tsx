import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";

export function RequireTeacher({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const allowedRoles = new Set(["teacher", "admin", "assistant"]);
  if (!role || !allowedRoles.has(role)) {
    return <Navigate to="/courses" replace />;
  }
  return <>{children}</>;
}
