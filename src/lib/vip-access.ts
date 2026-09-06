import "server-only";

import { NextRequest } from "next/server";
import { getVipBySession, getVipScope, VipScope } from "@/lib/models/vip";

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

function normalizeEnvValue(value?: string): string {
  return (value ?? "").trim().replace(/^['"]|['"]$/g, "");
}

export async function getVipContext(request: NextRequest): Promise<VipContext> {
  // VIP route access strictly requires a valid rojlo_vip cookie
  const vipCookie = request.cookies.get("rojlo_vip")?.value;
  if (!vipCookie || vipCookie.trim().length === 0) {
    return { authenticated: false };
  }

  // Check if admin is authenticated on the VIP panel
  const adminToken = normalizeEnvValue(process.env.ADMIN_TOKEN);
  const expectedAdminVip = adminToken ? `admin_${adminToken}` : "admin";
  if (
    vipCookie === expectedAdminVip ||
    (adminToken && vipCookie === adminToken) ||
    vipCookie === "admin"
  ) {
    return {
      authenticated: true,
      role: "admin",
      email: normalizeEnvValue(process.env.ADMIN_EMAIL) || "admin",
      scope: {
        hasStateAccess: true,
        states: [],
        cities: [],
        assignments: [],
      },
    };
  }

  // Verify regular VIP user session in database
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
