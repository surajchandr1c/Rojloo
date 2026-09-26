import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Button from "@/components/ui/button";
import SearchBar from "@/components/search-bar";
import HomeFaq from "@/components/home-faq";
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

export default function Home() {
  return (
    <main>
      {/* Part 1 — Homepage Hero */}
      <section className="bg-gray-200">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-gray-700">
              get you fun
            </p>
            <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black leading-tight text-gray-950 break-words">
              Escort Call Girl in Rojloo, Companion, Thai Massage &amp; Nightlife Listings
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
              Find local listings for{" "}
              <strong>
                escort call girl in rojloo, call girls in rojloo, massage in rojloo, body massage, male escort, male escort service, escort service rojloo
              </strong>
              , night outings, hotel parties, Thai massage, and other social experiences. Browse listings by location, discover available services, and connect directly with advertisers.
            </p>
            <p className="mx-auto mt-3 max-w-3xl text-base sm:text-lg leading-7 sm:leading-8 text-gray-800">
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

      {/* SEO Content Sections (Parts 2 to 12) + FAQ (Parts 13 to 15) */}
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-12 sm:space-y-16">
          {/* Part 2 — Introduction */}
          <article>
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-gray-700">
              Overview
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-gray-950">
              Find Local Companionship and Lifestyle Services
            </h2>
            <div className="mt-4 space-y-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
              <p>
                Our platform makes it easier to discover local listings for{" "}
                <strong>
                  call girls in rojloo, escort call girl in rojloo, massage in rojloo, Thai massage call girl, body massage, male escort, male escort service, escort service rojloo, night outings, and hotel parties
                </strong>
                .
              </p>
              <p>
                Users can browse listings by location and category to find options that match their interests. Advertisers can create profiles, publish their services, add descriptions and images, and reach people searching for local experiences.
              </p>
              <p>
                Whether you are searching for <strong>call girls in rojloo</strong>, planning a <strong>night out</strong>, looking for a <strong>massage in rojloo</strong>, or exploring local lifestyle listings, our platform provides a convenient place to discover available advertisements.
              </p>
            </div>
          </article>

          {/* Part 3 — Escort Call Girl Listings */}
          <article>
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-gray-700">
              Companionship
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-gray-950">
              Escort Call Girl in Rojloo
            </h2>
            <div className="mt-4 space-y-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
              <p>
                Explore <strong>escort call girl in rojloo</strong> listings posted by local advertisers. Listings can include information about location, availability, services, and preferred contact methods.
              </p>
              <p>
                Search by location or category to narrow down available listings and find relevant options in your area.
              </p>
            </div>
            <div className="mt-5">
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-700">
                Suggested SEO phrases:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "escort call girl in rojloo",
                  "call girls in rojloo",
                  "escort call girl service",
                  "call girl listings in rojloo",
                  "local escort advertisements",
                ].map((phrase) => (
                  <Link
                    key={phrase}
                    href={`/places?q=${encodeURIComponent(phrase)}`}
                    className="cursor-pointer select-none rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-medium text-gray-800 transition hover:bg-gray-100 hover:border-gray-400"
                  >
                    {phrase}
                  </Link>
                ))}
              </div>
            </div>
          </article>

          {/* Part 4 — Call Girl Listings */}
          <article>
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-gray-700">
              Listings
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-gray-950">
              Find Call Girls in Rojloo
            </h2>
            <div className="mt-4 space-y-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
              <p>
                Looking for a companion for conversation, social occasions, events, or a night out? Browse <strong>call girls in rojloo</strong> listings from advertisers in different locations.
              </p>
              <p>
                You can explore profiles, read descriptions, check available information, and contact advertisers directly through the details provided in their listings.
              </p>
            </div>
            <div className="mt-5">
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-700">
                Suggested SEO phrases:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "call girls in rojloo",
                  "call girl listings",
                  "call girl near me",
                  "local call girl listings",
                  "call girl services in rojloo",
                ].map((phrase) => (
                  <Link
                    key={phrase}
                    href={`/places?q=${encodeURIComponent(phrase)}`}
                    className="cursor-pointer select-none rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-medium text-gray-800 transition hover:bg-gray-100 hover:border-gray-400"
                  >
                    {phrase}
                  </Link>
                ))}
              </div>
            </div>
          </article>

          {/* Part 5 — Massage & Thai Massage */}
          <article>
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-gray-700">
              Wellness &amp; Relaxation
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-gray-950">
              Thai Massage Call Girl, Massage in Rojloo &amp; Body Massage Listings
            </h2>
            <div className="mt-4 space-y-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
              <p>
                Discover local listings for <strong>Thai massage call girl, massage in rojloo, and body massage</strong> services. Browse listings by location and explore descriptions, availability, and other information provided by each advertiser.
              </p>
              <p>
                For people searching for <strong>Thai massage call girl</strong>, <strong>massage in rojloo</strong>, or <strong>body massage</strong>, our location-based listings make it easier to discover relevant services.
              </p>
            </div>
            <div className="mt-5">
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-700">
                Suggested SEO phrases:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "Thai massage call girl",
                  "massage in rojloo",
                  "body massage",
                  "Thai massage in rojloo",
                  "massage listings",
                  "local massage services",
                  "body massage in rojloo",
                ].map((phrase) => (
                  <Link
                    key={phrase}
                    href={`/places?q=${encodeURIComponent(phrase)}`}
                    className="cursor-pointer select-none rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-medium text-gray-800 transition hover:bg-gray-100 hover:border-gray-400"
                  >
                    {phrase}
                  </Link>
                ))}
              </div>
            </div>
          </article>

          {/* Part 6 — Night Out & Night Meeting */}
          <article>
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-gray-700">
              Nightlife
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-gray-950">
              Plan a Night Out or Night Meeting
            </h2>
            <div className="mt-4 space-y-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
              <p>
                Discover listings for people interested in socializing, going out, meeting new people, or arranging a night-time experience.
              </p>
              <p>
                Browse by location to find listings available in your area and review the information provided by each advertiser.
              </p>
            </div>
            <div className="mt-5">
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-700">
                Suggested SEO phrases:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "night out listings",
                  "night meeting",
                  "night meeting services",
                  "night out in rojloo",
                  "local nightlife companion",
                ].map((phrase) => (
                  <Link
                    key={phrase}
                    href={`/places?q=${encodeURIComponent(phrase)}`}
                    className="cursor-pointer select-none rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-medium text-gray-800 transition hover:bg-gray-100 hover:border-gray-400"
                  >
                    {phrase}
                  </Link>
                ))}
              </div>
            </div>
          </article>

          {/* Part 7 — Hotel Party Listings */}
          <article>
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-gray-700">
              Events
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-gray-950">
              Hotel Party &amp; Social Event Listings
            </h2>
            <div className="mt-4 space-y-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
              <p>
                Find listings related to hotel parties, private social gatherings, and other nightlife experiences. Advertisers can publish details about their listings, while users can browse available options based on location.
              </p>
              <p>
                Always review the listing information and communicate with the advertiser before making arrangements.
              </p>
            </div>
            <div className="mt-5">
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-700">
                Suggested SEO phrases:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "hotel party listings",
                  "hotel party services",
                  "hotel party in rojloo",
                  "private party listings",
                  "nightlife listings",
                ].map((phrase) => (
                  <Link
                    key={phrase}
                    href={`/places?q=${encodeURIComponent(phrase)}`}
                    className="cursor-pointer select-none rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-medium text-gray-800 transition hover:bg-gray-100 hover:border-gray-400"
                  >
                    {phrase}
                  </Link>
                ))}
              </div>
            </div>
          </article>

          {/* Part 8 — Escort Service & Male Escort Listings */}
          <article>
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-gray-700">
              Companionship
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-gray-950">
              Escort Service Rojloo &amp; Male Escort Listings
            </h2>
            <div className="mt-4 space-y-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
              <p>
                Browse listings from advertisers offering companionship and social experiences. Depending on the advertiser, listings may include information about conversation, dates, events, outings, or other agreed activities.
              </p>
              <p>
                Search by location and category to discover relevant listings for{" "}
                <strong>escort service rojloo, male escort, and male escort service</strong>.
              </p>
            </div>
            <div className="mt-5">
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-700">
                Suggested SEO phrases:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "escort service rojloo",
                  "male escort",
                  "male escort service",
                  "escort service in rojloo",
                  "social companion",
                  "companion listings in rojloo",
                ].map((phrase) => (
                  <Link
                    key={phrase}
                    href={`/places?q=${encodeURIComponent(phrase)}`}
                    className="cursor-pointer select-none rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-medium text-gray-800 transition hover:bg-gray-100 hover:border-gray-400"
                  >
                    {phrase}
                  </Link>
                ))}
              </div>
            </div>
          </article>

          {/* Part 9 — How the Platform Works */}
          <article>
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-gray-700">
              Guide
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-gray-950">
              How to Find a Listing
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                  1
                </span>
                <h3 className="mt-3 text-base font-bold text-gray-950">
                  1. Choose a location
                </h3>
                <p className="mt-1 text-sm text-gray-700">
                  Select your city or preferred location.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                  2
                </span>
                <h3 className="mt-3 text-base font-bold text-gray-950">
                  2. Select a category
                </h3>
                <p className="mt-1 text-sm text-gray-700">
                  Browse categories such as <strong>call girls in rojloo, escort call girl in rojloo, massage in rojloo, Thai massage call girl, body massage, male escort, male escort service, or nightlife</strong>.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                  3
                </span>
                <h3 className="mt-3 text-base font-bold text-gray-950">
                  3. Explore listings
                </h3>
                <p className="mt-1 text-sm text-gray-700">
                  Review advertiser profiles, descriptions, images, and available information.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                  4
                </span>
                <h3 className="mt-3 text-base font-bold text-gray-950">
                  4. Contact the advertiser
                </h3>
                <p className="mt-1 text-sm text-gray-700">
                  Use the contact information or communication method provided in the listing.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs sm:col-span-2 lg:col-span-1">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                  5
                </span>
                <h3 className="mt-3 text-base font-bold text-gray-950">
                  5. Make your own arrangements
                </h3>
                <p className="mt-1 text-sm text-gray-700">
                  Discuss availability, pricing, location, and expectations directly with the advertiser.
                </p>
              </div>
            </div>
          </article>

          {/* Part 10 — Why Use the Platform? */}
          <article>
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-gray-700">
              Features &amp; Advantages
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-gray-950">
              A Convenient Place to Discover Local Listings
            </h2>
            <p className="mt-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
              Our platform brings different types of local lifestyle and companionship listings together in one place.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                <h3 className="text-base font-bold text-gray-950">
                  Location-based discovery
                </h3>
                <p className="mt-2 text-sm text-gray-700">
                  Find listings according to your preferred location.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                <h3 className="text-base font-bold text-gray-950">
                  Multiple categories
                </h3>
                <p className="mt-2 text-sm text-gray-700">
                  Explore <strong>call girls in rojloo, escort call girl in rojloo, massage in rojloo, Thai massage call girl, body massage, male escort, male escort service, escort service rojloo</strong>, night outings, and other categories.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                <h3 className="text-base font-bold text-gray-950">
                  Advertiser-created listings
                </h3>
                <p className="mt-2 text-sm text-gray-700">
                  Advertisers can provide their own descriptions and information.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                <h3 className="text-base font-bold text-gray-950">
                  Easy browsing
                </h3>
                <p className="mt-2 text-sm text-gray-700">
                  Search and filter listings to find relevant options more efficiently.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                <h3 className="text-base font-bold text-gray-950">
                  Updated listings
                </h3>
                <p className="mt-2 text-sm text-gray-700">
                  Advertisers can update their information and availability when necessary.
                </p>
              </div>
            </div>
          </article>

          {/* Part 11 — Safety & Responsible Use */}
          <article>
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-gray-700">
              Safety &amp; Compliance
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-gray-950">
              Browse Listings Responsibly
            </h2>
            <div className="mt-4 space-y-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
              <p>
                Users should review listing information carefully and communicate clearly before making arrangements. Do not share unnecessary personal or financial information, and verify important details independently.
              </p>
              <p>
                All interactions should be between consenting adults and comply with applicable laws and platform rules.
              </p>
            </div>
          </article>

          {/* Part 12 — Rojloo SEO Section */}
          <article>
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-gray-700">
              Local Directory
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-gray-950">
              Find Listings in Rojloo
            </h2>
            <div className="mt-4 space-y-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
              <p>
                Explore local listings and discover services available in <strong>rojloo</strong>. Browse advertisements for <strong>call girls in rojloo, escort call girl in rojloo, massage in rojloo, Thai massage call girl, body massage, male escort, male escort service, escort service rojloo</strong>, night outings, and other categories.
              </p>
              <p>
                Select your preferred category to browse relevant advertisements and review the information provided by each advertiser.
              </p>
            </div>
            <div className="mt-5">
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-700">
                Suggested Internal Links:
              </p>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {[
                  "Escort Call Girl in Rojloo",
                  "Call Girls in Rojloo",
                  "Thai Massage Call Girl",
                  "Massage in Rojloo",
                  "Body Massage in Rojloo",
                  "Male Escort",
                  "Male Escort Service",
                  "Escort Service Rojloo",
                  "Night Out in Rojloo",
                  "Hotel Party in Rojloo",
                ].map((linkName) => (
                  <Link
                    key={linkName}
                    href={`/places?q=${encodeURIComponent(linkName)}`}
                    className="cursor-pointer select-none rounded-full border border-gray-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-gray-950 transition hover:bg-gray-100 hover:border-gray-400 shadow-2xs"
                  >
                    {linkName}
                  </Link>
                ))}
              </div>
            </div>
          </article>

          {/* Parts 13, 14, 15 — FAQ Section */}
          <HomeFaq />
        </div>
      </section>
    </main>
  );
}
