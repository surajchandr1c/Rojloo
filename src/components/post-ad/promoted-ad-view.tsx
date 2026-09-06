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

export default function PromotedAdView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const adIdParam = searchParams.get("adId") || "";

  const ready = useAuthGuard();
  const { user, refreshAuth } = useAuth();

  const [ads, setAds] = useState<Ad[]>([]);
  const [promoPackages, setPromoPackages] = useState<PromotionPackage[]>(DEFAULT_PROMO_PACKAGES);
  const [selectedAdId, setSelectedAdId] = useState<string>(adIdParam);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("vip-3-days");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
  const userCoins = Number(user?.coins ?? 0);
  const hasEnoughCoins = userCoins >= selectedPkg.coinsCost;

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
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to promote ad.");
      }

      setSuccessMessage(
        `🎉 Successfully promoted "${selectedAd.name || selectedAd.title}" with ${selectedPkg.title}!`
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
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-red-950">
              Promote The Ad
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-red-900/80">
              Get up to 5x more visibility, unlock all photos, and stay at the top of search results.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="soft"
              onClick={() => router.push("/post-ad/your-ads")}
              className="!text-black text-xs sm:text-sm font-bold"
            >
              &larr; Back to Your Ads
            </Button>
          </div>
        </div>

        {/* User Coin Balance Banner */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-white border border-red-200/90 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-lg">
              🪙
            </span>
            <div>
              <p className="text-xs text-gray-500 font-medium">Your Available Balance</p>
              <p className="text-base sm:text-lg font-black text-red-950">
                {userCoins} <span className="text-xs font-bold text-red-800">Coins</span>
              </p>
            </div>
          </div>

          <Link
            href="/post-ad/buy-coin"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#450a0a] hover:bg-[#7f1d1d] !text-white hover:!text-white visited:!text-white px-4 py-2 text-xs font-bold transition shadow-xs"
            style={{ color: "#ffffff" }}
          >
            <span className="!text-white text-white" style={{ color: "#ffffff" }}>+ Buy More Coins</span>
          </Link>
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

        {/* Ad Selector Section */}
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
              {/* Dropdown to pick ad */}
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

              {/* Selected Ad Preview Card */}
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

        {/* Promotion Packages Grid */}
        <div className="mt-6 rounded-2xl bg-white border border-red-200/90 p-4 sm:p-6 shadow-xs">
          <h2 className="text-sm sm:text-base font-black text-red-950">
            2. Choose a Promotion Package
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Select the promotion duration and tier that suits your advertising goals.
          </p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {promoPackages.map((pkg) => {
              const isSelected = selectedPackageId === pkg.id;
              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackageId(pkg.id)}
                  className={`relative cursor-pointer rounded-2xl p-4 transition-all flex flex-col justify-between border ${
                    isSelected
                      ? "border-red-600 bg-pink-50/80 shadow-md ring-2 ring-red-500/20"
                      : "border-red-100 bg-white hover:border-red-300 hover:bg-pink-50/30"
                  }`}
                >
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
                    <h3 className="text-xs sm:text-sm font-black text-red-950 pr-8">
                      {pkg.title}
                    </h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-red-600">
                        {pkg.coinsCost}
                      </span>
                      <span className="text-xs font-bold text-gray-600">Coins</span>
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
                          ? "bg-[#450a0a] text-white"
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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#450a0a] hover:bg-[#7f1d1d] disabled:opacity-50 text-white px-6 py-2.5 text-xs sm:text-sm font-black uppercase tracking-wider transition shadow-md"
              >
                <span>🚀</span>
                <span>{submitting ? "Promoting..." : `Promote Now (${selectedPkg.coinsCost} Coins)`}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-700">
                  Need {selectedPkg.coinsCost - userCoins} more coins
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

        {/* Currently Promoted Ads Section */}
        {currentlyPromotedAds.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white border border-red-200/90 p-4 sm:p-6 shadow-xs">
            <h2 className="text-sm sm:text-base font-black text-red-950">
              Your Active Promoted Ads ({currentlyPromotedAds.length})
            </h2>
            <div className="mt-3 space-y-3">
              {currentlyPromotedAds.map((ad) => (
                <div
                  key={ad._id}
                  className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-700 font-black text-base">⭐</span>
                    <div>
                      <p className="font-bold text-red-950">
                        {ad.city ? `[${ad.city.toUpperCase()}] ` : ""}
                        {ad.title || ad.name}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Category: {ad.category || "General"} &bull; Status: Active
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                      Promoted Active
                    </span>
                    <Link
                      href="/post-ad/your-ads"
                      className="text-red-700 font-bold hover:underline"
                    >
                      View in Your Ads &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionPanel>
    </main>
  );
}
