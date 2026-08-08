import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Role, User } from "@/types";
import * as authApi from "@/services/api/auth";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

export type Permission =
  | "users.manage"
  | "logs.view"
  | "security.view"
  | "settings.manage"
  | "routing.manage"
  | "conversations.viewAll"
  | "conversations.assign";

const AGENT_PERMISSIONS: Permission[] = ["conversations.assign"];

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    authApi
      .me()
      .then((u) => {
        if (active) setUser(u);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const session = await authApi.login(username, password);
    setUser(session.user);
    return session.user;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const role: Role | undefined = user?.role;
    const can = (permission: Permission) => {
      if (!role) return false;
      if (role === "SUPER_ADMIN") return true;
      return AGENT_PERMISSIONS.includes(permission);
    };
    return {
      user,
      loading,
      isAuthenticated: Boolean(user),
      isSuperAdmin: role === "SUPER_ADMIN",
      login,
      logout,
      can,
    };
  }, [user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
