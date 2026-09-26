import type { Metadata } from "next";
import Image from "next/image";
import Button from "@/components/ui/button";
import SearchBar from "@/components/search-bar";
import HomeFaq from "@/components/home-faq";
import { StaticSeoSection } from "@/components/seo/static-seo-section";
import { getStaticSeo } from "@/lib/models/static-seo";
import { serviceCards } from "@/lib/services";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Escort Call Girl in Rojloo, Companion, Thai Massage & Nightlife Listings | Rojlo",
  description:
    "Find local listings for escort call girl in rojloo, call girls in rojloo, massage in rojloo, body massage, male escort, male escort service, escort service rojloo, night outings, hotel parties, Thai massage, and other social experiences.",
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    title: "Escort Call Girl in Rojloo, Companion, Thai Massage & Nightlife Listings | Rojlo",
    description:
      "Find local listings for escort call girl in rojloo, call girls in rojloo, massage in rojloo, body massage, male escort, male escort service, escort service rojloo, night outings, hotel parties, Thai massage, and other social experiences.",
    url: siteConfig.url,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Escort Call Girl in Rojloo, Companion, Thai Massage & Nightlife Listings | Rojlo",
    description:
      "Find local listings for escort call girl in rojloo, call girls in rojloo, massage in rojloo, body massage, male escort, male escort service, escort service rojloo, night outings, hotel parties, Thai massage, and other social experiences.",
  },
};

export default async function Home() {
  const homeSeo = await getStaticSeo("home");
  return (
    <main>
      {/* Part 1 — Homepage Hero */}
      <section className="bg-gray-200">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="mx-auto max-w-6xl text-center">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-gray-700">
              get you fun
            </p>
            <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black leading-tight text-gray-950 break-words">
              Rojlo Mojlo Na Mile To Khojlo
            </h1>
            <p className="mx-auto mt-4 max-w-none text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
              Find local listings for{" "}
              <strong>
                escort call girl in rojloo, call girls in rojloo, massage in rojloo, body massage, male escort, male escort service, escort service rojloo
              </strong>
              , night outings, hotel parties, Thai massage, and other social experiences. Browse listings by location, discover available services, and connect directly with advertisers.
            </p>
            <p className="mx-auto mt-3 max-w-none text-base sm:text-lg leading-7 sm:leading-8 text-gray-800">
              Explore listings based on your preferred location and experience. Each advertiser can provide their own information, availability, service details, and contact preferences.
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button href="/services" variant="solid" className="!text-white">
                Explore Services
              </Button>
              <Button href="/post-ad/new" variant="solid" className="!text-white px-6 py-3">
                Post an Ad
              </Button>
            </div>

            <SearchBar />
          </div>
        </div>
      </section>

      {/* Services Showcase */}
      <section className="px-4 py-8 sm:py-12 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-[2rem] bg-gray-100/85 p-5 sm:p-8 lg:p-10 shadow-lg shadow-gray-200/40">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-gray-700">
            Services
          </p>
          <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black text-gray-950">
            What you can find
          </h2>
          <p className="mt-3 sm:mt-4 max-w-2xl text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
            Rojlo brings together the everyday services people need, with a
            simple way to post your own ad.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {serviceCards.map((item) => (
              <article
                key={item.title}
                id={`${item.id}-section`}
                className="group overflow-hidden rounded-[1.75rem] bg-white/90 shadow-md shadow-gray-200/30 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-56 overflow-hidden rounded-[1.25rem]">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    sizes="(max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <h3 className="mt-4 px-6 text-xl font-black text-gray-950">
                  {item.title}
                </h3>
                <p className="mt-2 px-6 pb-6 text-sm leading-7 text-gray-900">
                  {item.description}
                </p>
                <div className="px-6 pb-6">
                  <Button href="/post-ad/new" variant="soft">
                    Post a Service
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="px-4 pb-12 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-[2rem] bg-gray-950 p-6 sm:p-8 lg:p-10 text-center text-white">
          <h2 className="text-2xl font-black !text-white sm:text-3xl">
            Ready to get started?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-7 !text-white">
            Post your ad in minutes and reach people looking for your service in
            your city.
          </p>
          <div className="mt-6 flex justify-center">
            <Button href="/post-ad/new" variant="solid">
              Post an Ad
            </Button>
          </div>
        </div>
      </section>

      {/* Content Section below Ready to get started */}
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-10 sm:space-y-12">
          <article>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-950">
              Call Girls in Rojloo, Escort Call Girl &amp; Companionship Services
            </h2>
            <div className="mt-4 space-y-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
              <p>
                Finding the right social experience can be easier when you have access to a platform where people can discover and post local listings. <strong>Rojloo</strong> brings together listings for <strong>call girls in Rojloo, escort call girl in Rojloo, escort service Rojloo, male escort, male escort service, night out plans, night meetings, hotel parties, Thai massage call girl, massage in Rojloo, and body massage</strong> in one convenient place.
              </p>
              <p>
                Whether you are looking for a <strong>call girl in Rojloo</strong>, planning a night out, exploring local massage and wellness options, or looking to connect with people offering social services, users can browse available ads and choose listings based on their preferences and location.
              </p>
            </div>
          </article>

          <article>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-950">
              Escort Call Girl in Rojloo &amp; Social Connection
            </h3>
            <p className="mt-3 text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
              Rojloo allows adults to discover listings related to social meetings and companionship. Users can explore available advertisements, review the information provided by advertisers, and contact them directly to discuss arrangements.
            </p>
          </article>

          <article>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-950">
              Escort Service Rojloo &amp; Male Escort Service
            </h3>
            <p className="mt-3 text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
              Looking for companionship for dinner, events, conversations, or an evening out? Browse <strong>escort service Rojloo</strong>, <strong>male escort</strong>, and <strong>male escort service</strong> listings to find options that match your interests and location.
            </p>
          </article>

          <article>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-950">
              Night Out &amp; Night Meeting
            </h3>
            <p className="mt-3 text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
              Make your evening plans easier by discovering local listings for <strong>night out</strong> and <strong>night meeting</strong> experiences. Users can browse advertisements and connect with people offering social companionship for evenings and events.
            </p>
          </article>

          <article>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-950">
              Hotel Party &amp; Social Events
            </h3>
            <p className="mt-3 text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
              Users can also discover listings related to hotel parties and private social gatherings. Always review the listing details and communicate directly with the advertiser before making arrangements.
            </p>
          </article>

          <article>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-950">
              Thai Massage Call Girl, Massage in Rojloo &amp; Body Massage
            </h3>
            <p className="mt-3 text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
              Explore listings for <strong>Thai massage call girl, massage in Rojloo, and body massage</strong>. Massage listings can provide information about available services, location, timings, and contact details so users can make informed choices.
            </p>
          </article>

          <article>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-950">
              Find Local Listings Easily
            </h3>
            <p className="mt-3 text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
              Rojloo makes it simple to search and discover relevant listings by location and category. Whether you are interested in <strong>call girls in Rojloo, escort call girl in Rojloo, escort service Rojloo, male escort, male escort service, Thai massage call girl, massage in Rojloo, or body massage</strong>, you can explore advertisements and connect with suitable providers.
            </p>
          </article>

          <HomeFaq items={homeSeo?.faqs} />
        </div>
      </section>

      <div className="px-4 sm:px-6 lg:px-8">
        <StaticSeoSection pageKey="home" />
      </div>
    </main>
  );
}
