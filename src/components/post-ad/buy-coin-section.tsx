"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { DEFAULT_PACKAGES, type CoinPackage } from "@/lib/coin-packages";

const FALLBACK_PACKAGES: CoinPackage[] = DEFAULT_PACKAGES.map((pkg, idx) => ({
  _id: `coin-package-${idx + 1}`,
  ...pkg,
}));

export default function BuyCoinSection() {
  const router = useRouter();
  const { user } = useAuth();
  const [packages, setPackages] = useState<CoinPackage[]>(FALLBACK_PACKAGES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPackages() {
      try {
        const res = await fetch("/api/coin-packages", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data.packages) ? data.packages : [];
        if (list.length) {
          setPackages(list);
        }
      } catch (err) {
        console.error("Failed to load coin packages:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPackages();
  }, []);

  return (
    <section className="rounded-[1.75rem] bg-white p-5 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-red-950">Buy Coins</h2>
          <p className="mt-1 text-sm sm:text-base leading-6 text-red-900">
            Coins let you promote your ads and unlock premium features. Choose a pack to get started.
          </p>
        </div>

        {/* Available Coins & Transactions History */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
          <div className="rounded-2xl border border-red-200 bg-pink-50/70 px-4 py-2 text-center sm:text-right">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-red-800">
              Available Coins
            </span>
            <span className="text-xl font-black text-red-950">
              {user?.coins ?? 0}
            </span>
          </div>

          <Link
            href="/post-ad/payment-history"
            className="inline-flex items-center gap-1.5 rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-red-900 shadow-xs hover:bg-pink-50 transition"
          >
            Transactions History &rarr;
          </Link>
        </div>
      </div>

      {/* Package List / Grid */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        {packages.map((pkg) => {
          const hasDiscount =
            pkg.originalPrice && Number(pkg.originalPrice) > Number(pkg.price);

          return (
            <div
              key={pkg._id || `${pkg.coins}-${pkg.price}`}
              onClick={() =>
                router.push(
                  `/post-ad/payment?coins=${pkg.coins}&price=${encodeURIComponent(
                    `₹${Number(pkg.price).toFixed(2)}`
                  )}`
                )
              }
              className={`group relative flex flex-col justify-between gap-4 rounded-2xl border p-5 sm:p-6 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01] ${
                pkg.popular
                  ? "border-red-400 bg-gradient-to-br from-pink-50 via-rose-50/40 to-white shadow-xs"
                  : "border-red-200/90 bg-white hover:border-red-300 hover:bg-pink-50/30"
              }`}
            >
              {/* Popular Badge */}
              {pkg.popular && (
                <div className="absolute -top-3 right-6 rounded-full bg-gradient-to-r from-red-600 to-rose-600 px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-white shadow-sm">
                  Popular
                </div>
              )}

              {/* Main Info */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black tracking-tight text-red-950">
                      {pkg.coins}
                    </span>
                    <span className="text-base sm:text-lg font-bold text-red-900">
                      Coins
                    </span>
                  </div>

                  {/* Breakdown pill (e.g. 28 + 2 Free) */}
                  {pkg.breakdown && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="inline-flex items-center rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-800">
                        {pkg.breakdown}
                      </span>
                    </div>
                  )}
                </div>

                {/* Discount Badge (e.g. 7% DISCOUNT ▶) */}
                {pkg.discount ? (
                  <div className="shrink-0">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100/90 border border-amber-300 px-2.5 py-1 text-xs font-black text-amber-900">
                      {pkg.discount}
                      <svg
                        className="h-3 w-3 text-amber-700"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  </div>
                ) : pkg.label ? (
                  <span className="shrink-0 rounded-lg bg-pink-100 border border-red-200 px-2.5 py-1 text-xs font-bold text-red-900">
                    {pkg.label}
                  </span>
                ) : null}
              </div>

              {/* Price & Buy Action Button */}
              <div className="mt-2 flex items-end justify-between gap-3 border-t border-red-100/80 pt-3">
                <div>
                  {hasDiscount && (
                    <div className="text-xs sm:text-sm font-semibold text-gray-400 line-through">
                      ₹{Number(pkg.originalPrice).toFixed(2)}
                    </div>
                  )}
                  <div className="text-2xl sm:text-3xl font-black text-red-950">
                    ₹{Number(pkg.price).toFixed(2)}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="solid"
                  size="sm"
                  className="!text-white shadow-sm group-hover:scale-105 transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(
                      `/post-ad/payment?coins=${pkg.coins}&price=${encodeURIComponent(
                        `₹${Number(pkg.price).toFixed(2)}`
                      )}`
                    );
                  }}
                >
                  Buy Now
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Need Help Support Channel Section (from PDF Page 2 & 3) */}
      <div className="mt-12 rounded-3xl border border-red-200 bg-gradient-to-r from-red-50/60 via-pink-50/40 to-red-50/60 p-6 sm:p-8 text-center shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-red-800 shadow-xs border border-red-100 mb-3">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-black text-red-950">Need help?</h3>
        <p className="mt-1.5 text-xs sm:text-sm text-red-900 max-w-lg mx-auto leading-relaxed">
          Contact us through our service channels, from Monday to Friday, from 9:00 am to 4:00 pm.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl bg-[#450a0a] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#7f1d1d] transition"
          >
            Contact Support &rarr;
          </Link>
          <Link
            href="/post-ad/payment-history"
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-red-950 shadow-xs hover:bg-red-50 transition"
          >
            View Payment History
          </Link>
        </div>
      </div>
    </section>
  );
}
