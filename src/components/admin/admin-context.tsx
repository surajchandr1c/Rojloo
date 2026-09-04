"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type AdminMe = {
  authenticated: boolean;
  role?: "main" | "subadmin";
  email?: string;
  permissions?: string[];
};

type AdminCtx = {
  me: AdminMe | null;
  refresh: () => Promise<void>;
};

const AdminContext = createContext<AdminCtx | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<AdminMe | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/me", {
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 401) {
          setMe({ authenticated: false });
        }
        return;
      }

      const data = (await res.json()) as AdminMe;
      setMe(data);
    } catch {
      setMe((prev) => prev ?? { authenticated: false });
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  return (
    <AdminContext.Provider value={{ me, refresh }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdminRefresh() {
  const ctx = useContext(AdminContext);
  return ctx ? ctx.refresh : async () => {};
}

export { AdminContext };
