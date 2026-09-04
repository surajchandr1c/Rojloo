"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";

type CoinPackage = {
  coins: number;
  price: number;
  label?: string;
  popular?: boolean;
};

const FALLBACK_PACKAGES: CoinPackage[] = [
  { coins: 50, price: 49, label: "Starter" },
  { coins: 200, price: 149, label: "Popular", popular: true },
  { coins: 500, price: 349, label: "Value" },
  { coins: 1200, price: 699, label: "Best Deal" },
];

export default function BuyCoinSection() {
  const router = useRouter();
  const [packages, setPackages] = useState<CoinPackage[]>(FALLBACK_PACKAGES);

  useEffect(() => {
    async function loadPackages() {
      try {
        const res = await fetch("/api/coin-packages", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data.packages) ? data.packages : [];
        if (list.length) {
          setPackages(
            list.map((pkg: { coins: number; price: number; label?: string; popular?: boolean }) => ({
              coins: Number(pkg.coins),
              price: Number(pkg.price),
              label: pkg.label || "",
              popular: Boolean(pkg.popular),
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load coin packages:", err);
      }
    }

    loadPackages();
  }, []);

  return (
    <section className="rounded-[1.75rem] bg-white p-6 sm:p-8">
      <h2 className="text-2xl font-black text-red-950">Buy Coins</h2>
      <p className="mt-3 text-base leading-7 text-red-900">
        Coins let you promote your ads and unlock premium features. Choose a
        pack to get started.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {packages.map((pkg) => (
          <div
            key={`${pkg.coins}-${pkg.price}`}
            className={`flex flex-col justify-between gap-4 rounded-[1.5rem] border p-5 ${
              pkg.popular
                ? "border-red-300 bg-pink-50"
                : "border-red-100 bg-pink-50/40"
            }`}
          >
            <div>
              {pkg.popular && (
                <span className="mb-2 inline-block rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  Popular
                </span>
              )}
              <p className="text-3xl font-black text-red-950">
                {pkg.coins}
                <span className="ml-1 text-base font-semibold text-red-700">
                  coins
                </span>
              </p>
              <p className="mt-1 text-sm text-red-900">for ₹{Number(pkg.price).toFixed(2)}</p>
            </div>
            <Button
              type="button"
              variant="solid"
              className="!text-white"
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
        ))}
      </div>
    </section>
  );
}
