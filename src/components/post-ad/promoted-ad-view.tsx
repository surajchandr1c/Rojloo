"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/button";
import { SectionPanel } from "@/components/ui/card";
import { useAuthGuard } from "./use-auth-guard";
import { useAuth } from "@/lib/auth-context";
import { authenticatedFetch } from "@/lib/auth-fetch";
import type { Ad } from "./types";

import {
  DEFAULT_PROMO_PACKAGES,
  type PromotionPackage,
} from "@/lib/promotion-packages";

import {
  getCurrentShiftInfo,
  getShiftLabel,
  getShiftShortLabel,
  getTierRankInfo,
  calculateExpirationDate,
  formatDateTime,
  formatTimeRemaining,
  isAdPromotionActive,
  isAdActiveInCurrentShift,
  type PromoShift,
} from "@/lib/promo-shifts";

export default function PromotedAdView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const adIdParam = searchParams.get("adId") || "";

  const ready = useAuthGuard();
  const { user, refreshAuth } = useAuth();

  const [ads, setAds] = useState<Ad[]>([]);
  const [promoPackages, setPromoPackages] = useState<PromotionPackage[]>(DEFAULT_PROMO_PACKAGES);
  const [selectedAdId, setSelectedAdId] = useState<string>(adIdParam);
  const [selectedShift, setSelectedShift] = useState<PromoShift>("day");
  const [selectedPackageId, setSelectedPackageId] = useState<string>("platinum-vip");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentShiftInfo, setCurrentShiftInfo] = useState(getCurrentShiftInfo());

  // Periodically refresh current shift status
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentShiftInfo(getCurrentShiftInfo());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const loadAds = () => {
    setLoading(true);
    authenticatedFetch("/api/ads")
      .then((r) => r.json())
      .then((data) => {
        const list: Ad[] = (data.ads ?? []).filter(
          (a: Ad) => (a.status ?? "active") !== "deleted"
        );
        setAds(list);
        if (adIdParam && list.some((a) => a._id === adIdParam)) {
          setSelectedAdId(adIdParam);
        } else if (list.length > 0 && !selectedAdId) {
          setSelectedAdId(list[0]._id || "");
        }
      })
      .catch(() => setAds([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch(`/api/promotion-packages?_t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.packages) && data.packages.length > 0) {
          setPromoPackages(data.packages);
          setSelectedPackageId((prevId) => {
            if (data.packages.some((p: PromotionPackage) => p.id === prevId)) {
              return prevId;
            }
            const defaultPick =
              data.packages.find((p: PromotionPackage) => p.highlight) ||
              data.packages[0];
            return defaultPick ? defaultPick.id : prevId;
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load promotion packages:", err);
      });
  }, []);

  useEffect(() => {
    if (ready) {
      loadAds();
    }
  }, [ready]);

  useEffect(() => {
    if (adIdParam && ads.some((a) => a._id === adIdParam)) {
      setSelectedAdId(adIdParam);
    }
  }, [adIdParam, ads]);

  if (!ready) return null;

  const selectedAd = ads.find((a) => a._id === selectedAdId);
  const selectedPkg =
    promoPackages.find((p) => p.id === selectedPackageId) ||
    promoPackages[0] ||
    DEFAULT_PROMO_PACKAGES[0];

  const selectedTierInfo = getTierRankInfo(selectedPkg.tier, `${selectedPkg.id} ${selectedPkg.title}`);
  const userCoins = Number(user?.coins ?? 0);
  const hasEnoughCoins = userCoins >= selectedPkg.coinsCost;

  // Real-time projected expiration calculation
  const projectedExpiration = calculateExpirationDate(selectedPkg.durationDays);
  const formattedProjectedExpiry = formatDateTime(projectedExpiration);

  const isAdPromoted = (ad: Ad) => {
    const raw = ad as unknown as Record<string, unknown>;
    return Boolean(raw.promoted || raw.isPromoted || raw.promotedUntil || raw.isVip);
  };

  const currentlyPromotedAds = ads.filter(isAdPromoted);

  const handlePromote = async () => {
    if (!selectedAd || !selectedAd._id) {
      setErrorMessage("Please select an ad to promote.");
      return;
    }

    if (!hasEnoughCoins) {
      setErrorMessage(
        `You need ${selectedPkg.coinsCost} coins for this package, but you only have ${userCoins} coins.`
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await authenticatedFetch(`/api/ads/${selectedAd._id}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: selectedPkg.id,
          title: selectedPkg.title,
          durationDays: selectedPkg.durationDays,
          coinsCost: selectedPkg.coinsCost,
          shift: selectedShift,
          tier: selectedTierInfo.tier,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to promote ad.");
      }

      setSuccessMessage(
        `🎉 Successfully promoted "${selectedAd.name || selectedAd.title}" with ${selectedPkg.title}! Guaranteed position: ${selectedTierInfo.rankRange} during ${getShiftLabel(selectedShift)} until ${formattedProjectedExpiry}.`
      );
      await refreshAuth();
      loadAds();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to promote ad.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="px-2.5 py-6 sm:px-6 sm:py-10 lg:px-8 max-w-full overflow-hidden">
      <SectionPanel className="p-3.5 sm:p-6 md:p-8 w-full max-w-5xl mx-auto overflow-hidden">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-red-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-red-950">
                Promote The Ad
              </h1>
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-black text-red-900 uppercase">
                12h Shift System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="soft"
              onClick={() => router.push("/post-ad/your-ads")}
              className="!text-black text-xs sm:text-sm font-bold"
            >
              &larr; Back
            </Button>
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs sm:text-sm font-semibold text-emerald-900">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs sm:text-sm font-semibold text-rose-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>{errorMessage}</span>
            {!hasEnoughCoins && (
              <Link
                href="/post-ad/buy-coin"
                className="underline font-bold text-red-700 hover:text-red-950"
              >
                Buy Coins Now &rarr;
              </Link>
            )}
          </div>
        )}

        {/* 1. Ad Selector Section */}
        <div className="mt-6 rounded-2xl bg-white border border-red-200/90 p-4 sm:p-6 shadow-xs">
          <h2 className="text-sm sm:text-base font-black text-red-950">
            1. Select the Ad to Promote
          </h2>

          {loading ? (
            <p className="mt-3 text-xs text-gray-500">Loading your ads...</p>
          ) : ads.length === 0 ? (
            <div className="mt-3 rounded-xl bg-pink-50/60 p-4 text-center">
              <p className="text-xs sm:text-sm text-red-900">You do not have any ads yet.</p>
              <Link
                href="/post-ad/new"
                className="mt-3 inline-block rounded-xl bg-[#450a0a] px-4 py-2 text-xs font-bold text-white hover:bg-[#7f1d1d]"
              >
                + Post an Ad First
              </Link>
            </div>
          ) : (
            <div className="mt-3">
              <div className="max-w-md">
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Choose an ad:
                </label>
                <select
                  value={selectedAdId}
                  onChange={(e) => {
                    setSelectedAdId(e.target.value);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="w-full rounded-xl border border-red-200 bg-pink-50/30 p-2.5 text-xs sm:text-sm font-medium text-red-950 focus:border-red-600 focus:outline-none"
                >
                  {ads.map((ad) => (
                    <option key={ad._id} value={ad._id}>
                      {ad.name || ad.title} {ad.city ? `(${ad.city})` : ""} {isAdPromoted(ad) ? "⭐ [Promoted]" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAd && (
                <div className="mt-4 rounded-xl border border-red-100 bg-pink-50/25 p-3 sm:p-4 flex flex-col sm:flex-row gap-3.5 sm:gap-4 overflow-hidden">
                  <div className="relative shrink-0 w-full sm:w-36 h-40 sm:h-28 rounded-xl overflow-hidden bg-pink-100 flex items-center justify-center border border-red-200/60">
                    {selectedAd.images?.[0] ? (
                      <img
                        src={selectedAd.images[0]}
                        alt={selectedAd.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-xs text-gray-500 font-medium">No Image</div>
                    )}
                    <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {selectedAd.images?.length || 1}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                          {selectedAd.category || "Classified"}
                        </span>
                        {isAdPromoted(selectedAd) ? (
                          <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            ⭐ Already Promoted
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            Free Ad
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1 text-sm sm:text-base font-black text-red-600 truncate">
                        {selectedAd.city ? `[${selectedAd.city.toUpperCase()}] • ` : ""}
                        {selectedAd.title || selectedAd.name}
                      </h3>
                      <p className="mt-1 text-xs text-gray-700 line-clamp-2">
                        {selectedAd.about}
                      </p>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600 font-semibold">
                      {selectedAd.age && <span>📅 {selectedAd.age} Years</span>}
                      {selectedAd.city && <span>📍 {selectedAd.city}</span>}
                      <span>🌐 Indian</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Shift Selection Dropdown */}
        <div className="mt-6 rounded-2xl bg-white border border-red-200/90 p-4 sm:p-6 shadow-xs">
          <h2 className="text-sm sm:text-base font-black text-red-950">
            select your shift
          </h2>
          <div className="mt-3 max-w-md">
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value as PromoShift)}
              className="w-full rounded-xl border border-red-200 bg-pink-50/30 p-2.5 text-xs sm:text-sm font-bold text-red-950 focus:border-red-600 focus:outline-none"
            >
              <option value="day">☀️ Day Shift (12 Hours: 08:00 AM – 08:00 PM)</option>
              <option value="night">🌙 Night Shift (12 Hours: 08:00 PM – 08:00 AM)</option>
              <option value="all">🔄 24 Hours (Day &amp; Night Both Shifts)</option>
            </select>
          </div>
        </div>

        {/* 3. Promotion Packages Grid with Tier Ranking */}
        <div className="mt-6 rounded-2xl bg-white border border-red-200/90 p-4 sm:p-6 shadow-xs">
          <div className="border-b border-red-100 pb-3">
            <h2 className="text-sm sm:text-base font-black text-red-950">
              3. Choose a Promotion Package (Position Ranking)
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Each package guarantees your placement tier in city listings: <strong>Platinum (Top 1–3)</strong>, <strong>Gold (Top 4–6)</strong>, <strong>Silver (Top 7–10)</strong>, <strong>Bronze (Top 10–15)</strong>.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {promoPackages.map((pkg) => {
              const isSelected = selectedPackageId === pkg.id;
              const tierInfo = getTierRankInfo(pkg.tier, `${pkg.id} ${pkg.title}`);

              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackageId(pkg.id)}
                  className={`relative cursor-pointer rounded-2xl p-4 transition-all flex flex-col justify-between border ${
                    isSelected
                      ? "border-red-600 bg-pink-50/90 shadow-md ring-2 ring-red-500/20 scale-[1.01]"
                      : "border-red-100 bg-white hover:border-red-300 hover:bg-pink-50/30"
                  }`}
                >
                  {/* Badge */}
                  {pkg.tag && (
                    <span
                      className={`absolute -top-2.5 right-3 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        pkg.highlight
                          ? "bg-red-700 text-white shadow-xs"
                          : "bg-red-100 text-red-900 border border-red-200"
                      }`}
                    >
                      {pkg.tag}
                    </span>
                  )}

                  <div>
                    {/* Tier badge */}
                    <div className="mb-2">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black shadow-2xs ${tierInfo.badgeClass}`}>
                        {tierInfo.badge}
                      </span>
                    </div>

                    <h3 className="text-xs sm:text-sm font-black text-red-950 pr-4">
                      {pkg.title}
                    </h3>

                    {/* Guaranteed Position Pill */}
                    <div className="mt-2 inline-flex items-center gap-1 rounded-lg bg-red-100/80 px-2 py-0.5 text-[11px] font-extrabold text-red-950">
                      <span>🎯 Position:</span>
                      <span className="text-red-700 underline">{tierInfo.rankRange}</span>
                    </div>

                    <div className="mt-2.5 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-red-600">
                        {pkg.coinsCost}
                      </span>
                      <span className="text-xs font-bold text-gray-600">Coins</span>
                      <span className="text-xs text-gray-500 ml-1.5">
                        ({pkg.durationDays} {pkg.durationDays === 1 ? "Day" : "Days"})
                      </span>
                    </div>

                    <ul className="mt-3 space-y-1.5 text-[11px] text-gray-600">
                      {(pkg.features || []).map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 pt-3 border-t border-red-100/60">
                    <button
                      type="button"
                      className={`w-full rounded-xl py-1.5 text-xs font-bold transition ${
                        isSelected
                          ? "bg-[#450a0a] text-white shadow-xs"
                          : "bg-pink-100/80 text-red-900 hover:bg-pink-200/80"
                      }`}
                    >
                      {isSelected ? "Selected ✓" : "Select Package"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Real-Time Expiration & Promotion Summary Card */}
        <div className="mt-6 rounded-2xl bg-pink-50/50 border border-red-200 p-4 sm:p-6 shadow-xs">
          <h2 className="text-sm sm:text-base font-black text-red-950">
            4. Promotion Details &amp; Expiration Summary
          </h2>
          <p className="mt-0.5 text-xs text-gray-600">
            Review your shift, guaranteed rank position, and exact expiration time before activating.
          </p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left specifications list */}
            <div className="rounded-xl bg-white border border-red-100 p-3.5 sm:p-4 space-y-2 text-xs">
              <div className="flex justify-between border-b border-red-50 pb-2">
                <span className="text-gray-500 font-semibold">Target Ad:</span>
                <strong className="text-red-950 font-bold truncate max-w-[200px]">
                  {selectedAd ? selectedAd.name || selectedAd.title : "None Selected"}
                </strong>
              </div>
              <div className="flex justify-between border-b border-red-50 pb-2">
                <span className="text-gray-500 font-semibold">Selected Shift:</span>
                <strong className="text-red-950 font-bold flex items-center gap-1">
                  {getShiftShortLabel(selectedShift)} ({selectedShift === "night" ? "08:00 PM - 08:00 AM" : "08:00 AM - 08:00 PM"})
                </strong>
              </div>
              <div className="flex justify-between border-b border-red-50 pb-2">
                <span className="text-gray-500 font-semibold">Guaranteed Position:</span>
                <span className="font-black text-red-700 rounded bg-red-50 px-2 py-0.5">
                  {selectedTierInfo.rankRange}
                </span>
              </div>
              <div className="flex justify-between border-b border-red-50 pb-2">
                <span className="text-gray-500 font-semibold">Duration:</span>
                <strong className="text-red-950 font-bold">
                  {selectedPkg.durationDays} {selectedPkg.durationDays === 1 ? "Day (24h validity)" : "Days"}
                </strong>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-gray-500 font-semibold">Exact Expiration Time:</span>
                <strong className="text-red-900 font-black text-xs sm:text-[13px]">
                  ⏰ {formattedProjectedExpiry}
                </strong>
              </div>
            </div>

            {/* Right explanation of rotation and expiration */}
            <div className="rounded-xl bg-white border border-red-100 p-3.5 sm:p-4 text-xs flex flex-col justify-between">
              <div className="space-y-2 text-gray-700">
                <p className="font-bold text-red-950 flex items-center gap-1.5">
                  <span>ℹ️</span>
                  <span>How the Shift &amp; Expiration System Works:</span>
                </p>
                <p className="text-[11px] leading-relaxed text-gray-600">
                  &bull; During your chosen <strong>{getShiftShortLabel(selectedShift)}</strong>, your ad stays positioned at <strong>{selectedTierInfo.rankRange}</strong> in city listings.
                </p>
                <p className="text-[11px] leading-relaxed text-gray-600">
                  &bull; <strong>When the package expires on {formattedProjectedExpiry}</strong>, your ad automatically moves below the top promoted slots, and other users who paid for promotion packages will show their ads on top during their selected shifts.
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-red-100 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600">Cost:</span>
                <span className="text-lg font-black text-red-600">{selectedPkg.coinsCost} Coins</span>
              </div>
            </div>
          </div>

          {/* Action CTA Button */}
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <div>
              <p className="text-xs text-gray-600 font-medium">Selected Package</p>
              <p className="text-sm font-black text-red-950">
                {selectedPkg.title} &bull; <span className="text-red-700">{selectedPkg.coinsCost} Coins</span>
              </p>
            </div>

            {hasEnoughCoins ? (
              <button
                type="button"
                disabled={submitting || !selectedAd}
                onClick={handlePromote}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#450a0a] hover:bg-[#7f1d1d] disabled:opacity-50 text-white px-6 py-3 text-xs sm:text-sm font-black uppercase tracking-wider transition shadow-md cursor-pointer"
              >
                <span>🚀</span>
                <span>
                  {submitting
                    ? "Promoting Ad..."
                    : `Promote for ${selectedTierInfo.rankRange} (${selectedPkg.coinsCost} Coins)`}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-700">
                  Need {selectedPkg.coinsCost - userCoins} more coins
                </span>
                <Link
                  href="/post-ad/buy-coin"
                  className="rounded-xl bg-[#450a0a] hover:bg-[#7f1d1d] text-white px-4 py-2.5 text-xs font-bold transition"
                >
                  Buy Coins &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* 5. Currently Promoted Ads Section */}
        {currentlyPromotedAds.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white border border-red-200/90 p-4 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-red-100 pb-3">
              <h2 className="text-sm sm:text-base font-black text-red-950">
                Your Active Promoted Ads ({currentlyPromotedAds.length})
              </h2>
              <span className="text-xs text-gray-500">Live Status &amp; Expiration Monitor</span>
            </div>

            <div className="mt-3 space-y-3">
              {currentlyPromotedAds.map((ad) => {
                const isPromoValid = isAdPromotionActive(ad);
                const isLiveInShift = isAdActiveInCurrentShift(ad);
                const tierInfo = getTierRankInfo(ad.promoTier, ad.promoPackage);
                const expiryString = formatDateTime(ad.promotedUntil);
                const timeRemaining = formatTimeRemaining(ad.promotedUntil);
                const shiftLabel = getShiftShortLabel(ad.promoShift);

                return (
                  <div
                    key={ad._id}
                    className={`rounded-xl border p-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs transition ${
                      isPromoValid
                        ? "border-emerald-200 bg-emerald-50/40"
                        : "border-gray-200 bg-gray-50/70 opacity-80"
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <span className="text-xl">
                        {isPromoValid ? "⭐" : "⌛"}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-black text-red-950 text-sm truncate">
                            {ad.city ? `[${ad.city.toUpperCase()}] ` : ""}
                            {ad.title || ad.name}
                          </p>
                          <span className={`rounded-full px-2 py-0.2 text-[10px] font-black ${tierInfo.badgeClass}`}>
                            {tierInfo.badge}
                          </span>
                          <span className="rounded-full bg-pink-100 px-2 py-0.2 text-[10px] font-bold text-red-900 border border-red-200">
                            {shiftLabel}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600">
                          <span>
                            Package: <strong>{ad.promoPackage || tierInfo.title}</strong>
                          </span>
                          <span>
                            Guaranteed: <strong>{tierInfo.rankRange}</strong>
                          </span>
                          <span>
                            Expires: <strong className="text-red-950">{expiryString || "N/A"}</strong>
                          </span>
                          <span className="font-semibold text-emerald-800">
                            ({timeRemaining})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {isPromoValid ? (
                        isLiveInShift ? (
                          <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-1 text-[11px] font-black text-emerald-800 flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                            Live on Top ({currentShiftInfo.label})
                          </span>
                        ) : (
                          <span className="rounded-full bg-indigo-100 border border-indigo-300 px-2.5 py-1 text-[11px] font-bold text-indigo-900">
                            ⏳ Scheduled for {ad.promoShift === "night" ? "Night" : "Day"} Shift
                          </span>
                        )
                      ) : (
                        <span className="rounded-full bg-rose-100 border border-rose-300 px-2.5 py-1 text-[11px] font-bold text-rose-800">
                          🔴 Expired &bull; Moved Below
                        </span>
                      )}

                      <Link
                        href="/post-ad/your-ads"
                        className="rounded-lg bg-white border border-red-200 px-2.5 py-1 text-[11px] font-bold text-red-900 hover:bg-pink-50 transition"
                      >
                        View Ad &rarr;
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </SectionPanel>
    </main>
  );
}
