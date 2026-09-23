import type { Metadata } from "next";
import Image from "next/image";
import Button from "@/components/ui/button";
import SearchBar from "@/components/search-bar";
import HomeFaq from "@/components/home-faq";
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

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-12 sm:space-y-16">
          <article>
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-gray-700">
              Community &amp; Conduct
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-gray-950">
              Professional Etiquette &amp; Standards
            </h2>
            <p className="mt-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
              Rojlo is a platform designed to connect clients with independent call girls and companions. The service allows users to find services, post ads, and explore places in their city. Clients and companions should be aware that Rojlo provides a space for independent listings, where individuals can offer companionship services. When scheduling companionship, it helps support both parties to communicate openly and respect each other&apos;s boundaries. Rojlo does not operate as a direct service provider but rather as a facilitator, helping users have a platform to connect and arrange their meetings. The platform is open to a wide range of individuals seeking companionship, whether for social events, travel, or personal enrichment. Rojlo&apos;s service overview emphasizes the importance of mutual respect and understanding between clients and companions, creating a comfortable and respectful environment for all users.
            </p>
          </article>

          <article>
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-gray-700">
              Safety &amp; Privacy
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-gray-950">
              Privacy &amp; Discretion Guidelines
            </h2>
            <div className="mt-4 space-y-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
              <p>
                Clients and companions are advised to uphold clear discretion standards and privacy when engaging with call girls service or escort girls. Discretion guidelines emphasize the importance of maintaining personal privacy and helping all interactions are conducted with mutual respect and consent. When arranging social accompaniment through Rojlo, it is recommended to understand the significance of these principles to ensure a mutually respectful experience. Rojlo encourages all parties to adhere to these guidelines, promoting a community where both clients and companions feel secure and valued. Discretion is paramount, and all individuals are reminded to respect the boundaries and choices of others. By prioritizing privacy and consent, we contribute to a healthier and more considerate adult social scene.
              </p>
              <p>
                To further emphasize the importance of privacy and discretion, clients are advised to refrain from sharing any personal or identifiable information about their encounters on Rojlo. This includes avoiding any public posts or discussions that could potentially reveal the identity of companions or the nature of their interactions. By maintaining strict confidentiality, clients not only protect their own privacy but also contribute to a safer environment for all users. Rojlo takes pride in fostering a community where individuals can engage in adult social activities with peace of mind, knowing that their personal choices and interactions are respected and safeguarded.
              </p>
              <p>
                When evaluating call boys, practical considerations and transparent standards remain essential for the best outcome.
              </p>
            </div>
          </article>

          <article>
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-gray-700">
              Services &amp; Occasions
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-gray-950">
              Event &amp; Social Accompaniment
            </h2>
            <p className="mt-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
              When arranging social accompaniment for business dinners, private travel, formal galas, and professional client etiquette, it is recommended to consider the occasion and the role of the companion. Clients and companions are advised to maintain a level of decorum and respect, helping the event runs smoothly and professionally. For those seeking an escort service or call service, it is essential to understand the nuances of dinner etiquette and client conduct. Social accompaniment can greatly enhance the experience of attending formal events, providing a sense of security and confidence. Rojlo offers a detailed guide for finding suitable companions for various occasions. Discreet and professional, these independent listings cater to clients who value privacy and confidentiality. By understanding the importance of social etiquette and the role of a travel companion, clients can ensure a successful and comfortable experience. Rojlo is here to support you in navigating the complexities of social accompaniment, helping you make informed decisions that align with your needs and preferences.
            </p>
          </article>

          <article>
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-gray-700">
              Arrangements &amp; Notice
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-gray-950">
              Advance Scheduling &amp; Logistics
            </h2>
            <div className="mt-4 space-y-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-900">
              <p>
                When arranging social accompaniment through Rojlo, clients and companions are advised to adhere to certain guidelines for a well-coordinated experience. Advance reservations are crucial for ensuring availability, and scheduling notice should be provided with ample time for both parties to confirm. It is essential to communicate clearly and discreetly, respecting the privacy of all involved. For independent companion listings, etiquette plays a significant role in fostering a respectful and enjoyable atmosphere. Rojlo encourages open and honest communication between clients and companions, allowing for a mutually satisfying encounter. By following these scheduling guidelines, clients and companions can create a memorable experience that respects all parties&apos; boundaries and preferences.
              </p>
              <p>
                When scheduling through Rojlo, clients should remember that punctuality is key to a smooth experience. It is advisable to provide a detailed itinerary, including the date, time, and location of the meeting, to ensure that both parties are well-prepared. Clients are also encouraged to be transparent about their intentions and expectations to avoid any misunderstandings. For companions, maintaining a professional and courteous demeanor is recommended, as it sets the tone for a respectful and enjoyable encounter. Rojlo values the safety and satisfaction of all its users and promotes a culture of respect and discretion in all interactions.
              </p>
            </div>
          </article>

          <HomeFaq />
        </div>
      </section>
    </main>
  );
}
