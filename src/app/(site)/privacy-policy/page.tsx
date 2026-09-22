import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SectionPanel } from "@/components/ui/card";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy | Rojlo",
  description: "Read how Rojlo collects, uses, and protects your information.",
  alternates: {
    canonical: `${siteConfig.url}/privacy-policy`,
  },
  openGraph: {
    title: "Privacy Policy | Rojlo",
    description: "Read how Rojlo collects, uses, and protects your information.",
    url: `${siteConfig.url}/privacy-policy`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | Rojlo",
    description: "Read how Rojlo collects, uses, and protects your information.",
  },
};

export default function PrivacyPolicy() {
  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <SectionPanel>
        <Eyebrow>Privacy Policy</Eyebrow>
        <h1 className="mt-3 text-3xl font-black text-gray-950 sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-900">
          This policy explains how Rojlo handles your information.
        </p>

        <div className="mt-8 space-y-6">
          <section>
            <h2 className="text-xl font-black text-gray-950">1. Information We Collect</h2>
            <p className="mt-2 max-w-3xl text-base leading-7 text-gray-900">
              We collect account details, ad content, and basic usage information
              needed to operate the platform and support you.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-black text-gray-950">2. How We Use It</h2>
            <p className="mt-2 max-w-3xl text-base leading-7 text-gray-900">
              Your information is used to provide services, display listings,
              communicate with you, and improve the platform.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-black text-gray-950">3. Data Sharing</h2>
            <p className="mt-2 max-w-3xl text-base leading-7 text-gray-900">
              We do not sell your personal information. Data may be shared with
              service providers only as needed to run the platform.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-black text-gray-950">4. Your Choices</h2>
            <p className="mt-2 max-w-3xl text-base leading-7 text-gray-900">
              You can request access to or deletion of your account data by
              contacting our support team.
            </p>
          </section>
        </div>
      </SectionPanel>
    </main>
  );
}
