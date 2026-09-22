import type { Metadata } from "next";
import Image from "next/image";
import Button from "@/components/ui/button";
import SearchBar from "@/components/search-bar";
import { serviceCards } from "@/lib/services";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Rojlo – Find Services, call girls,  Places & Post Ads in Your City",
  description:
    "Rojlo connects you with call girls, male escorts, wellness, and the best local spots and services across Indian cities. Post your ad today.",
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    title: "Rojlo – Find Services, call girls, Places & Post Ads in Your City",
    description:
      "Rojlo connects you with call girls, male escorts, wellness, and the best local spots across Indian cities.",
    url: siteConfig.url,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rojlo – Find Services, Places & Post Ads in Your City",
    description:
      "Rojlo connects you with call girls, male escorts, wellness, and the best local spots across Indian cities.",
  },
};

export default function Home() {
  return (
    <main>
      <section className="bg-gray-200">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-gray-700">
              get you fun
            </p>
            <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black leading-tight text-gray-950 break-words">
              Roj Lo Moj Lo Na Mile Khoj Lo
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
              Rojlo connects you with call girls, male escorts, wellness, and the
              best local spots across Indian cities.
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
                className="overflow-hidden rounded-[1.75rem] bg-white/90 shadow-md shadow-gray-200/30"
              >
                <div className="relative h-56 overflow-hidden rounded-[1.25rem]">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover"
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
    </main>
  );
}
