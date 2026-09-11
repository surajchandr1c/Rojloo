"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
  getShiftShortLabel,
  getTierRankInfo,
  calculatePromoExpiration,
  calculateShiftTiming,
  formatDateTime,
  formatDetailedTimeRemaining,
  type PromoShift,
} from "@/lib/promo-shifts";

interface PromoModalData {
  adTitle: string;
  rankRange: string;
  shiftName: string;
  promotedFrom: Date;
  promotedUntil: Date;
  isCurrentShift: boolean;
  isNextDay: boolean;
  days?: number;
  totalCoins?: number;
}

export default function PromotedAdView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const adIdParam = searchParams.get("adId") || "";

  const ready = useAuthGuard();
  const { user, refreshAuth } = useAuth();

  const [ads, setAds] = useState<Ad[]>([]);
  const [promoPackages, setPromoPackages] = useState<PromotionPackage[]>(DEFAULT_PROMO_PACKAGES);
  const [selectedAdId, setSelectedAdId] = useState<string>(adIdParam);
  const [selectedShift, setSelectedShift] = useState<PromoShift>("morning");
  const [selectedDays, setSelectedDays] = useState<number>(1);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("platinum-vip");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalData, setModalData] = useState<PromoModalData | null>(null);
  const [countdown, setCountdown] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!modalData) return;
    const update = () => {
      setCountdown(formatDetailedTimeRemaining(modalData.promotedUntil));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [modalData]);

  const loadAds = useCallback(() => {
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
        } else if (list.length > 0) {
          setSelectedAdId((prev) => prev || list[0]._id || "");
        }
      })
      .catch(() => setAds([]))
      .finally(() => setLoading(false));
  }, [adIdParam]);

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
    if (!ready) return;
    let active = true;
    authenticatedFetch("/api/ads")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        const list: Ad[] = (data.ads ?? []).filter(
          (a: Ad) => (a.status ?? "active") !== "deleted"
        );
        setAds(list);
        if (adIdParam && list.some((a) => a._id === adIdParam)) {
          setSelectedAdId(adIdParam);
        } else if (list.length > 0) {
          setSelectedAdId((prev) => prev || list[0]._id || "");
        }
      })
      .catch(() => {
        if (active) setAds([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ready, adIdParam]);

  if (!ready) return null;

  const selectedAd = ads.find((a) => a._id === selectedAdId);
  const selectedPkg =
    promoPackages.find((p) => p.id === selectedPackageId) ||
    promoPackages[0] ||
    DEFAULT_PROMO_PACKAGES[0];

  const selectedTierInfo = getTierRankInfo(selectedPkg.tier, `${selectedPkg.id} ${selectedPkg.title}`);
  const selectedRankRange = selectedPkg.rankRange || selectedTierInfo.rankRange;
  const userCoins = Number(user?.coins ?? 0);

  const baseCoinsPerDay = Math.max(1, Math.round(Number(selectedPkg.coinsCost || 5)));
  const totalCoinsCost = baseCoinsPerDay * selectedDays;
  const hasEnoughCoins = userCoins >= totalCoinsCost;

  // Real-time projected shift timing and multi-day expiration calculation
  const currentShiftTiming = calculateShiftTiming(selectedShift);
  const projectedExpiration = calculatePromoExpiration(
    { durationDays: selectedDays },
    selectedShift
  );

  const isAdPromoted = (ad: Ad) => {
    const raw = ad as unknown as Record<string, unknown>;
    return Boolean(raw.promoted || raw.isPromoted || raw.promotedUntil || raw.isVip);
  };

  const handlePromote = async () => {
    if (!selectedAd || !selectedAd._id) {
      setErrorMessage("Please select an ad to promote.");
      return;
    }

    if (!hasEnoughCoins) {
      setErrorMessage(
        `You need ${totalCoinsCost} coins (${baseCoinsPerDay} coins/day × ${selectedDays} days) for this package, but you only have ${userCoins} coins.`
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await authenticatedFetch(`/api/ads/${selectedAd._id}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: selectedPkg.id,
          title: selectedPkg.title,
          durationDays: selectedDays,
          coinsCost: totalCoinsCost,
          shift: selectedShift,
          tier: selectedTierInfo.tier,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to promote ad.");
      }

      const expiry = new Date(
        data.promotedUntil || projectedExpiration
      );
      const start = new Date(data.promotedFrom || currentShiftTiming.promotedFrom);

      setModalData({
        adTitle: selectedAd.name || selectedAd.title || "Your Ad",
        rankRange: data.rankRange || selectedRankRange,
        shiftName: getShiftShortLabel(selectedShift),
        promotedFrom: start,
        promotedUntil: expiry,
        isCurrentShift: Boolean(data.isCurrentShift ?? currentShiftTiming.isCurrentShift),
        isNextDay: Boolean(data.isNextDay ?? currentShiftTiming.isNextDay),
        days: selectedDays,
        totalCoins: totalCoinsCost,
      });

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
                6-Hour Shift Rotation
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

        {/* Promotion Required Notice */}
        {searchParams.get("required") === "1" && (
          <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs sm:text-sm font-semibold text-amber-950 flex items-start gap-3 shadow-xs">
            <span className="text-xl shrink-0 mt-0.5">⚠️</span>
            <div>
              <p className="font-bold text-sm sm:text-base text-red-950">
                Promotion Required to Publish on City Page
              </p>
              <p className="text-xs sm:text-sm text-amber-900 mt-0.5 leading-relaxed font-medium">
                You have already used your account&apos;s 1 free ad allowance. To make this ad visible to clients in city search listings, select a promotion package below and activate it.
              </p>
            </div>
          </div>
        )}

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
                      <Image
                        src={selectedAd.images[0]}
                        alt={selectedAd.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 144px"
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

        {/* Shift Selection & Promotion Duration Section */}
        <div className="mt-6 rounded-2xl bg-white border border-red-200/90 p-4 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-red-100 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-black text-red-950 uppercase tracking-wide">
                2. Select Your Shift & Number of Days
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Choose the 6-hour daily time slot and how many days you want your ad featured.
              </p>
            </div>
            <span className="self-start sm:self-auto rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-900 border border-red-200">
              📅 {selectedDays} {selectedDays === 1 ? "Day" : "Days"} Selected
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shift dropdown */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Select Your Shift (6-Hour Daily Slot):
              </label>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value as PromoShift)}
                className="w-full rounded-xl border border-red-200 bg-pink-50/30 p-2.5 text-xs sm:text-sm font-bold text-red-950 focus:border-red-600 focus:outline-none"
              >
                <option value="morning">🌅 Morning Shift (06:00 AM – 12:00 PM • 6 Hours)</option>
                <option value="afternoon">☀️ Afternoon Shift (12:00 PM – 06:00 PM • 6 Hours)</option>
                <option value="evening">🌇 Evening Shift (06:00 PM – 12:00 AM Midnight • 6 Hours)</option>
                <option value="night">🌙 Night Shift (12:00 AM Midnight – 06:00 AM • 6 Hours)</option>
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                Your ad will stay on top during this shift every day.
              </p>
            </div>

            {/* Days input */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                How Many Days to Show Your Ad on This Time Slot?
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDays((prev) => Math.max(1, prev - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-pink-50/60 font-black text-red-950 hover:bg-pink-100 transition active:scale-95 cursor-pointer text-lg select-none"
                  aria-label="Decrease days"
                >
                  &minus;
                </button>
                <div className="relative flex-1">
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={selectedDays}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (isNaN(val) || val < 1) {
                        setSelectedDays(1);
                      } else {
                        setSelectedDays(Math.min(90, val));
                      }
                    }}
                    className="w-full rounded-xl border border-red-200 bg-pink-50/30 py-2 px-3 text-center text-sm font-black text-red-950 focus:border-red-600 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 pointer-events-none">
                    {selectedDays === 1 ? "day" : "days"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDays((prev) => Math.min(90, prev + 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-pink-50/60 font-black text-red-950 hover:bg-pink-100 transition active:scale-95 cursor-pointer text-lg select-none"
                  aria-label="Increase days"
                >
                  &#43;
                </button>
              </div>

              {/* Quick Select Preset Buttons */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-gray-500 mr-0.5">Quick select:</span>
                {[1, 2, 3, 5, 7, 15, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDays(d)}
                    className={`rounded-lg px-2 py-0.5 text-xs font-bold transition cursor-pointer ${
                      selectedDays === d
                        ? "bg-[#450a0a] text-white shadow-xs"
                        : "bg-pink-50 text-red-900 border border-red-200/80 hover:bg-pink-100"
                    }`}
                  >
                    {d} {d === 1 ? "day" : "days"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Real-time Shift Schedule Note */}
          <div className="mt-4 rounded-xl border border-red-100 bg-pink-50/40 p-3 text-xs font-semibold">
            {currentShiftTiming.isCurrentShift ? (
              <p className="text-emerald-800 flex items-start gap-1.5 leading-relaxed">
                <span className="text-sm shrink-0">🟢</span>
                <span>
                  <strong>Active Now:</strong> Your ad will post immediately and run during the{" "}
                  <strong>{getShiftShortLabel(selectedShift)}</strong> shift every day for{" "}
                  <strong className="underline">{selectedDays} {selectedDays === 1 ? "day" : "days"}</strong> until{" "}
                  <strong className="underline">{formatDateTime(projectedExpiration)}</strong>.
                </span>
              </p>
            ) : currentShiftTiming.isNextDay ? (
              <p className="text-indigo-900 flex items-start gap-1.5 leading-relaxed">
                <span className="text-sm shrink-0">📅</span>
                <span>
                  <strong>Shift has passed today:</strong> Scheduled to start tomorrow (
                  <strong className="underline">{formatDateTime(currentShiftTiming.promotedFrom)}</strong>) and run during the{" "}
                  <strong>{getShiftShortLabel(selectedShift)}</strong> shift for{" "}
                  <strong className="underline">{selectedDays} {selectedDays === 1 ? "day" : "days"}</strong> until{" "}
                  <strong className="underline">{formatDateTime(projectedExpiration)}</strong>.
                </span>
              </p>
            ) : (
              <p className="text-amber-900 flex items-start gap-1.5 leading-relaxed">
                <span className="text-sm shrink-0">🕒</span>
                <span>
                  <strong>Scheduled for Today:</strong> Starts today at{" "}
                  <strong className="underline">{formatDateTime(currentShiftTiming.promotedFrom)}</strong> and runs during the{" "}
                  <strong>{getShiftShortLabel(selectedShift)}</strong> shift for{" "}
                  <strong className="underline">{selectedDays} {selectedDays === 1 ? "day" : "days"}</strong> until{" "}
                  <strong className="underline">{formatDateTime(projectedExpiration)}</strong>.
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Promotion Packages Grid */}
        <div className="mt-6 rounded-2xl bg-white border border-red-200/90 p-4 sm:p-6 shadow-xs">
          <div className="border-b border-red-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-black text-red-950 uppercase tracking-wide">
                3. Choose a Promotion Package
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Packages show 1-day rate. Total cost multiplies by your {selectedDays} selected {selectedDays === 1 ? "day" : "days"}.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {promoPackages.map((pkg) => {
              const isSelected = selectedPackageId === pkg.id;
              const tierInfo = getTierRankInfo(pkg.tier, `${pkg.id} ${pkg.title}`);
              const dailyRate = Math.max(1, Math.round(Number(pkg.coinsCost || 5)));
              const pkgTotalCoins = dailyRate * selectedDays;

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
                      <span className="text-red-700 underline">{pkg.rankRange || tierInfo.rankRange}</span>
                    </div>

                    {/* 1-Day Amount Rate */}
                    <div className="mt-3">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-red-600">
                          {dailyRate}
                        </span>
                        <span className="text-xs font-bold text-gray-600">Coins</span>
                        <span className="rounded-md bg-pink-100 px-1.5 py-0.5 text-[10px] font-black text-red-900 uppercase">
                          / 1 Day
                        </span>
                      </div>

                      {/* Multiplied Total for Selected Days */}
                      <div className="mt-2 rounded-xl bg-pink-100/60 border border-red-200/60 p-2 text-xs">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-gray-700">Total ({selectedDays} {selectedDays === 1 ? "day" : "days"}):</span>
                          <span className="text-red-700 font-black text-sm">
                            {pkgTotalCoins} Coins
                          </span>
                        </div>
                        {selectedDays > 1 && (
                          <p className="text-[10px] text-gray-500 mt-0.5 text-right font-semibold">
                            ({dailyRate} coins &times; {selectedDays} days)
                          </p>
                        )}
                      </div>
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

          {/* Action CTA */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-pink-50/40 border border-red-100 p-4">
            <div>
              <p className="text-xs text-gray-600 font-medium">Selected Package &amp; Total</p>
              <p className="text-sm font-black text-red-950">
                {selectedPkg.title} &bull; <span className="text-red-700 font-black">{totalCoinsCost} Coins</span>
                <span className="text-xs text-gray-600 ml-1.5 font-bold">
                  ({baseCoinsPerDay} coins/day &times; {selectedDays} {selectedDays === 1 ? "day" : "days"})
                </span>
              </p>
            </div>

            {hasEnoughCoins ? (
              <button
                type="button"
                disabled={submitting || !selectedAd}
                onClick={handlePromote}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#450a0a] hover:bg-[#7f1d1d] disabled:opacity-50 text-white px-6 py-2.5 text-xs sm:text-sm font-black uppercase tracking-wider transition shadow-md cursor-pointer"
              >
                <span>🚀</span>
                <span>{submitting ? "Promoting..." : `Promote for ${selectedDays} ${selectedDays === 1 ? "Day" : "Days"} (${totalCoinsCost} Coins)`}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-700">
                  Need {totalCoinsCost - userCoins} more coins
                </span>
                <Link
                  href="/post-ad/buy-coin"
                  className="rounded-xl bg-[#450a0a] hover:bg-[#7f1d1d] text-white px-4 py-2 text-xs font-bold transition"
                >
                  Buy Coins &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>
      </SectionPanel>

      {/* Simple Promotion Expiration Popup Modal */}
      {modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-red-200 text-center relative">
            <button
              type="button"
              onClick={() => setModalData(null)}
              className="absolute top-3.5 right-3.5 text-gray-400 hover:text-gray-700 text-xl font-bold p-1 leading-none cursor-pointer"
              aria-label="Close"
            >
              &times;
            </button>

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl">
              🎉
            </div>

            <h3 className="mt-3 text-lg font-black text-red-950">
              Ad Promoted Successfully!
            </h3>

            <p className="mt-1 text-xs font-semibold text-gray-600 truncate max-w-xs mx-auto">
              {modalData.adTitle} &bull; <span className="text-red-700 font-bold">{modalData.rankRange}</span>
            </p>

            {/* Expiry & Time Left Box */}
            <div className="mt-4 rounded-xl border border-red-100 bg-pink-50/50 p-4 space-y-2.5 text-left">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                  Promotion Duration &amp; Cost:
                </p>
                <p className="text-xs font-bold text-red-950 mt-0.5">
                  {modalData.days || selectedDays} {((modalData.days || selectedDays) === 1) ? "Day" : "Days"} &bull; <span className="text-red-700 font-extrabold">{modalData.totalCoins || totalCoinsCost} Coins Paid</span>
                </p>
              </div>

              <div className="border-t border-red-100/80 pt-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                  Shift Timing:
                </p>
                <p className="text-xs font-bold text-red-950 mt-0.5">
                  {modalData.shiftName} (6h daily) {modalData.isCurrentShift ? "• 🟢 Live Now" : modalData.isNextDay ? "• 📅 Tomorrow" : "• 🕒 Scheduled"}
                </p>
              </div>

              <div className="border-t border-red-100/80 pt-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                  {modalData.isCurrentShift ? "Ad Expire Time:" : "Promotion Schedule:"}
                </p>
                {!modalData.isCurrentShift && (
                  <p className="text-xs font-bold text-indigo-900 mt-0.5">
                    Starts: {formatDateTime(modalData.promotedFrom)}
                  </p>
                )}
                <p className="text-sm font-black text-red-950 mt-0.5">
                  Expires: {formatDateTime(modalData.promotedUntil)}
                </p>
              </div>

              <div className="border-t border-red-100/80 pt-2 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600">
                  {modalData.isCurrentShift ? "Time Left in Shift:" : "Shift Length:"}
                </span>
                <span className="text-sm font-black text-emerald-700 font-mono">
                  {modalData.isCurrentShift ? (countdown || "Calculating...") : "6 Hours"}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 flex gap-2">
              <Link
                href="/post-ad/your-ads"
                className="flex-1 rounded-xl bg-[#450a0a] hover:bg-[#7f1d1d] !text-white text-white py-2.5 text-xs sm:text-sm font-bold transition shadow-xs flex items-center justify-center"
                style={{ color: "#ffffff" }}
              >
                View Your Ads
              </Link>
              <button
                type="button"
                onClick={() => setModalData(null)}
                className="rounded-xl border border-gray-300 bg-white hover:bg-gray-50 px-4 py-2.5 text-xs sm:text-sm font-bold text-gray-700 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
