import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdGallery from "@/components/ads/AdGallery";
import ContactActions from "@/components/ads/ContactActions";
import { Card, SectionPanel } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
  getPublicAdById,
  listAdsByLocalArea,
  listRelatedCityAds,
  isAdVisiblePublicly,
  type Ad,
} from "@/lib/models/ad";
import { getCityBySlug } from "@/lib/models/city";
import { getLocalAreaBySlug, listLocalAreas } from "@/lib/models/localArea";
import { DEFAULT_SERVICE_RATES } from "@/components/post-ad/types";
import { AdDetailSkeleton } from "@/components/skeletons/places-skeletons";
import { siteConfig } from "@/lib/config/site";
import { JsonLd } from "@/components/seo/json-ld";
import { isAdActiveInCurrentShift, getTierRankInfo } from "@/lib/promo-shifts";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ location: string; id: string }>;
}): Promise<Metadata> {
  const { location, id } = await params;
  const ad = await getPublicAdById(id);
  if (!ad) {
    const [city, area] = await Promise.all([
      getCityBySlug(location),
      getLocalAreaBySlug(location, id),
    ]);

    if (city && area) {
      const title = `Services in ${area.name}, ${city.name} | Rojlo`;
      const description = `Explore local services and places in ${area.name}, ${city.name} on Rojlo.`;
      const canonical = `${siteConfig.url}/places/${city.slug}/${area.slug}`;
      return {
        title,
        description,
        alternates: { canonical },
        openGraph: {
          title,
          description,
          url: canonical,
          type: "website",
          siteName: siteConfig.name,
        },
        twitter: {
          card: "summary",
          title,
          description,
        },
      };
    }

    return {
      title: "Page not found | Rojlo",
      robots: { index: false, follow: false },
    };
  }

  const isDeleted = (ad.status ?? "active") === "deleted";
  const isVisible = await isAdVisiblePublicly(ad as unknown as Ad);
  if (isDeleted || !isVisible) {
    return {
      title: "Listing Unavailable | Rojlo",
      robots: { index: false, follow: false },
    };
  }

  const title = `${ad.name} in ${ad.city} | Rojlo`;
  const description =
    ad.about?.trim()?.slice(0, 160) || `View ${ad.name} in ${ad.city} on Rojlo.`;
  const canonical = `${siteConfig.url}/places/${location}/${id}`;
  const images =
    ad.images && ad.images.length > 0
      ? [{ url: ad.images[0], alt: `${ad.name} in ${ad.city}` }]
      : [{ url: `${siteConfig.url}/rojlo.png`, alt: "Rojlo" }];

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      siteName: siteConfig.name,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((img) => img.url),
    },
  };
}

export default async function AdPage({
  params,
}: {
  params: Promise<{ location: string; id: string }>;
}) {
  const { location, id } = await params;
  const ad = await getPublicAdById(id);

  if (!ad) {
    return (
      <Suspense fallback={<AdDetailSkeleton />}>
        <LocalAreaContent citySlug={location} areaSlug={id} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<AdDetailSkeleton />}>
      <AdContent location={location} id={id} />
    </Suspense>
  );
}

