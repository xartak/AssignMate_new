import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";

export function RequireTeacher({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  if (role !== "teacher") {
    return <Navigate to="/courses" replace />;
  }
  return <>{children}</>;
}
