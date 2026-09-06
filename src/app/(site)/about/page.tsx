import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Card, SectionPanel } from "@/components/ui/card";
import { policySections, siteInfo } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Rojlo | Policies, Contact and Address",
  description:
    "Read about Rojlo, our platform policies, contact email, phone number, and office address.",
};

export default function About() {
  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <SectionPanel>
        <Eyebrow>About</Eyebrow>
        <h1 className="mt-3 text-3xl font-black text-red-950 sm:text-4xl">
          About Rojlo
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-red-900">
          Rojlo is a local marketplace for services, places, and ads. We help
          users discover trusted service providers, explore city pages, and post
          their own listings in one simple place.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <Card>
            <Eyebrow className="tracking-[0.25em]">Email</Eyebrow>
            <a
              href={`mailto:${siteInfo.email}`}
              className="mt-3 block text-lg sm:text-xl font-black !text-red-950 break-all"
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

        <section className="mt-10">
          <h2 className="text-2xl font-black text-red-950">Policies</h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-red-900">
            These policies explain how the platform works, how user content is
            handled, and what to expect when using Rojlo.
          </p>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {policySections.map((section) => (
              <Card key={section.title}>
                <h3 className="text-xl font-black text-red-950">
                  {section.title}
                </h3>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-red-900">
                  {section.points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-red-600" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>
      </SectionPanel>
    </main>
  );
}
