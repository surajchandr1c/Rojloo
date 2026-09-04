import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const adminToken = (process.env.ADMIN_TOKEN ?? "").trim().replace(/^['"]|['"]$/g, "");

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLoginPage =
    pathname === "/admin/login" || pathname.startsWith("/admin/login/");
  const isLoginApi =
    pathname === "/api/admin/login" || pathname.startsWith("/api/admin/login/");
  if (isLoginPage || isLoginApi) {
    return NextResponse.next();
  }

  const token = adminToken;
  const adminCookie = request.cookies.get("rojlo_admin")?.value;
  const subCookie = request.cookies.get("rojlo_subadmin")?.value;

  // Main admin: valid token -> allow with a sliding session refresh.
  if (token && adminCookie === token) {
    const response = NextResponse.next();
    response.cookies.set("rojlo_admin", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  }

  // Dedicated admin session cookies are validated by the route handlers.
  // The proxy only prevents unauthenticated navigation and API calls.
  if (adminCookie || subCookie) {
    const response = NextResponse.next();
    if (adminCookie) {
      response.cookies.set("rojlo_admin", adminCookie, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
        secure: process.env.NODE_ENV === "production",
      });
    }
    if (subCookie) {
      response.cookies.set("rojlo_subadmin", subCookie, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
        secure: process.env.NODE_ENV === "production",
      });
    }
    return response;
  }

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