async function LocalAreaContent({
  citySlug,
  areaSlug,
}: {
  citySlug: string;
  areaSlug: string;
}) {
  const [city, area] = await Promise.all([
    getCityBySlug(citySlug),
    getLocalAreaBySlug(citySlug, areaSlug),
  ]);

  if (!city || !area) notFound();

  const [ads, localAreas] = await Promise.all([
    listAdsByLocalArea(city.name, area.slug),
    listLocalAreas({ citySlug: city.slug }),
  ]);
  const canonical = `${siteConfig.url}/places/${city.slug}/${area.slug}`;
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Places", item: `${siteConfig.url}/places` },
      { "@type": "ListItem", position: 3, name: city.name, item: `${siteConfig.url}/places/${city.slug}` },
      { "@type": "ListItem", position: 4, name: area.name, item: canonical },
    ],
  };
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Services in ${area.name}, ${city.name}`,
    description: `Explore local services and places in ${area.name}, ${city.name} on Rojlo.`,
    url: canonical,
    about: { "@type": "Place", name: area.name, containedInPlace: { "@type": "City", name: city.name } },
  };

  return (
    <main>
      <JsonLd data={[breadcrumbSchema, collectionSchema]} />
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <SectionPanel>
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Places", href: "/places" },
              { label: city.name, href: `/places/${city.slug}` },
              { label: area.name },
            ]}
          />
          <h1 className="mt-3 text-2xl font-black text-gray-950 sm:text-3xl">
            Services posted in {area.name}, {city.name}
          </h1>

          {localAreas.length > 1 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-gray-950">Popular Areas:</span>
              {localAreas.map((local) => (
                <Link
                  key={local._id ?? local.slug}
                  href={`/places/${city.slug}/${local.slug}`}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    local.slug === area.slug
                      ? "border-gray-900 bg-gray-900 !text-white"
                      : "border-gray-200 bg-gray-50 text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {local.name}
                </Link>
              ))}
            </div>
          )}

          {ads.length === 0 ? (
            <p className="mt-4 text-gray-900">
              No services posted in {area.name} yet. Be the first to post an ad!
            </p>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {ads.map((ad, index) => (
                <Card key={ad._id} className="group relative min-h-[28rem] p-5 sm:p-7 transition-shadow hover:shadow-lg">
                  {ad._id && (
                    <Link
                      href={`/places/${city.slug}/${ad._id}`}
                      aria-label={`View details for ${ad.name}`}
                      className="absolute inset-0 z-0 rounded-[1.5rem] focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2"
                    />
                  )}
                  {isAdActiveInCurrentShift(ad) && (
                    <span className={`pointer-events-none absolute left-3.5 top-3.5 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black shadow-xs ${getTierRankInfo(ad.promoTier, ad.promoPackage).badgeClass}`}>
                      {getTierRankInfo(ad.promoTier, ad.promoPackage).badge}
                    </span>
                  )}
                  <div className="pointer-events-none relative z-10">
                    <h2 className="pr-4 text-lg font-black text-gray-950 sm:text-xl">{ad.name}</h2>
                    {ad.about && <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-900">{ad.about}</p>}
                    {ad.images?.[0] && (
                      <div className="relative mt-4 h-56 overflow-hidden rounded-[1rem] bg-gray-50 sm:h-64">
                        <Image
                          src={ad.images[0]}
                          alt={`${ad.name} - Services in ${area.name}`}
                          fill
                          className="object-contain transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, 360px"
                          priority={index === 0}
                        />
                      </div>
                    )}
                  </div>
                  <div className="relative z-10 mt-4 flex flex-wrap gap-2">
                    <ContactActions phone={ad.phone} whatsapp={ad.whatsapp} telegram={ad.telegram} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </SectionPanel>
      </section>
    </main>
  );
}

async function AdContent({ location, id }: { location: string; id: string }) {
  const [ad, cityInfo] = await Promise.all([
    getPublicAdById(id),
    getCityBySlug(location),
  ]);
  if (!ad) notFound();

  const cityName = cityInfo?.name ?? location;
  const isDeleted = (ad.status ?? "active") === "deleted";
  const isPubliclyVisible = await isAdVisiblePublicly(ad as unknown as Ad);
  const serviceRates =
    ad.serviceRates && ad.serviceRates.length > 0
      ? ad.serviceRates
      : DEFAULT_SERVICE_RATES;
  const relatedProfiles = await listRelatedCityAds(cityName, ad._id ?? id, 6);

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
        name: cityName,
        item: `${siteConfig.url}/places/${location}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: ad.name,
        item: `${siteConfig.url}/places/${location}/${id}`,
      },
    ],
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "ItemPage",
    name: ad.name,
    description: ad.about,
    url: `${siteConfig.url}/places/${location}/${id}`,
    image: ad.images?.[0] || undefined,
    mainEntity: {
      "@type": "Service",
      name: ad.name,
      description: ad.about,
      areaServed: {
        "@type": "City",
        name: cityName,
      },
      provider: {
        "@type": "Person",
        name: ad.name,
      },
    },
  };

  return (
    <main>
      <JsonLd data={[breadcrumbSchema, serviceSchema]} />
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <SectionPanel>
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Places", href: "/places" },
              { label: cityName, href: `/places/${location}` },
              { label: ad.name },
            ]}
          />

          {isDeleted && (
            <p className="mt-4 rounded-[1rem] bg-gray-100 p-4 text-gray-900">
              This ad has been deleted. The information below is archived.
            </p>
          )}

          {!isPubliclyVisible && !isDeleted && (
            <div className="mt-4 rounded-2xl border border-gray-300 bg-gray-50 p-4 text-xs sm:text-sm text-gray-950 font-medium flex items-start gap-2.5">
              <span className="text-base shrink-0">⚠️</span>
              <div>
                <p className="font-bold">Listing Hidden from City Search Results</p>
                <p className="text-gray-900 text-xs mt-0.5">
                  This ad is currently not visible on the {cityName} city page because only 1 free ad is active per account. The owner must promote this ad to display it publicly.
                </p>
              </div>
            </div>
          )}

          <div className="mt-4">
            <Eyebrow>{ad.category}</Eyebrow>
          </div>
          <h1 className="mt-3 flex flex-wrap items-baseline gap-2 sm:gap-3 text-2xl sm:text-3xl md:text-4xl font-black text-gray-950 break-words">
            <span>{ad.name}</span>
            {ad.age && (
              <span className="text-xl sm:text-2xl font-semibold text-gray-500">
                Age: {ad.age}
              </span>
            )}
          </h1>

          {ad.about && (
            <p className="mt-4 whitespace-pre-line leading-7 text-gray-900">
              {ad.about}
            </p>
          )}

          <div className="mt-6 grid gap-8 md:grid-cols-2">
            <div className="order-1 relative">
              <span className="absolute right-3 top-3 z-10 rounded-full bg-gray-950/80 px-3 py-1 text-xs font-semibold text-white">
                {cityName}
              </span>
              <AdGallery images={ad.images ?? []} name={ad.name} />
            </div>

            <div className="order-2">
              <h2 className="text-xl font-bold text-gray-950">Contact me</h2>

              <div className="mt-3 flex flex-wrap gap-2">
                <ContactActions
                  phone={ad.phone}
                  whatsapp={ad.whatsapp}
                  telegram={ad.telegram}
                />
              </div>

              {ad.toServe && ad.toServe.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-bold text-gray-950">
                    To Serve
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {ad.toServe.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-gray-100 px-2.5 py-1 text-sm font-semibold text-gray-700"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {ad.placeOfService && ad.placeOfService.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-bold text-gray-950">
                    Place Of Service
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {ad.placeOfService.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-gray-100 px-2.5 py-1 text-sm font-semibold text-gray-700"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-bold text-gray-950">Service Rates</h3>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-gray-100">
              <table className="w-full min-w-[340px] text-left text-sm">
                <thead className="bg-gray-50 text-gray-950">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Duration</th>
                    <th className="px-4 py-3 font-semibold">Incall Rate</th>
                    <th className="px-4 py-3 font-semibold">Outcall Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceRates.map((rate) => (
                    <tr key={rate.duration} className="border-t border-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-950">
                        {rate.duration}
                      </td>
                      <td className="px-4 py-3 text-gray-900">₹{rate.incall}</td>
                      <td className="px-4 py-3 text-gray-900">₹{rate.outcall}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-bold text-gray-950">
              Related Profiles in {cityName}
            </h3>

            {relatedProfiles.length === 0 ? (
              <p className="mt-3 text-sm leading-7 text-gray-900">
                No other profiles are available in {cityName} right now.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {relatedProfiles.slice(0, 6).map((profile) => (
                  <Card
                    key={profile._id}
                    className="group relative overflow-hidden p-0 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <Link
                      href={`/places/${location}/${profile._id}`}
                      aria-label={`View details for ${profile.name}`}
                      className="absolute inset-0 z-10 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2"
                    />

                    <div className="relative h-56 bg-gray-50">
                      {profile.images?.[0] ? (
                        <Image
                          src={profile.images[0]}
                          alt={`${profile.name} profile image`}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 360px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm font-medium text-gray-300">
                          No image available
                        </div>
                      )}
                      <span className="absolute left-3 top-3 rounded-full bg-gray-950/80 px-3 py-1 text-xs font-semibold text-white">
                        {cityName}
                      </span>
                    </div>

                    <div className="relative z-0 p-5">
                      <h4 className="text-lg font-black text-gray-950">
                        {profile.name}
                      </h4>
                      {profile.age && (
                        <p className="mt-1 text-sm font-semibold text-gray-500">
                          Age: {profile.age}
                        </p>
                      )}
                      {profile.about && (
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-900">
                          {profile.about}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </SectionPanel>
      </section>
    </main>
  );
}
