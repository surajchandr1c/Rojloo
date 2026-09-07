import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-user";
import { getAdById, updateAd } from "@/lib/models/ad";
import { findUserById, updateUserCoins } from "@/lib/models/user";
import { getPromotionPackages } from "@/lib/models/promotion-package";
import {
  calculateExpirationDate,
  normalizeTier,
  getTierRankInfo,
  getShiftLabel,
  type PromoShift,
} from "@/lib/promo-shifts";

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));

  const packages = await getPromotionPackages();
  const matchedPkg = packages.find(
    (p) =>
      (body?.packageId && p.id === body.packageId) ||
      (body?.title && p.title === body.title)
  );

  const durationDays = Number(matchedPkg ? matchedPkg.durationDays : (body?.durationDays ?? 1));
  const coinsCost = Number(matchedPkg ? matchedPkg.coinsCost : (body?.coinsCost ?? 5));
  const packageName = matchedPkg ? matchedPkg.title : (typeof body?.title === "string" ? body.title : "Bronze VIP");

  // Determine shift: "day" | "night" | "all"
  const rawShift = String(body?.shift || "day").toLowerCase();
  const promoShift: PromoShift =
    rawShift === "night" ? "night" : rawShift === "all" ? "all" : "day";

  // Determine tier: "platinum" | "gold" | "silver" | "bronze"
  const promoTier = normalizeTier(body?.tier || matchedPkg?.tier, packageName);
  const tierInfo = getTierRankInfo(promoTier);

  if (!id) {
    return NextResponse.json({ error: "Ad ID is required." }, { status: 400 });
  }

  // Find ad and verify ownership
  const ad = await getAdById(id, userId);
  if (!ad) {
    return NextResponse.json(
      { error: "Ad not found or not owned by you." },
      { status: 404 }
    );
  }

  // Find user and check coin balance
  const user = await findUserById(userId);
  const currentCoins = Number(user?.coins ?? 0);

  if (currentCoins < coinsCost) {
    return NextResponse.json(
      {
        error: `Insufficient coins. You have ${currentCoins} coins, but this package requires ${coinsCost} coins.`,
        currentCoins,
        requiredCoins: coinsCost,
      },
      { status: 400 }
    );
  }

  // Deduct coins
  const deducted = await updateUserCoins(userId, -coinsCost, user?.email);
  if (!deducted) {
    return NextResponse.json(
      { error: "Failed to deduct coins. Please try again." },
      { status: 500 }
    );
  }

  // Calculate promotion validity
  const now = new Date();
  const promotedUntil = calculateExpirationDate(durationDays, now);

  const updatedAd = await updateAd(id, userId, {
    promoted: true,
    isPromoted: true,
    promotedUntil,
    promoPackage: packageName,
    promoTier,
    promoShift,
  });

  if (!updatedAd) {
    // Refund coins if ad update failed
    await updateUserCoins(userId, coinsCost, user?.email);
    return NextResponse.json(
      { error: "Failed to promote ad. Coins have been refunded." },
      { status: 500 }
    );
  }

  const shiftText = getShiftLabel(promoShift);

  return NextResponse.json({
    success: true,
    message: `🎉 Ad promoted successfully with ${packageName}! Guaranteed position: ${tierInfo.rankRange} during ${shiftText} until ${promotedUntil.toLocaleDateString()}.`,
    ad: updatedAd,
    remainingCoins: currentCoins - coinsCost,
    promotedUntil,
    promoTier,
    promoShift,
  });
}
