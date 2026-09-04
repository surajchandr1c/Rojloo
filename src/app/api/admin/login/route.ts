import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

function normalizeEnvValue(value?: string): string {
  return (value ?? "").trim().replace(/^['"]|['"]$/g, "");
}

async function matchesAdminPassword(
  password: string,
  configuredPassword: string
): Promise<boolean> {
  if (/^\$2[aby]\$\d{2}\$/.test(configuredPassword)) {
    return bcrypt.compare(password, configuredPassword).catch(() => false);
  }
  return password === configuredPassword;
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rate = checkRateLimit(`admin-login:${ip}`, 10);
    if (!rate.ok) {
      return NextResponse.json(
        {
          error:
            "Too many login attempts. Please try again in a few minutes.",
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    const validEmail = normalizeEnvValue(process.env.ADMIN_EMAIL).toLowerCase();
    const validPassword = normalizeEnvValue(process.env.ADMIN_PASSWORD);
    const configuredToken = normalizeEnvValue(process.env.ADMIN_TOKEN);

    if (!validEmail || !validPassword || !configuredToken) {
      return NextResponse.json(
        { error: "Admin login is not configured on the server." },
        { status: 503 }
      );
    }

    const emailMatch = email === validEmail;
    const passwordMatch = validPassword
      ? await matchesAdminPassword(password, validPassword)
      : false;

    if (validEmail && validPassword && emailMatch && passwordMatch) {
      const response = NextResponse.json({ success: true, role: "main" });
      response.cookies.set("rojlo_admin", configuredToken, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
        secure: process.env.NODE_ENV === "production",
      });
      response.cookies.set("rojlo_subadmin", "", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
        secure: process.env.NODE_ENV === "production",
      });

      return response;
    }

    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  } catch (error) {
    console.error("[admin-login] Error details:", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Unable to log in. Please try again." },
      { status: 500 }
    );
  }
}
