import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdGallery from "@/components/ads/AdGallery";
import ContactActions from "@/components/ads/ContactActions";
import { Card, SectionPanel } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getPublicAdById, listAdsByCity } from "@/lib/models/ad";
import { getCityBySlug } from "@/lib/models/city";
import { DEFAULT_SERVICE_RATES } from "@/components/post-ad/types";
import { AdDetailSkeleton } from "@/components/skeletons/places-skeletons";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ location: string; id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ad = await getPublicAdById(id);
  if (!ad) return { title: "Ad not found | Rojlo" };

  const description = ad.about?.slice(0, 160) || `View ${ad.name} in ${ad.city} on Rojlo.`;
  return {
    title: `${ad.name} in ${ad.city} | Rojlo`,
    description,
    openGraph: { title: `${ad.name} in ${ad.city}`, description, type: "website" },
  };
}

export default async function AdPage({
  params,
}: {
  params: Promise<{ location: string; id: string }>;
}) {
  const { location, id } = await params;
  return (
    <Suspense fallback={<AdDetailSkeleton />}>
      <AdContent location={location} id={id} />
    </Suspense>
  );
}

async function AdContent({ location, id }: { location: string; id: string }) {
  const ad = await getPublicAdById(id);
  if (!ad) notFound();

  const cityInfo = await getCityBySlug(location);
  const cityName = cityInfo?.name ?? location;
  const isDeleted = (ad.status ?? "active") === "deleted";
  const serviceRates =
    ad.serviceRates && ad.serviceRates.length > 0
      ? ad.serviceRates
      : DEFAULT_SERVICE_RATES;
  const relatedProfiles = (await listAdsByCity(cityName)).filter(
    (profile) => profile._id && profile._id !== ad._id
  );

  return (
    <main>
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <SectionPanel>
          {isDeleted && (
            <p className="mt-4 rounded-[1rem] bg-pink-100 p-4 text-red-900">
              This ad has been deleted. The information below is archived.
            </p>
          )}

          <Eyebrow>{ad.category}</Eyebrow>
          <h1 className="mt-3 flex flex-wrap items-baseline gap-2 sm:gap-3 text-2xl sm:text-3xl md:text-4xl font-black text-red-950 break-words">
            <span>{ad.name}</span>
            {ad.age && (
              <span className="text-xl sm:text-2xl font-semibold text-red-500">
                Age: {ad.age}
              </span>
            )}
          </h1>

          {ad.about && (
            <p className="mt-4 whitespace-pre-line leading-7 text-red-900">
              {ad.about}
            </p>
          )}

          <div className="mt-6 grid gap-8 md:grid-cols-2">
            <div className="order-1 relative">
              <span className="absolute right-3 top-3 z-10 rounded-full bg-red-950/80 px-3 py-1 text-xs font-semibold text-white">
                {cityName}
              </span>
              <AdGallery images={ad.images ?? []} name={ad.name} />
            </div>

            <div className="order-2">
              <h2 className="text-xl font-bold text-red-950">Contact me</h2>

              <div className="mt-3 flex flex-wrap gap-2">
                <ContactActions
                  phone={ad.phone}
                  whatsapp={ad.whatsapp}
                  telegram={ad.telegram}
                />
              </div>

              {ad.toServe && ad.toServe.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-bold text-red-950">
                    To Serve
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {ad.toServe.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-pink-100 px-2.5 py-1 text-sm font-semibold text-red-700"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {ad.placeOfService && ad.placeOfService.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-bold text-red-950">
                    Place Of Service
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {ad.placeOfService.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-pink-100 px-2.5 py-1 text-sm font-semibold text-red-700"
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
            <h3 className="text-lg font-bold text-red-950">Service Rates</h3>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-red-100">
              <table className="w-full min-w-[340px] text-left text-sm">
                <thead className="bg-pink-50 text-red-950">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Duration</th>
                    <th className="px-4 py-3 font-semibold">Incall Rate</th>
                    <th className="px-4 py-3 font-semibold">Outcall Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceRates.map((rate) => (
                    <tr key={rate.duration} className="border-t border-red-50">
                      <td className="px-4 py-3 font-medium text-red-950">
                        {rate.duration}
                      </td>
                      <td className="px-4 py-3 text-red-900">₹{rate.incall}</td>
                      <td className="px-4 py-3 text-red-900">₹{rate.outcall}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-bold text-red-950">
              Related Profiles in {cityName}
            </h3>

            {relatedProfiles.length === 0 ? (
              <p className="mt-3 text-sm leading-7 text-red-900">
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
                      className="absolute inset-0 z-10 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
                    />

                    <div className="relative h-56 bg-pink-50">
                      {profile.images?.[0] ? (
                        <Image
                          src={profile.images[0]}
                          alt={`${profile.name} profile image`}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 360px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm font-medium text-red-300">
                          No image available
                        </div>
                      )}
                      <span className="absolute left-3 top-3 rounded-full bg-red-950/80 px-3 py-1 text-xs font-semibold text-white">
                        {cityName}
                      </span>
                    </div>

                    <div className="relative z-0 p-5">
                      <h4 className="text-lg font-black text-red-950">
                        {profile.name}
                      </h4>
                      {profile.age && (
                        <p className="mt-1 text-sm font-semibold text-red-500">
                          Age: {profile.age}
                        </p>
                      )}
                      {profile.about && (
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-red-900">
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
