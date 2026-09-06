"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import { SectionPanel } from "@/components/ui/card";
import YourAdsSection from "./your-ads-section";
import { useAuthGuard } from "./use-auth-guard";
import { useAuth } from "@/lib/auth-context";
import { authenticatedFetch } from "@/lib/auth-fetch";
import type { Ad } from "./types";

export default function YourAdsView() {
  const router = useRouter();
  const ready = useAuthGuard();
  const { user } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAds = () => {
    setLoading(true);
    authenticatedFetch("/api/ads")
      .then((r) => r.json())
      .then((data) => setAds(data.ads ?? []))
      .catch(() => setAds([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (ready) loadAds();
  }, [ready]);

  const handleEdit = (ad: Ad) => router.push(`/post-ad/edit/${ad._id}`);

  const handleDelete = async (ad: Ad) => {
    if (!ad._id) return;
    if (!window.confirm(`Delete "${ad.name}"?`)) return;
    await authenticatedFetch(`/api/ads/${ad._id}`, { method: "DELETE" }).catch(() => {});
    loadAds();
  };

  const handleToggleStatus = async (ad: Ad) => {
    if (!ad._id) return;
    const nextStatus = ad.status === "suspended" ? "active" : "suspended";
    try {
      const res = await authenticatedFetch(`/api/ads/${ad._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        loadAds();
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  };

  if (!ready) return null;

  const validAds = ads.filter((ad) => (ad.status ?? "active") !== "deleted");

  return (
    <main className="px-2.5 py-6 sm:px-6 sm:py-10 lg:px-8 max-w-full overflow-hidden">
      <SectionPanel className="p-3 sm:p-6 md:p-8 w-full max-w-6xl mx-auto overflow-hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-red-950 sm:text-4xl">
              Ads
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              href="/post-ad/new"
              variant="solid"
              className="!text-white text-xs sm:text-sm font-bold"
            >
              + Post Ad
            </Button>
            <Button
              variant="soft"
              onClick={() => router.push("/post-ad")}
              className="!text-black text-xs sm:text-sm"
            >
              Back
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <YourAdsSection
            ads={validAds}
            userEmail={user?.email}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
            loading={loading}
          />
        </div>
      </SectionPanel>
    </main>
  );
}
