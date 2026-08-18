import { createContext, useContext, useState, type ReactNode } from "react";
import { api } from "../api/client";

interface Tenant {
  id: string;
  code: string;
  schoolName: string;
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
}
interface User {
  id: string;
  username: string;
  role: string;
  email?: string | null;
}

interface AuthCtx {
  user: User | null;
  tenant: Tenant | null;
  mustChangePassword: boolean;
  login: (tenantCode: string, username: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("rasitu_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [tenant, setTenant] = useState<Tenant | null>(() => {
    const raw = localStorage.getItem("rasitu_tenant");
    return raw ? JSON.parse(raw) : null;
  });
  const [mustChangePassword, setMustChangePassword] = useState(false);

  async function login(tenantCode: string, username: string, password: string) {
    const res = await api.post("/auth/login", { tenantCode, username, password });
    localStorage.setItem("rasitu_token", res.data.token);
    localStorage.setItem("rasitu_user", JSON.stringify(res.data.user));
    localStorage.setItem("rasitu_tenant", JSON.stringify(res.data.tenant));
    setUser(res.data.user);
    setTenant(res.data.tenant);
    setMustChangePassword(res.data.mustChangePassword);
  }

  function logout() {
    localStorage.removeItem("rasitu_token");
    localStorage.removeItem("rasitu_user");
    localStorage.removeItem("rasitu_tenant");
    setUser(null);
    setTenant(null);
  }

  return <Ctx.Provider value={{ user, tenant, mustChangePassword, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
