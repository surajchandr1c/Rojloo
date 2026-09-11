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

  useEffect(() => {
    async function loadPackages() {
      try {
        const res = await fetch(`/api/coin-packages?_t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data.packages) ? data.packages : [];
        if (list.length) {
          setPackages(list);
        }
      } catch (err) {
        console.error("Failed to load coin packages:", err);
      }
    }

    loadPackages();
  }, []);

  return (
    <section className="rounded-2xl bg-white p-4 sm:p-6 w-full max-w-full overflow-hidden box-border">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-red-100 pb-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-red-950">Buy Coins</h2>
          <p className="mt-0.5 text-xs sm:text-sm text-red-900">
            Coins let you promote your ads and unlock premium features. Choose a pack to get started.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs shrink-0 pt-1 sm:pt-0">
          <span className="font-medium text-red-800">
            Available: <strong className="font-black text-red-950">{user?.coins ?? 0} coins</strong>
          </span>
          <span className="text-red-200">•</span>
          <Link
            href="/post-ad/payment-history"
            className="font-bold text-red-700 hover:text-red-900 hover:underline transition"
          >
            Transactions &rarr;
          </Link>
        </div>
      </div>

      {/* Grid of Coin Packages: 1 col on phone, 2-3 cols on tab, 5 cols on desktop */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {packages.map((pkg) => {
          const hasDiscount =
            pkg.originalPrice && Number(pkg.originalPrice) > Number(pkg.price);

          return (
            <div
              key={pkg._id || `${pkg.coins}-${pkg.price}`}
              className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 sm:p-3.5 transition-all overflow-hidden w-full max-w-full box-border ${
                pkg.popular
                  ? "border-red-300 bg-pink-50/80 shadow-xs"
                  : "border-red-100 bg-pink-50/30 hover:bg-pink-50/60"
              }`}
            >
              <div className="min-w-0 w-full">
                {/* Badges row: Popular / Label / Discount */}
                <div className="flex items-center justify-between gap-1.5 mb-1.5 min-h-[22px] flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {pkg.popular && (
                      <span className="inline-block rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shrink-0">
                        Popular
                      </span>
                    )}
                    {pkg.label && (
                      <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-semibold text-red-800 shrink-0">
                        {pkg.label}
                      </span>
                    )}
                  </div>

                  {pkg.discount && pkg.discount.trim() !== "—" && pkg.discount.trim() !== "-" && (
                    <span className="inline-block rounded bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[9px] font-bold text-amber-900 shrink-0">
                      {pkg.discount}
                    </span>
                  )}
                </div>

                {/* Coins Number */}
                <p className="text-xl sm:text-lg lg:text-xl font-black text-red-950 leading-tight">
                  {pkg.coins}
                  <span className="ml-1.5 text-xs sm:text-[11px] font-semibold text-red-700">
                    coins
                  </span>
                </p>

                {/* Breakdown / Bonus text (e.g. 28 + 2 Free) */}
                {pkg.breakdown && (
                  <p className="mt-1 text-xs sm:text-[10px] font-bold text-emerald-800 break-words">
                    {pkg.breakdown}
                  </p>
                )}

                {/* Price Display */}
                <div className="mt-1.5 leading-snug">
                  {hasDiscount && (
                    <span className="block text-xs sm:text-[10px] text-gray-400 line-through">
                      ₹{Number(pkg.originalPrice).toFixed(2)}
                    </span>
                  )}
                  <span className="text-sm sm:text-xs lg:text-[13px] font-bold text-red-900 break-words">
                    for ₹{Number(pkg.price).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Buy Button */}
              <Button
                type="button"
                variant="solid"
                size="sm"
                className="!text-white w-full py-1.5 text-xs font-bold mt-auto shrink-0 shadow-xs"
                onClick={() =>
                  router.push(
                    `/post-ad/payment?coins=${pkg.coins}&price=${encodeURIComponent(
                      `₹${Number(pkg.price).toFixed(2)}`
                    )}`
                  )
                }
              >
                Buy
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
