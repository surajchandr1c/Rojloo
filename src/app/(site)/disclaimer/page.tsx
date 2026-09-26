import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SectionPanel } from "@/components/ui/card";
import { StaticSeoSection } from "@/components/seo/static-seo-section";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Disclaimer | Rojlo",
  description: "Read the disclaimer for using the Rojlo platform.",
  alternates: {
    canonical: `${siteConfig.url}/disclaimer`,
  },
  openGraph: {
    title: "Disclaimer | Rojlo",
    description: "Read the disclaimer for using the Rojlo platform.",
    url: `${siteConfig.url}/disclaimer`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Disclaimer | Rojlo",
    description: "Read the disclaimer for using the Rojlo platform.",
  },
};

export default function Disclaimer() {
  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <SectionPanel>
        <Eyebrow>Disclaimer</Eyebrow>
        <h1 className="mt-3 text-3xl font-black text-gray-950 sm:text-4xl">
          Disclaimer
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-900">
          Please read this disclaimer before using Rojlo.
        </p>

        <div className="mt-8 space-y-6">
          <section>
            <h2 className="text-xl font-black text-gray-950">1. Marketplace Role</h2>
            <p className="mt-2 max-w-3xl text-base leading-7 text-gray-900">
              Rojlo is a marketplace that connects users. We do not personally
              perform the listed services.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-black text-gray-950">2. No Warranty</h2>
            <p className="mt-2 max-w-3xl text-base leading-7 text-gray-900">
              The platform is provided &ldquo;as is&rdquo; without warranties of any kind.
              We do not guarantee service quality or availability.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-black text-gray-950">3. User Responsibility</h2>
            <p className="mt-2 max-w-3xl text-base leading-7 text-gray-900">
              Users are responsible for verifying listings, service details, and
              the conduct of other users before transacting.
            </p>
          </section>
        </div>
      </SectionPanel>
      <StaticSeoSection pageKey="disclaimer" />
    </main>
  );
}
