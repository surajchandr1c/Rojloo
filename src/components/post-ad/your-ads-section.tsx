"use client";

import { useState } from "react";
import Link from "next/link";
import type { Ad } from "./types";
import { cityPlaces } from "@/lib/places";
import { YourAdsListSkeleton } from "@/components/skeletons/post-ad-skeletons";

function getCityUrl(cityName: string) {
  if (!cityName) return "/places";
  const city = cityPlaces.find(
    (place) => place.name.toLowerCase() === cityName.toLowerCase()
  );
  if (city) return `/places/${city.slug}`;
  const slug = cityName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `/places/${slug}`;
}

function formatShortDate(date?: string | Date) {
  const d = date ? new Date(date) : new Date();
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const day = String(d.getDate()).padStart(2, "0");
  const month = months[d.getMonth()] || "Oct";
  const year = String(d.getFullYear()).slice(-2);
  return `${day} ${month} ${year}`;
}

function formatFullDate(date?: string | Date) {
  const d = date ? new Date(date) : new Date();
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

type TabType = "all" | "promoted" | "free" | "not_published";

interface TabItem {
  id: TabType;
  label: string;
}

const TABS: TabItem[] = [
  { id: "all", label: "All" },
  { id: "promoted", label: "Promoted" },
  { id: "free", label: "Free" },
  { id: "not_published", label: "Not Published" },
];

export default function YourAdsSection({
  ads,
  userEmail,
  onEdit,
  onDelete,
  onToggleStatus,
  loading = false,
}: {
  ads: Ad[];
  userEmail?: string;
  onEdit: (ad: Ad) => void;
  onDelete: (ad: Ad) => void;
  onToggleStatus?: (ad: Ad) => void;
  loading?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabType>("all");

  const isAdPromoted = (ad: Ad) => {
    const raw = ad as unknown as Record<string, unknown>;
    return Boolean(raw.promoted || raw.isPromoted || raw.promotedUntil || raw.isVip);
  };

  const allAds = ads.filter((ad) => (ad.status ?? "active") !== "deleted");
  const promotedAds = allAds.filter((ad) => isAdPromoted(ad));
  const freeAds = allAds.filter((ad) => !isAdPromoted(ad));
  const notPublishedAds = ads.filter(
    (ad) => ad.status === "suspended" || ad.status === "pending" || ad.status === "draft"
  );

  let currentList: Ad[] = [];
  let countLabel = "active ads";

  if (activeTab === "all") {
    currentList = allAds;
    countLabel = "active ads";
  } else if (activeTab === "promoted") {
    currentList = promotedAds;
    countLabel = "promoted ads";
  } else if (activeTab === "free") {
    currentList = freeAds;
    countLabel = "free ads";
  } else {
    currentList = notPublishedAds;
    countLabel = "not published ads";
  }

  return (
    <section className="rounded-2xl bg-white p-4 sm:p-7 shadow-xs">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-5 sm:gap-8 border-b border-red-100 pb-2 text-sm sm:text-base overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2 transition-all shrink-0 font-bold ${
                isActive
                  ? "text-red-950 border-b-2 border-red-700 font-black"
                  : "text-red-900/60 hover:text-red-950"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Ads Count Heading */}
      <div className="mt-4">
        <p className="text-sm sm:text-base text-red-950">
          You have <strong className="font-black text-red-950">{currentList.length} {countLabel}</strong>
        </p>
      </div>

      {loading ? (
        <div className="mt-6">
          <YourAdsListSkeleton />
        </div>
      ) : currentList.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-pink-50/60 border border-red-100 p-8 text-center">
          <p className="text-sm font-semibold text-red-900">
            No ads found in the <strong className="text-red-950">{activeTab.replace("_", " ")}</strong> tab.
          </p>
          <Link
            href="/post-ad/new"
            className="mt-4 inline-block rounded-xl bg-[#450a0a] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#7f1d1d] transition shadow-xs"
          >
            + Post a New Ad
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {currentList.map((ad) => {
            const hasImage = Array.isArray(ad.images) && ad.images.length > 0 && Boolean(ad.images[0]);
            const isPromoted = isAdPromoted(ad);
            const created = ad.createdAt ? new Date(ad.createdAt) : new Date();
            const expireDate = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
            const expireShort = formatShortDate(expireDate);
            const todayFormatted = formatFullDate(new Date());

            const displayTitle = ad.city
              ? `[${ad.city.toUpperCase()}] • √ ${ad.title || ad.name}`
              : `√ ${ad.title || ad.name}`;

            return (
              <article
                key={ad._id}
                className="rounded-2xl border border-red-200/90 bg-white p-4 sm:p-6 shadow-xs flex flex-col gap-4 transition-all"
              >
                {/* Top Status & Expiration Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-red-100 pb-3.5 text-xs">
                  {/* Left Metadata */}
                  <div className="space-y-1">
                    <p className="text-gray-600 font-medium">
                      Ad Expire Date:{" "}
                      <strong className="text-red-950 font-bold">{expireShort}</strong>
                    </p>
                    <p className="text-gray-600 font-medium truncate max-w-xs sm:max-w-sm">
                      Published:{" "}
                      <strong className="text-red-950 font-bold">{userEmail || "You"}</strong>
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700">
                        🛒 {isPromoted ? "Promotion active" : "Promotion to pay"}
                      </span>
                    </div>
                    <div className="pt-1">
                      <span
                        className={`inline-block rounded-full px-3 py-0.5 text-xs font-bold ${
                          ad.status === "suspended"
                            ? "border border-amber-300 bg-amber-50 text-amber-800"
                            : "border border-emerald-300 bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        {ad.status === "suspended" ? "Suspended" : "Actives"}
                      </span>
                    </div>
                  </div>

                  {/* Right VIP / Promo Schedule */}
                  <div className="sm:text-right space-y-1 text-xs">
                    <p className="font-bold text-red-950">{isPromoted ? "VIP 1x3" : "Vip 1x3"}</p>
                    <p className="text-gray-500 text-[11px]">12 pm - 03 pm</p>
                    <p className="text-gray-600 font-semibold text-[11px]">3 TOP-US 1 Day</p>
                    <p className="text-red-600 font-semibold text-[11px] flex items-center sm:justify-end gap-1 pt-0.5">
                      <span>⚠</span>
                      <span>
                        {isPromoted
                          ? `Promotion active until: ${expireShort}`
                          : `Your promotion has expired! : ${todayFormatted}`}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Ad Preview Card */}
                <div className="rounded-xl border border-red-100/90 bg-pink-50/20 p-3 sm:p-4 flex flex-col sm:flex-row gap-4">
                  {/* Thumbnail Photo with Image Count */}
                  <div className="relative shrink-0 w-full sm:w-40 h-48 sm:h-36 rounded-xl overflow-hidden bg-pink-100 flex items-center justify-center border border-red-200/60">
                    {hasImage ? (
                      <img
                        src={ad.images?.[0]}
                        alt={ad.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="p-3 text-center text-xs text-gray-500 font-medium leading-relaxed">
                        Preview not visible on line
                      </div>
                    )}
                    <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                      {ad.images?.length || 1}
                    </span>
                  </div>

                  {/* Ad Information */}
                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {ad.category || "Call Girls"}
                      </p>
                      <h3 className="mt-1 text-sm sm:text-base font-black text-red-600 leading-snug break-words">
                        {displayTitle}
                      </h3>
                      <p className="mt-1.5 text-xs text-gray-700 leading-relaxed line-clamp-3">
                        {ad.about}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600 font-semibold">
                      {ad.age && (
                        <span className="flex items-center gap-1">
                          📅 {ad.age} Years
                        </span>
                      )}
                      {ad.city && (
                        <span className="flex items-center gap-1">
                          📍 {ad.city}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        🌐 IN Indian
                      </span>
                    </div>
                  </div>
                </div>

                {/* Free Ad Banner (shown for non-promoted ads) */}
                {!isPromoted && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-pink-50/50 p-3 text-xs text-red-950">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-900 text-[11px] font-bold text-white">
                      i
                    </div>
                    <div>
                      <p className="font-bold text-red-950">Free ad</p>
                      <p className="text-red-900/80 text-[11px] mt-0.5">
                        Only 1 image will be visible unless you activate a promo &amp; unlock other images
                      </p>
                    </div>
                  </div>
                )}

                {/* Bottom Actions Bar */}
                <div className="flex items-center justify-around border-t border-red-100 pt-3 text-xs font-bold">
                  <Link
                    href={getCityUrl(ad.city)}
                    className="flex items-center gap-1 text-red-700 hover:text-red-950 transition py-1 px-2.5 rounded-lg hover:bg-pink-100/60"
                  >
                    <span>👁</span>
                    <span>VIEW</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => onToggleStatus?.(ad)}
                    className="flex items-center gap-1 text-red-700 hover:text-red-950 transition py-1 px-2.5 rounded-lg hover:bg-pink-100/60"
                  >
                    <span>{ad.status === "suspended" ? "▶" : "⏸"}</span>
                    <span>{ad.status === "suspended" ? "ACTIVATE" : "SUSPEND"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEdit(ad)}
                    className="flex items-center gap-1 text-red-700 hover:text-red-950 transition py-1 px-2.5 rounded-lg hover:bg-pink-100/60"
                  >
                    <span>✏</span>
                    <span>EDIT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(ad)}
                    className="flex items-center gap-1 text-red-700 hover:text-red-950 transition py-1 px-2.5 rounded-lg hover:bg-pink-100/60"
                  >
                    <span>🗑</span>
                    <span>DELETE</span>
                  </button>
                </div>

                {/* Renew Promo Button */}
                <Link
                  href="/post-ad/buy-coin"
                  className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-pink-50/70 hover:bg-pink-100 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-red-900 transition shadow-xs"
                >
                  <span>🔓</span>
                  <span>RENEW PROMO AND UNLOCK IMAGES</span>
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
