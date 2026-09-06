"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminContext } from "@/components/admin/use-admin-context";

type CoinPackage = {
  _id?: string;
  coins: number;
  price: number;
  label?: string;
  popular?: boolean;
};

const emptyPackage = (): CoinPackage => ({ coins: 0, price: 0, label: "", popular: false });

export default function SetCoinsPage() {
  const router = useRouter();
  const me = useAdminContext();
  const [packages, setPackages] = useState<CoinPackage[]>([emptyPackage(), emptyPackage(), emptyPackage(), emptyPackage()]);
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
      const filled = Array.from({ length: 4 }, (_, index) => {
        const item = items[index] ?? emptyPackage();
        return {
          _id: item._id,
          coins: Number(item.coins || 0),
          price: Number(item.price || 0),
          label: item.label || "",
          popular: Boolean(item.popular),
        };
      });
      setPackages(filled);
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

  function updatePackage(index: number, field: "coins" | "price" | "label" | "popular", value: string | boolean | number) {
    setPackages((prev) =>
      prev.map((pkg, i) => {
        if (i !== index) return pkg;
        if (field === "coins") return { ...pkg, coins: Number(value) || 0 };
        if (field === "price") return { ...pkg, price: Number(value) || 0 };
        if (field === "label") return { ...pkg, label: String(value) };
        if (field === "popular") return { ...pkg, popular: Boolean(value) };
        return pkg;
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const payload = packages.filter((pkg) => Number(pkg.coins) > 0 || Number(pkg.price) > 0);

      if (payload.length === 0) {
        setError("Please add at least one coin package.");
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

      setSuccess("Coin packages updated successfully.");
      setPackages(
        Array.from({ length: 4 }, (_, index) => {
          const pkg = data.packages?.[index] ?? payload[index] ?? emptyPackage();
          return {
            _id: pkg._id,
            coins: Number(pkg.coins || 0),
            price: Number(pkg.price || 0),
            label: pkg.label || "",
            popular: Boolean(pkg.popular),
          };
        })
      );
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
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-black text-red-950">Set Coin Packages</h1>
        <p className="mt-2 text-red-900">
          Update the packages shown on the public Buy Coins page.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 rounded-2xl border border-red-200 bg-white p-4 sm:p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {packages.map((pkg, index) => (
              <div key={index} className="rounded-2xl border border-red-100 bg-red-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-red-950">Package {index + 1}</p>
                  <label className="flex items-center gap-2 text-xs text-red-800">
                    <input
                      type="checkbox"
                      checked={Boolean(pkg.popular)}
                      onChange={(e) => updatePackage(index, "popular", e.target.checked)}
                      className="h-4 w-4 accent-red-600"
                    />
                    Popular
                  </label>
                </div>

                <label className="block text-xs font-semibold text-red-700">Coins</label>
                <input
                  type="number"
                  min="1"
                  value={pkg.coins}
                  onChange={(e) => updatePackage(index, "coins", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-red-200 px-3 py-2 text-red-950 outline-none focus:border-red-500"
                />

                <label className="mt-3 block text-xs font-semibold text-red-700">Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={pkg.price}
                  onChange={(e) => updatePackage(index, "price", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-red-200 px-3 py-2 text-red-950 outline-none focus:border-red-500"
                />

                <label className="mt-3 block text-xs font-semibold text-red-700">Label</label>
                <input
                  type="text"
                  value={pkg.label || ""}
                  onChange={(e) => updatePackage(index, "label", e.target.value)}
                  placeholder="Starter / Popular / Best Deal"
                  className="mt-1 w-full rounded-lg border border-red-200 px-3 py-2 text-red-950 outline-none focus:border-red-500"
                />
              </div>
            ))}
          </div>

          {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
          {success && <p className="mt-4 text-sm text-green-700">{success}</p>}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving || loading}
              className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Coin Packages"}
            </button>
            <button
              type="button"
              onClick={() => setPackages([emptyPackage(), emptyPackage(), emptyPackage(), emptyPackage()])}
              className="rounded-full border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-900 hover:bg-red-50"
            >
              Clear All
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
