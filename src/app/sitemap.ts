import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config/site";
import { listAllCities } from "@/lib/models/city";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/places`, changeFrequency: "daily", priority: 0.9 },
  ];

  let cityRoutes: MetadataRoute.Sitemap = [];
  try {
    const cities = await listAllCities();
    cityRoutes = cities.map((city) => ({
      url: `${base}/places/${city.slug}`,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch {
    cityRoutes = [];
  }

  return [...staticRoutes, ...cityRoutes];
}
