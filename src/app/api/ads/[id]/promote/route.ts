import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-user";
import { getAdById, updateAd } from "@/lib/models/ad";
import { findUserById, updateUserCoins } from "@/lib/models/user";
import { getPromotionPackages } from "@/lib/models/promotion-package";
import {
  calculatePromoExpiration,
  calculateShiftTiming,
  normalizeShift,
  formatDateTime,
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

  const durationDays = Number(
    matchedPkg?.durationDays !== undefined
      ? matchedPkg.durationDays
      : matchedPkg?.durationHours && matchedPkg.durationHours >= 24
      ? Math.floor(matchedPkg.durationHours / 24)
      : (body?.durationDays ?? 1)
  );
  const coinsCost = Number(matchedPkg ? matchedPkg.coinsCost : (body?.coinsCost ?? 5));
  const packageName = matchedPkg ? matchedPkg.title : (typeof body?.title === "string" ? body.title : "Bronze VIP");

  // Determine shift: "morning" | "afternoon" | "evening" | "night"
  const rawShift = String(body?.shift || "morning").toLowerCase();
  const promoShift: PromoShift = normalizeShift(rawShift);

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

  // Calculate promotion shift timing (6-hour window in IST)
  const now = new Date();
  const shiftTiming = calculateShiftTiming(promoShift, now);

  // If package has multi-day duration, calculate final expiration
  const finalPromotedUntil = calculatePromoExpiration(
    matchedPkg || { durationDays, durationHours: body?.durationHours },
    promoShift,
    now
  );

  const updatedAd = await updateAd(id, userId, {
    promoted: true,
    isPromoted: true,
    promotedFrom: shiftTiming.promotedFrom,
    promotedUntil: finalPromotedUntil,
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
  const startFormatted = formatDateTime(shiftTiming.promotedFrom);
  const expiryFormatted = formatDateTime(finalPromotedUntil);

  const statusPrefix = shiftTiming.isCurrentShift
    ? `Active now until ${expiryFormatted}`
    : `Scheduled to start on ${startFormatted} until ${expiryFormatted}`;

  return NextResponse.json({
    success: true,
    message: `🎉 Ad promoted successfully with ${packageName}! Position: ${tierInfo.rankRange} during ${shiftText}. ${statusPrefix}.`,
    ad: updatedAd,
    remainingCoins: currentCoins - coinsCost,
    promotedFrom: shiftTiming.promotedFrom.toISOString(),
    promotedUntil: finalPromotedUntil.toISOString(),
    startTimeFormatted: startFormatted,
    expireTimeFormatted: expiryFormatted,
    isCurrentShift: shiftTiming.isCurrentShift,
    isNextDay: shiftTiming.isNextDay,
    scheduleDescription: shiftTiming.scheduleDescription,
    rankRange: tierInfo.rankRange,
    tier: promoTier,
    promoShift,
    packageName,
  });
}
