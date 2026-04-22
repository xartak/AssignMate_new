import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { logoutRequest } from "@/features/auth/api";

export type AuthState = {
  token: string | null;
  refreshToken: string | null;
  role: string | null;
  userId: number | null;
};

type AuthContextValue = AuthState & {
  login: (payload: {
    token: string;
    refreshToken: string;
    role: string | null;
    userId: number | null;
  }) => void;
  logout: () => void;
};

function normalizeRole(role: string | null) {
  return role ? role.toLowerCase() : null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => ({
    token: localStorage.getItem("auth_token"),
    refreshToken: localStorage.getItem("auth_refresh"),
    role: normalizeRole(localStorage.getItem("auth_role")),
    userId: localStorage.getItem("auth_user_id")
      ? Number(localStorage.getItem("auth_user_id"))
      : null,
  }));

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login: ({ token, refreshToken, role, userId }) => {
        const normalizedRole = normalizeRole(role);
        localStorage.setItem("auth_token", token);
        localStorage.setItem("auth_refresh", refreshToken);
        if (normalizedRole) {
          localStorage.setItem("auth_role", normalizedRole);
        } else {
          localStorage.removeItem("auth_role");
        }
        if (userId) {
          localStorage.setItem("auth_user_id", String(userId));
        } else {
          localStorage.removeItem("auth_user_id");
        }
        setState({ token, refreshToken, role: normalizedRole, userId });
      },
      logout: () => {
        const refresh = state.refreshToken;
        if (refresh) {
          logoutRequest(refresh).catch(() => {});
        }
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_refresh");
        localStorage.removeItem("auth_role");
        localStorage.removeItem("auth_user_id");
        setState({ token: null, refreshToken: null, role: null, userId: null });
      },
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
