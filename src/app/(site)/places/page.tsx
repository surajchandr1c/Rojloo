import type { Metadata } from "next";
import { SectionPanel } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { listAllCities } from "@/lib/models/city";
import { getAdCountsByCity } from "@/lib/models/ad";
import PlacesExplorer from "@/components/places/places-explorer";
import { siteConfig } from "@/lib/config/site";
import { JsonLd } from "@/components/seo/json-ld";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Explore Places & Local Cities | Rojlo",
  description:
    "Explore places and find trusted local services, classifieds, and verified ads across cities and states in India.",
  alternates: {
    canonical: `${siteConfig.url}/places`,
  },
  openGraph: {
    title: "Explore Places & Local Cities | Rojlo",
    description:
      "Explore places and find trusted local services, classifieds, and verified ads across cities and states in India.",
    url: `${siteConfig.url}/places`,
    type: "website",
    images: [
      {
        url: `${siteConfig.url}/rojlo.png`,
        width: 1200,
        height: 630,
        alt: "Explore Places on Rojlo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Explore Places & Local Cities | Rojlo",
    description:
      "Explore places and find trusted local services, classifieds, and verified ads across cities and states in India.",
    images: [`${siteConfig.url}/rojlo.png`],
  },
};

export default async function Places({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const sp = (await searchParams) ?? {};
  const q = sp.q;
  const query = Array.isArray(q) ? q[0] : q;
  const initialQuery = query?.trim() ?? "";

  const [allCities, adCounts] = await Promise.all([
    listAllCities(),
    getAdCountsByCity(),
  ]);

  const citiesWithAds = allCities.map((city) => ({
    name: city.name,
    slug: city.slug,
    state: city.state ?? "",
    adCount:
      adCounts[city.name.toLowerCase()] ??
      adCounts[city.slug.toLowerCase()] ??
      0,
  }));

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: siteConfig.url,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Places",
          item: `${siteConfig.url}/places`,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Explore Places & Local Cities",
      description:
        "Explore places and find trusted local services, classifieds, and verified ads across cities and states in India.",
      url: `${siteConfig.url}/places`,
    },
  ];

  return (
    <div className="w-full min-w-0 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <JsonLd data={schema} />
      <SectionPanel>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Places" },
          ]}
        />
        <div className="mt-4">
          <Eyebrow>Places</Eyebrow>
        </div>
        <h1 className="mt-2 text-3xl font-black text-red-950 sm:text-4xl">
          Places
        </h1>

        <PlacesExplorer
          initialCities={citiesWithAds}
          initialQuery={initialQuery}
        />
      </SectionPanel>
    </div>
  );
}
