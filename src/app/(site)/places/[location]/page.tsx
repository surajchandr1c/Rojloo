import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import ContactActions from "@/components/ads/ContactActions";
import { Card, SectionPanel } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { listAdsByCity } from "@/lib/models/ad";
import { getCitySeo } from "@/lib/models/city-seo";
import { getCityBySlug, listAllCities } from "@/lib/models/city";
import { listLocalAreas } from "@/lib/models/localArea";
import { CityPageSkeleton } from "@/components/skeletons/places-skeletons";
import { isAdActiveInCurrentShift, getTierRankInfo } from "@/lib/promo-shifts";
import { siteConfig } from "@/lib/config/site";
import { JsonLd } from "@/components/seo/json-ld";
import CityFaqSection from "@/components/places/city-faq-section";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ location: string }>;
}): Promise<Metadata> {
  const { location: slug } = await params;
  let city = await getCityBySlug(slug);
  const seo =
    (await getCitySeo(slug)) ||
    (city ? await getCitySeo(city.slug) : null);

  if (!city && seo) {
    city = {
      _id: seo.slug,
      name: seo.name || seo.slug,
      slug: seo.slug,
      state: "",
      region: "",
      famousFood: "",
      seoDescription: seo.description,
      createdAt: new Date(),
    };
  }

  if (!city) {
    return {
      title: "City not found | Rojlo",
      robots: { index: false, follow: false },
    };
  }
  const title =
    seo?.title?.trim() ||
    `Best Places & Services in ${city.name} | Rojlo`;
  const description =
    seo?.description?.trim() ||
    `Explore the best places and local services in ${city.name}. Discover attractions and trusted service providers on Rojlo.`;
  const keywords =
    [
      seo?.primaryKeyword?.trim(),
      ...(seo?.popularSearches ?? []).map((k) => k.trim()),
      ...(seo?.secondaryKeywords ?? []).map((k) => k.trim()),
      ...(seo?.longTailKeywords ?? []).map((k) => k.trim()),
    ]
      .filter(Boolean)
      .join(", ") || undefined;

  let canonical = `${siteConfig.url}/places/${slug}`;
  if (seo?.canonicalUrl?.trim()) {
    try {
      const parsed = new URL(seo.canonicalUrl.trim(), siteConfig.url);
      canonical = `${siteConfig.url}${parsed.pathname}`;
    } catch {
      canonical = `${siteConfig.url}/places/${slug}`;
    }
  }
  const ogImage = seo?.featuredImage?.trim() || `${siteConfig.url}/rojlo.png`;

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: siteConfig.name,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${city.name} - Services & Places on Rojlo`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function CityPage({
  params,
  searchParams,
}: {
  params: Promise<{ location: string }>;
  searchParams?: Promise<{ preview?: string }>;
}) {
  const { location: slug } = await params;
  const sParams = searchParams ? await searchParams : {};
  const isPreview = sParams.preview === "true" || sParams.preview === "1";
  return (
    <Suspense fallback={<CityPageSkeleton />}>
      <CityContent slug={slug} isPreview={isPreview} />
    </Suspense>
  );
}

async function CityContent({
  slug,
  isPreview = false,
}: {
  slug: string;
  isPreview?: boolean;
}) {
  let city = await getCityBySlug(slug);
  const seo =
    (await getCitySeo(slug)) ||
    (city ? await getCitySeo(city.slug) : null);

  // Fallback: If city not yet indexed in static/custom list but SEO exists, synthesize city record
  if (!city && seo) {
    city = {
      _id: seo.slug,
      name: seo.name || seo.slug,
      slug: seo.slug,
      state: "",
      region: "",
      famousFood: "",
      seoDescription: seo.description,
      createdAt: new Date(),
    };
  }

  if (!city) notFound();

  const [ads, localAreas, allCities] = await Promise.all([
    listAdsByCity(city.name),
    listLocalAreas({ cityName: city.name, citySlug: city.slug }),
    city.state ? listAllCities() : Promise.resolve([]),
  ]);

  const siblingCities = city.state
    ? allCities
        .filter(
          (c) =>
            c.state &&
            c.state.trim().toLowerCase() === city.state?.trim().toLowerCase() &&
            c.slug.toLowerCase() !== city.slug.toLowerCase()
        )
        .slice(0, 12)
    : [];

  const breadcrumbSchema = {
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
      {
        "@type": "ListItem",
        position: 3,
        name: city.name,
        item: `${siteConfig.url}/places/${city.slug}`,
      },
    ],
  };

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Services in ${city.name}`,
    description: `Explore verified services and places in ${city.name} on Rojlo.`,
    url: `${siteConfig.url}/places/${city.slug}`,
    about: {
      "@type": "City",
      name: city.name,
      containedInPlace: city.state ? { "@type": "AdministrativeArea", name: city.state } : undefined,
    },
  };

  const faqSchema =
    seo?.faqs && seo.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: seo.faqs
            .filter((f) => f.question && f.answer)
            .map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: f.answer,
              },
            })),
        }
      : null;

  const isPublished = seo?.status === "published";
  const shouldShowSeo = Boolean(seo && (isPublished || isPreview));

  const popularKeywords = Array.from(
    new Set([
      ...(seo?.popularSearches ?? []),
      ...(seo?.secondaryKeywords ?? []),
      ...(seo?.longTailKeywords ?? []),
    ])
  )
    .map((k) => (typeof k === "string" ? k.trim() : ""))
    .filter(Boolean);

  return (
    <main>
      {isPreview && (
        <div className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-300 bg-gray-500 px-4 py-2.5 text-white shadow-md">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
            <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-[11px] uppercase tracking-wider text-gray-100">
              {seo?.status === "draft" ? "Draft Preview" : "Live Preview"}
            </span>
            <span>
              Preview Mode — Viewing {seo?.status === "draft" ? "Draft" : "Published"} SEO Content for {city.name}
            </span>
          </div>
          <span className="hidden sm:inline-block text-xs font-medium text-gray-100">
            Draft content is visible only with preview link
          </span>
        </div>
      )}

      <JsonLd data={[breadcrumbSchema, collectionSchema, ...(faqSchema ? [faqSchema] : [])]} />
      <section className="px-4 py-10 sm:px-6">
        <SectionPanel>
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Places", href: "/places" },
              { label: city.name },
            ]}
          />
          <div className="mt-4">
            <Eyebrow>Services in {city.name}</Eyebrow>
          </div>
          <h1 className="mt-3 text-2xl font-black text-gray-950 sm:text-3xl">
            Services posted in {city.name}
          </h1>

          {localAreas.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-gray-950">
                Popular Areas:
              </span>
              {localAreas.map((area) => (
                <Link
                  key={area._id ?? area.slug}
                  href={`/places/${city.slug}/${area.slug}`}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-900"
                >
                  {area.name}
                </Link>
              ))}
            </div>
          )}

          {ads.length === 0 ? (
            <p className="mt-4 text-gray-900">
              No services posted in {city.name} yet. Be the first to post an ad!
            </p>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {ads.map((ad, idx) => (
                <Card
                  key={ad._id}
                  className="group relative min-h-[28rem] sm:min-h-[30rem] p-5 sm:p-7 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl"
                >
                  {ad._id && (
                    <Link
                      href={`/places/${city.slug}/${ad._id}`}
                      aria-label={`View details for ${ad.name}`}
                      className="absolute inset-0 z-0 rounded-[1.5rem] focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2"
                    />
                  )}

                  {isAdActiveInCurrentShift(ad) && (
                    <span className={`pointer-events-none absolute left-3.5 top-3.5 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black sm:left-6 sm:top-6 shadow-xs ${getTierRankInfo(ad.promoTier, ad.promoPackage).badgeClass}`}>
                      {getTierRankInfo(ad.promoTier, ad.promoPackage).badge}
                    </span>
                  )}

                  {ad.city && (
                    <span className="pointer-events-none absolute right-3.5 top-3.5 z-10 inline-flex max-w-[12rem] sm:max-w-xs items-center truncate rounded-full bg-gray-100 px-2.5 sm:px-3 py-1 text-xs font-semibold text-gray-800 sm:right-6 sm:top-6">
                      {ad.city}
                    </span>
                  )}

                  <div className="pointer-events-none relative z-10">
                    <h2 className="pr-20 sm:pr-24 text-lg sm:text-xl font-black text-gray-950 break-words">
                      {ad.name}
                    </h2>

                    {ad.about && (
                      <p className="mt-2 text-sm leading-6 sm:leading-7 text-gray-900 line-clamp-3">
                        {ad.about}
                      </p>
                    )}

                    {ad.images[0] && (
                      <div className="relative mt-4 h-56 overflow-hidden rounded-[1rem] bg-gray-50 sm:h-64">
                        <Image
                          src={ad.images[0]}
                          alt={`${ad.name} - Services in ${city.name}`}
                          fill
                          className="object-contain transition-transform duration-500 ease-out group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, 360px"
                          priority={idx === 0}
                        />
                      </div>
                    )}
                  </div>

                  <div className="relative z-10 mt-4 flex flex-wrap gap-2">
                    <ContactActions
                      phone={ad.phone}
                      whatsapp={ad.whatsapp}
                      telegram={ad.telegram}
                      cityName={ad.city || city.name}
                    />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </SectionPanel>
      </section>

      {shouldShowSeo && seo?.content && seo.content.length > 0 && (
        <section className="px-4 py-10 sm:px-6">
          <SectionPanel>
            <Eyebrow>City Guide</Eyebrow>
            {seo.featuredImage && (
              <div className="relative mt-4 h-64 sm:h-80 w-full overflow-hidden rounded-2xl bg-gray-50 border border-gray-100">
                <Image
                  src={seo.featuredImage}
                  alt={seo.imageAlt || `${city.name} guide`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 900px"
                />
              </div>
            )}
            {seo.content.map((block) => {
              if (block.type === "h1" || block.type === "h2") {
                return (
                  <h2
                    key={block.id}
                    className="mt-6 text-2xl font-bold text-gray-950 sm:text-3xl"
                  >
                    {block.text}
                  </h2>
                );
              }
              if (block.type === "h3") {
                return (
                  <h3
                    key={block.id}
                    className="mt-4 text-xl font-bold text-gray-950 sm:text-2xl"
                  >
                    {block.text}
                  </h3>
                );
              }
              return (
                <p
                  key={block.id}
                  className="mt-3 leading-7 text-gray-900"
                >
                  {block.text}
                </p>
              );
            })}
          </SectionPanel>
        </section>
      )}

      {shouldShowSeo && seo?.faqs && seo.faqs.length > 0 && (
        <CityFaqSection faqs={seo.faqs} cityName={city.name} />
      )}

      {shouldShowSeo && popularKeywords.length > 0 && (
        <section className="px-4 py-8 sm:px-6">
          <SectionPanel>
            <Eyebrow className="text-center">Popular Searches</Eyebrow>
            <h2 className="mt-3 text-center text-2xl font-black text-gray-950 sm:text-3xl">
              Most Search in {city.name}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {popularKeywords.map((keyword, index) => (
                <span
                  key={`${keyword}-${index}`}
                  className="cursor-pointer select-none rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-gray-950 transition hover:bg-gray-100 hover:border-gray-300 shadow-2xs"
                  style={{ cursor: "pointer" }}
                >
                  {keyword}
                </span>
              ))}
            </div>
          </SectionPanel>
        </section>
      )}

      {siblingCities.length > 0 && (
        <section className="px-4 py-8 sm:px-6">
          <SectionPanel>
            <Eyebrow>Regional Directory</Eyebrow>
            <h2 className="mt-3 text-xl font-bold text-gray-950 sm:text-2xl">
              More Cities in {city.state}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {siblingCities.map((sibling) => (
                <Link
                  key={sibling.slug}
                  href={`/places/${sibling.slug}`}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-xs font-semibold text-gray-950 transition hover:bg-gray-100 hover:border-gray-300"
                >
                  {sibling.name}
                </Link>
              ))}
            </div>
          </SectionPanel>
        </section>
      )}
    </main>
  );
}
