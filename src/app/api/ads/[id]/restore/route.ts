import { NextRequest, NextResponse } from "next/server";
import { findUserById, findUserBySessionToken } from "@/lib/models/user";
import { restoreAd } from "@/lib/models/ad";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/ads/[id]/restore">
) {
  const raw = request.cookies.get("rojlo_auth")?.value;

  let userId: string | undefined;
  if (raw) {
    const sessionUser = await findUserBySessionToken(raw);
    if (sessionUser?._id) {
      userId = String(sessionUser._id);
    }

    try {
      if (!userId) {
        const decoded = JSON.parse(decodeURIComponent(raw));
        if (decoded && decoded._id) userId = String(decoded._id);
      }
    } catch {
      if (!userId) userId = raw;
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const user = await findUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const ok = await restoreAd(id, String(user._id));

  if (!ok) {
    return NextResponse.json(
      { error: "Ad not found or not owned by you." },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: "Ad restored." });
}
