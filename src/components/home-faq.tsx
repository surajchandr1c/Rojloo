"use client";

import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: "What can I find on Rojloo?",
    answer:
      "You can find listings related to call girls in rojloo, escort call girl in rojloo, massage in rojloo, Thai massage call girl, body massage, male escort, male escort service, escort service rojloo, night outings, hotel parties, and other adult-oriented social experiences.",
  },
  {
    question: "Can I search listings by location?",
    answer:
      "Yes. You can browse listings based on location and category where those filters are available.",
  },
  {
    question: "How do I contact an advertiser?",
    answer:
      "Open the relevant listing and use the contact method provided by the advertiser.",
  },
  {
    question: "Can advertisers create their own listings?",
    answer:
      "Yes, registered advertisers can publish listings according to the platform's posting requirements.",
  },
  {
    question: "Are all listings available all the time?",
    answer:
      "Availability can change. Contact the advertiser directly to confirm current availability and details.",
  },
  {
    question: "What is a call girl listing?",
    answer:
      "A call girl listing provides information about an advertiser and the services or companionship they offer. Check the individual listing for specific details.",
  },
  {
    question: "What is a Thai massage call girl listing?",
    answer:
      "It is a listing advertising Thai massage-related services. Check the individual listing for the specific service details provided by the advertiser.",
  },
  {
    question: "Can I find listings in Rojloo?",
    answer:
      "Yes. You can browse listings available in rojloo through the relevant location and category pages.",
  },
  {
    question: "What is a male escort service?",
    answer:
      "A male escort service listing provides information about male companionship or social services offered by an advertiser.",
  },
  {
    question: "What should I check before contacting someone?",
    answer:
      "Review the complete listing, confirm the details directly with the advertiser, and avoid sharing unnecessary personal or financial information.",
  },
  {
    question: "Can I browse listings without contacting an advertiser?",
    answer:
      "Yes. You can review publicly available listing information before deciding whether to contact an advertiser.",
  },
  {
    question: "Can I search by category?",
    answer:
      "Yes, where category filtering is available, you can select the type of listing you are interested in.",
  },
  {
    question: "Can advertisers update their listings?",
    answer:
      "Yes, advertisers can update their listing information according to the platform's available features.",
  },
  {
    question: "Can I search listings in Rojloo?",
    answer:
      "Yes. You can explore available call girls in rojloo, escort call girl in rojloo, massage in rojloo, body massage, male escort, male escort service, and escort service rojloo listings.",
  },
  {
    question: "How can I identify relevant listings?",
    answer:
      "Use the category, location, listing description, images, and other information supplied by the advertiser.",
  },
];

export default function HomeFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    // Accordion mutex: click active to close, click another to open that one and close the previous
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <article className="pt-2">
      <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-gray-700">
        Common Inquiries
      </p>
      <h2 className="mt-2 text-2xl sm:text-3xl font-black text-gray-950">
        Frequently Asked Questions
      </h2>
      <p className="mt-2 text-sm sm:text-base text-gray-700 font-medium">
        Everything you need to know about using Rojlo, posting listings, and exploring city services.
      </p>

      <div className="mt-6 divide-y divide-gray-200">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={index} className="py-4 sm:py-5">
              <button
                type="button"
                onClick={() => toggleFaq(index)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 text-left cursor-pointer group focus:outline-none"
              >
                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-950 group-hover:text-gray-700 transition-colors">
                  {faq.question}
                </h3>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-600 group-hover:text-gray-950 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </button>

              {isOpen && (
                <div className="mt-3 pr-8 text-sm sm:text-base leading-7 text-gray-800">
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
