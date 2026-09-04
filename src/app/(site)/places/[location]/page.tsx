import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import ContactActions from "@/components/ads/ContactActions";
import { Card, SectionPanel } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { listAdsByCity } from "@/lib/models/ad";
import { getCitySeo } from "@/lib/models/city-seo";
import { getCityBySlug } from "@/lib/models/city";
import { listLocalAreas } from "@/lib/models/localArea";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ location: string }>;
}): Promise<Metadata> {
  const { location: slug } = await params;
  const city = await getCityBySlug(slug);
  if (!city) return { title: "City not found | Rojlo" };

  const seo = await getCitySeo(slug);
  const title =
    seo?.title?.trim() ||
    `Best Places & Services in ${city.name} | Rojlo`;
  const description =
    seo?.description?.trim() ||
    `Explore the best places and local services in ${city.name}. Discover attractions and trusted service providers on Rojlo.`;
  const keywords =
    [
      seo?.primaryKeyword?.trim(),
      ...(seo?.secondaryKeywords ?? []).map((k) => k.trim()),
    ]
      .filter(Boolean)
      .join(", ") || undefined;

  return {
    title,
    description,
    keywords,
    openGraph: { title, description, type: "website" },
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ location: string }>;
}) {
  const { location: slug } = await params;
  return (
    <Suspense fallback={<main className="p-10 text-red-900">Loading…</main>}>
      <CityContent slug={slug} />
    </Suspense>
  );
}

async function CityContent({ slug }: { slug: string }) {
  const city = await getCityBySlug(slug);
  if (!city) notFound();

  const [ads, seo, localAreas] = await Promise.all([
    listAdsByCity(city.name),
    getCitySeo(slug),
    listLocalAreas({ cityName: city.name, citySlug: city.slug }),
  ]);

  return (
    <main>
      <section className="px-4 py-10 sm:px-6">
        <SectionPanel>
          <Eyebrow>Services in {city.name}</Eyebrow>
          <h2 className="mt-3 text-2xl font-black text-red-950 sm:text-3xl">
            Services posted in {city.name}
          </h2>

          {localAreas.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-red-950">
                Popular Areas:
              </span>
              {localAreas.map((area) => (
                <span
                  key={area._id ?? area.slug}
                  className="rounded-full border border-red-200 bg-pink-50 px-3 py-1 text-xs font-medium text-red-900"
                >
                  {area.name}
                </span>
              ))}
            </div>
          )}

          {ads.length === 0 ? (
            <p className="mt-4 text-red-900">
              No services posted in {city.name} yet. Be the first to post an ad!
            </p>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {ads.map((ad) => (
                <Card
                  key={ad._id}
                  className="group relative min-h-[30rem] p-6 transition-shadow hover:shadow-lg sm:p-8"
                >
                  {ad._id && (
                    <Link
                      href={`/places/${city.slug}/${ad._id}`}
                      aria-label={`View details for ${ad.name}`}
                      className="absolute inset-0 z-0 rounded-[1.5rem] focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
                    />
                  )}

                  {ad.city && (
                    <span className="pointer-events-none absolute right-6 top-6 z-10 inline-flex max-w-28 items-center truncate rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-red-800 sm:right-8 sm:top-8">
                      {ad.city}
                    </span>
                  )}

                  <div className="pointer-events-none relative z-10">
                    <h3 className="pr-24 text-xl font-black text-red-950">
                      {ad.name}
                    </h3>

                    {ad.about && (
                      <p className="mt-2 text-sm leading-7 text-red-900">
                        {ad.about}
                      </p>
                    )}

                    {ad.images[0] && (
                      <div className="relative mt-4 h-56 overflow-hidden rounded-[1rem] bg-pink-50 sm:h-64">
                        <Image
                          src={ad.images[0]}
                          alt={`${ad.name} image`}
                          fill
                          className="object-contain transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, 360px"
                        />
                      </div>
                    )}
                  </div>

                  <div className="relative z-10 mt-4 flex flex-wrap gap-2">
                    <ContactActions
                      phone={ad.phone}
                      whatsapp={ad.whatsapp}
                      telegram={ad.telegram}
                    />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </SectionPanel>
      </section>

      {seo?.status === "published" && seo.content && seo.content.length > 0 && (
        <section className="px-4 py-10 sm:px-6">
          <SectionPanel>
            <Eyebrow>City Guide</Eyebrow>
            {seo.content.map((block) => {
              if (block.type === "h1")
                return (
                  <h1
                    key={block.id}
                    className="mt-6 text-3xl font-black text-red-950"
                  >
                    {block.text}
                  </h1>
                );
              if (block.type === "h2")
                return (
                  <h2
                    key={block.id}
                    className="mt-5 text-2xl font-bold text-red-950"
                  >
                    {block.text}
                  </h2>
                );
              if (block.type === "h3")
                return (
                  <h3
                    key={block.id}
                    className="mt-4 text-xl font-semibold text-red-950"
                  >
                    {block.text}
                  </h3>
                );
              return (
                <p
                  key={block.id}
                  className="mt-3 leading-7 text-red-900"
                >
                  {block.text}
                </p>
              );
            })}
          </SectionPanel>
        </section>
      )}
    </main>
  );
}
