import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Card, SectionPanel } from "@/components/ui/card";
import { siteInfo } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact Us | Rojlo",
  description: "Get in touch with the Rojlo support team by email, phone, or mail.",
};

export default function Contact() {
  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <SectionPanel>
        <Eyebrow>Contact</Eyebrow>
        <h1 className="mt-3 text-3xl font-black text-red-950 sm:text-4xl">
          Contact Us
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-red-900">
          Have a question or need help? Reach out to our team using the details
          below.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <Card>
            <Eyebrow className="tracking-[0.25em]">Email</Eyebrow>
            <a
              href={`mailto:${siteInfo.email}`}
              className="mt-3 block text-xl font-black !text-red-950"
            >
              {siteInfo.email}
            </a>
          </Card>

          <Card>
            <Eyebrow className="tracking-[0.25em]">Contact</Eyebrow>
            <a
              href={`tel:${siteInfo.phone.replace(/\s/g, "")}`}
              className="mt-3 block text-xl font-black !text-red-950"
            >
              {siteInfo.phone}
            </a>
          </Card>

          <Card>
            <Eyebrow className="tracking-[0.25em]">Address</Eyebrow>
            <p className="mt-3 text-base leading-7 text-red-900">
              {siteInfo.address}
            </p>
          </Card>
        </div>
      </SectionPanel>
    </main>
  );
}
