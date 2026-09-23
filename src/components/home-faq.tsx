"use client";

import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: "How do I find services on Rojlo?",
    answer:
      "On Rojlo, you can find services by browsing the 'Find Services' section, where you can explore various categories and listings.",
  },
  {
    question: "What types of listings can I find on Rojlo?",
    answer:
      "Rojlo offers listings for call girls, places, and ads posted by individuals and businesses.",
  },
  {
    question: "How can I post an ad on Rojlo?",
    answer:
      "To post an ad, you need to create an account and follow the guidelines provided on the platform.",
  },
  {
    question: "Is there a fee for posting ads on Rojlo?",
    answer:
      "Yes, there may be fees associated with posting ads, depending on the type of listing and the duration of the posting.",
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
