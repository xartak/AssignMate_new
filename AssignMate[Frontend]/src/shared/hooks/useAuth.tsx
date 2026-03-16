import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type AuthState = {
  token: string | null;
  role: string | null;
  userId: number | null;
};

type AuthContextValue = AuthState & {
  login: (payload: { token: string; role: string | null; userId: number | null }) => void;
  logout: () => void;
};

function normalizeRole(role: string | null) {
  return role ? role.toLowerCase() : null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => ({
    token: localStorage.getItem("auth_token"),
    role: normalizeRole(localStorage.getItem("auth_role")),
    userId: localStorage.getItem("auth_user_id")
      ? Number(localStorage.getItem("auth_user_id"))
      : null,
  }));

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login: ({ token, role, userId }) => {
        const normalizedRole = normalizeRole(role);
        localStorage.setItem("auth_token", token);
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
        setState({ token, role: normalizedRole, userId });
      },
      logout: () => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_role");
        localStorage.removeItem("auth_user_id");
        setState({ token: null, role: null, userId: null });
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
