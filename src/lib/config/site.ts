const rawUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://rojlo.in");

const siteUrl = rawUrl.trim().replace(/\/+$/, "");

export const siteConfig = {
  name: "Rojlo",
  description: "Rojlo – Find services, places and post ads in your city.",
  url: siteUrl,
  locale: "en_US",
} as const;
