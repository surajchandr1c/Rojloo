import "server-only";

import { NextRequest } from "next/server";
import { getVipBySession, getVipScope, VipScope } from "@/lib/models/vip";
import { getAdminContext } from "@/lib/admin-access";

export type VipContext =
  | {
      authenticated: true;
      role: "vip";
      email: string;
      scope: VipScope;
    }
  | {
      authenticated: true;
      role: "admin";
      email: string;
      scope: VipScope;
    }
  | {
      authenticated: false;
    };

export async function getVipContext(request: NextRequest): Promise<VipContext> {
  // Check if main admin is logged in
  const adminCtx = await getAdminContext(request);
  if (adminCtx && adminCtx.role === "main") {
    // Admin has access to all
    return {
      authenticated: true,
      role: "admin",
      email: "admin",
      scope: {
        hasStateAccess: true,
        states: [],
        cities: [],
        assignments: [],
      },
    };
  }

  // Check VIP session cookie
  const vipCookie = request.cookies.get("rojlo_vip")?.value;
  if (!vipCookie) {
    return { authenticated: false };
  }

  const vip = await getVipBySession(vipCookie);
  if (!vip) {
    return { authenticated: false };
  }

  const scope = await getVipScope(vip.email);
  if (scope.assignments.length === 0) {
    // No active assignments
    return { authenticated: false };
  }

  return {
    authenticated: true,
    role: "vip",
    email: vip.email,
    scope,
  };
}
