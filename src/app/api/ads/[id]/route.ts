import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-user";
import { softDeleteAd } from "@/lib/models/ad";

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const ok = await softDeleteAd(id, userId);

  if (!ok) {
    return NextResponse.json(
      { error: "Ad not found or not owned by you." },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: "Ad deleted." });
}

