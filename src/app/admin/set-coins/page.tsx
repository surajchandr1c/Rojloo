"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminContext } from "@/components/admin/use-admin-context";
import { DEFAULT_PACKAGES, type CoinPackage } from "@/lib/coin-packages";

const emptyPackage = (): CoinPackage => ({
  coins: 0,
  price: 0,
  originalPrice: 0,
  breakdown: "",
  discount: "",
  label: "",
  popular: false,
});

export default function SetCoinsPage() {
  const router = useRouter();
  const me = useAdminContext();
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadPackages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/set-coins", { credentials: "include" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }

      const data = await res.json();
      const items = Array.isArray(data.packages) && data.packages.length > 0 ? data.packages : [];

      if (items.length > 0) {
        setPackages(
          items.map((item: CoinPackage) => ({
            _id: item._id,
            coins: Number(item.coins || 0),
            price: Number(item.price || 0),
            originalPrice: item.originalPrice ? Number(item.originalPrice) : undefined,
            breakdown: item.breakdown || "",
            discount: item.discount || "",
            label: item.label || "",
            popular: Boolean(item.popular),
          }))
        );
      } else {
        // Fallback to PDF default packages
        setPackages(DEFAULT_PACKAGES.map((pkg, idx) => ({ _id: `pkg-${idx + 1}`, ...pkg })));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load coin packages.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (me === null) return;
    if (!me.authenticated) {
      router.replace("/admin/login");
      return;
    }

    queueMicrotask(() => {
      void loadPackages();
    });
  }, [loadPackages, me, router]);

  function updatePackage(
    index: number,
    field: keyof CoinPackage,
    value: string | boolean | number
  ) {
    setPackages((prev) =>
      prev.map((pkg, i) => {
        if (i !== index) return pkg;
        if (field === "coins") return { ...pkg, coins: Number(value) || 0 };
        if (field === "price") return { ...pkg, price: Number(value) || 0 };
        if (field === "originalPrice") return { ...pkg, originalPrice: Number(value) || undefined };
        if (field === "popular") return { ...pkg, popular: Boolean(value) };
        return { ...pkg, [field]: String(value) };
      })
    );
  }

  function handleAddPackage() {
    setPackages((prev) => [...prev, emptyPackage()]);
  }

  function handleDeletePackage(index: number) {
    setPackages((prev) => prev.filter((_, i) => i !== index));
  }

  function handleResetToDefaults() {
    if (
      confirm(
        "Reset coin packages to the default 10 packages from the PDF? Any unsaved changes will be replaced."
      )
    ) {
      setPackages(DEFAULT_PACKAGES.map((pkg, idx) => ({ _id: `pkg-${idx + 1}`, ...pkg })));
      setSuccess("Reset to PDF 10 coin packages. Click 'Save Coin Packages' to persist.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const payload = packages.filter((pkg) => Number(pkg.coins) > 0 && Number(pkg.price) >= 0);

      if (payload.length === 0) {
        setError("Please add at least one valid coin package.");
        return;
      }

      const res = await fetch("/api/admin/set-coins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ packages: payload }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to save coin packages.");
        return;
      }

      setSuccess(`Successfully saved ${payload.length} coin packages.`);
      if (Array.isArray(data.packages)) {
        setPackages(data.packages);
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!me?.authenticated) return null;

  return (
    <main className="min-h-screen bg-red-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 min-w-0">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-red-200 pb-4">
          <div>
            <h1 className="text-3xl font-black text-red-950">Set Coin Packages</h1>
            <p className="mt-1 text-sm text-red-900">
              Manage the coin packages shown on the public Buy Coins page. Configured with the PDF coin amounts and discounts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="rounded-xl border border-red-300 bg-white px-4 py-2 text-xs font-bold text-red-900 hover:bg-red-50 transition shadow-xs"
            >
              Reset to PDF 10 Packages
            </button>
            <button
              type="button"
              onClick={handleAddPackage}
              className="rounded-xl bg-[#450a0a] px-4 py-2 text-xs font-bold text-white hover:bg-[#7f1d1d] transition shadow-xs"
            >
              + Add Package
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-100 border border-red-200 p-3 text-sm text-red-900 font-semibold">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-xl bg-green-100 border border-green-200 p-3 text-sm text-green-900 font-semibold">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {packages.map((pkg, index) => (
              <div
                key={pkg._id || index}
                className="relative rounded-2xl border border-red-200 bg-white p-4 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="mb-3 flex items-center justify-between gap-2 border-b border-red-100 pb-2">
                    <span className="text-xs font-black text-red-950 uppercase tracking-wider">
                      Package #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeletePackage(index)}
                      className="text-xs font-bold text-red-600 hover:text-red-900"
                      title="Delete package"
                    >
                      &times; Remove
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <label className="block font-bold text-red-950">Total Coins</label>
                      <input
                        type="number"
                        min="1"
                        value={pkg.coins || ""}
                        onChange={(e) => updatePackage(index, "coins", e.target.value)}
                        placeholder="e.g. 30"
                        className="mt-0.5 w-full rounded-lg border border-red-200 px-2.5 py-1.5 text-red-950 font-bold outline-none focus:border-red-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-red-950">Final Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={pkg.price || ""}
                        onChange={(e) => updatePackage(index, "price", e.target.value)}
                        placeholder="e.g. 1316"
                        className="mt-0.5 w-full rounded-lg border border-red-200 px-2.5 py-1.5 text-red-950 font-bold outline-none focus:border-red-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-red-800">
                        Original Price (₹) <span className="text-gray-400 font-normal">(strikethrough)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={pkg.originalPrice || ""}
                        onChange={(e) => updatePackage(index, "originalPrice", e.target.value)}
                        placeholder="e.g. 1410"
                        className="mt-0.5 w-full rounded-lg border border-red-200 px-2.5 py-1.5 text-red-950 outline-none focus:border-red-400"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-red-800">Breakdown / Bonus</label>
                      <input
                        type="text"
                        value={pkg.breakdown || ""}
                        onChange={(e) => updatePackage(index, "breakdown", e.target.value)}
                        placeholder="e.g. 28 + 2 Free"
                        className="mt-0.5 w-full rounded-lg border border-red-200 px-2.5 py-1.5 text-red-950 outline-none focus:border-red-400"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-red-800">Discount Tag</label>
                      <input
                        type="text"
                        value={pkg.discount || ""}
                        onChange={(e) => updatePackage(index, "discount", e.target.value)}
                        placeholder="e.g. 7% DISCOUNT"
                        className="mt-0.5 w-full rounded-lg border border-red-200 px-2.5 py-1.5 text-red-950 outline-none focus:border-red-400"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-red-800">Label</label>
                      <input
                        type="text"
                        value={pkg.label || ""}
                        onChange={(e) => updatePackage(index, "label", e.target.value)}
                        placeholder="e.g. Popular"
                        className="mt-0.5 w-full rounded-lg border border-red-200 px-2.5 py-1.5 text-red-950 outline-none focus:border-red-400"
                      />
                    </div>

                    <div className="pt-1">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-red-950">
                        <input
                          type="checkbox"
                          checked={Boolean(pkg.popular)}
                          onChange={(e) => updatePackage(index, "popular", e.target.checked)}
                          className="h-4 w-4 rounded accent-red-700"
                        />
                        Mark as Popular
                      </label>
                    </div>
                  </div>
                </div>

                {/* Card Preview Footnote */}
                <div className="mt-3 border-t border-red-100 pt-2 text-[11px] text-red-700">
                  Preview: <strong>{pkg.coins || 0} Coins</strong> for{" "}
                  <strong>₹{Number(pkg.price || 0).toFixed(2)}</strong>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving || loading || packages.length === 0}
              className="rounded-xl bg-[#450a0a] px-6 py-3 text-sm font-bold text-white hover:bg-[#7f1d1d] disabled:opacity-50 transition shadow-sm"
            >
              {saving ? "Saving..." : `Save All ${packages.length} Packages`}
            </button>
            <button
              type="button"
              onClick={handleAddPackage}
              className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-950 hover:bg-pink-50 transition"
            >
              + Add Another Package
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
