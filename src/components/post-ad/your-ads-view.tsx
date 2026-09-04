"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import { SectionPanel } from "@/components/ui/card";
import YourAdsSection from "./your-ads-section";
import { useAuthGuard } from "./use-auth-guard";
import { authenticatedFetch } from "@/lib/auth-fetch";
import type { Ad } from "./types";

export default function YourAdsView() {
  const router = useRouter();
  const ready = useAuthGuard();
  const [ads, setAds] = useState<Ad[]>([]);

  const loadAds = () => {
    authenticatedFetch("/api/ads")
      .then((r) => r.json())
      .then((data) => setAds(data.ads ?? []))
      .catch(() => setAds([]));
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

  if (!ready) return null;

  const activeAds = ads.filter((ad) => (ad.status ?? "active") !== "deleted");

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <SectionPanel>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-black text-red-950 sm:text-4xl">
            Your Ads
          </h1>
          <Button
            variant="soft"
            onClick={() => router.push("/post-ad")}
            className="!text-black"
          >
            Back
          </Button>
        </div>

        <div className="mt-8">
          <YourAdsSection
            ads={activeAds}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </SectionPanel>
    </main>
  );
}
