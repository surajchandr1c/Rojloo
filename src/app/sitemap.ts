import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config/site";
import { listAllCities } from "@/lib/models/city";
import { listAllAds } from "@/lib/models/ad";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const now = new Date();

  // 1. All public static informational & policy pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${base}/places`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${base}/services`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/privacy-policy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/refund-policy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/return-policy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/disclaimer`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // 2. City Directory Routes
  let cityRoutes: MetadataRoute.Sitemap = [];
  const citySlugMap = new Map<string, string>();

  try {
    const cities = await listAllCities();
    for (const city of cities) {
      const slug = (city.slug ?? "").trim().toLowerCase();
      if (!slug) continue;

      if (city.name) {
        citySlugMap.set(city.name.trim().toLowerCase(), slug);
      }
      citySlugMap.set(slug, slug);

      cityRoutes.push({
        url: `${base}/places/${encodeURIComponent(slug)}`,
        lastModified: city.createdAt ? new Date(city.createdAt) : now,
        changeFrequency: "daily",
        priority: 0.8,
      });
    }
  } catch (err) {
    console.error("[sitemap] Failed to load cities:", err);
    cityRoutes = [];
  }

  // 3. Active Public Ad Routes
  let adRoutes: MetadataRoute.Sitemap = [];
  try {
    const ads = await listAllAds(1000);
    for (const ad of ads) {
      if (!ad._id || (ad.status ?? "active") === "deleted") continue;

      const rawCity = (ad.city ?? "").trim().toLowerCase();
      const citySlug =
        citySlugMap.get(rawCity) ||
        rawCity.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      if (!citySlug) continue;

      const lastMod = ad.updatedAt
        ? new Date(ad.updatedAt)
        : ad.createdAt
        ? new Date(ad.createdAt)
        : now;

      adRoutes.push({
        url: `${base}/places/${encodeURIComponent(citySlug)}/${encodeURIComponent(ad._id)}`,
        lastModified: lastMod,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch (err) {
    console.error("[sitemap] Failed to load ads:", err);
    adRoutes = [];
  }

  return [...staticRoutes, ...cityRoutes, ...adRoutes];
}
