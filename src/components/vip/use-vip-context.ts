"use client";

import { useEffect, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import { VipContext, type VipMe } from "./vip-context";

export type { VipMe };

export function useVipContext(redirectIfUnauthenticated = true) {
  const ctx = useContext(VipContext);
  const me = ctx?.me ?? null;
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (
      redirectIfUnauthenticated &&
      me &&
      !me.authenticated &&
      pathname !== "/vip/login" &&
      !pathname.startsWith("/vip/create-password")
    ) {
      router.replace("/vip/login");
    }
  }, [me, redirectIfUnauthenticated, router, pathname]);

  return me;
}
