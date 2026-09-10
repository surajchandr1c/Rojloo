import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/places",
        "/places/*",
        "/about",
        "/services",
        "/contact",
        "/terms",
        "/privacy-policy",
        "/refund-policy",
        "/return-policy",
        "/disclaimer",
      ],
      disallow: [
        "/admin",
        "/admin/*",
        "/vip",
        "/vip/*",
        "/api",
        "/api/*",
        "/login",
        "/post-ad",
        "/post-ad/*",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
