import type { Metadata } from "next";
import { SectionPanel } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { listAllCities } from "@/lib/models/city";
import { listAdsByCity } from "@/lib/models/ad";
import PlacesExplorer from "@/components/places/places-explorer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Places | Rojlo",
  description:
    "Explore places and local services across Indian cities and states.",
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

  const allCities = await listAllCities();

  const citiesWithAds = await Promise.all(
    allCities.map(async (city) => {
      const ads = await listAdsByCity(city.name);
      return {
        name: city.name,
        slug: city.slug,
        state: city.state ?? "",
        adCount: ads.length,
      };
    })
  );

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <SectionPanel>
        <Eyebrow>Places</Eyebrow>
        <h1 className="mt-2 text-3xl font-black text-red-950 sm:text-4xl">
          Places
        </h1>

        <PlacesExplorer
          initialCities={citiesWithAds}
          initialQuery={initialQuery}
        />
      </SectionPanel>
    </main>
  );
}
