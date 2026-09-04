"use client";

import type { Ad } from "./types";
import Button from "@/components/ui/button";
import { cityPlaces } from "@/lib/places";

function getCityUrl(cityName: string) {
  const city = cityPlaces.find((place) => place.name === cityName);
  return city ? `/places/${city.slug}` : "/places";
}

export default function YourAdsSection({
  ads,
  onEdit,
  onDelete,
}: {
  ads: Ad[];
  onEdit: (ad: Ad) => void;
  onDelete: (ad: Ad) => void;
}) {
  return (
    <section className="rounded-[1.75rem] bg-white p-6 sm:p-8">
      <h2 className="text-2xl font-black text-red-950">Your Ads</h2>
      <p className="mt-3 text-base leading-7 text-red-900">
        Track the ads you have posted or saved as drafts.
      </p>

      {ads.length === 0 ? (
        <p className="mt-6 rounded-[1.5rem] bg-pink-50 p-5 text-red-900">
          You have not posted any ads yet.
        </p>
      ) : (
        <div className="mt-6 grid gap-4">
          {ads.map((ad) => (
            <article
              key={ad._id}
              className="flex flex-col justify-between gap-4 rounded-[1.5rem] bg-pink-50 p-5 sm:flex-row sm:items-center"
            >
              <div>
                <h3 className="text-lg font-black text-red-950">{ad.name}</h3>
                <p className="mt-1 text-sm text-red-900">
                  {ad.city} · {ad.category}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  href={getCityUrl(ad.city)}
                  variant="solid"
                  size="sm"
                  className="!text-black"
                >
                  View
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(ad)}
                  className="!text-black"
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(ad)}
                  className="!text-black"
                >
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
