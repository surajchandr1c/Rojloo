"use client";

import { useState } from "react";
import { StaticFaqItem } from "@/lib/types/static-seo";

interface StaticFaqAccordionProps {
  faqs: StaticFaqItem[];
  title?: string;
  className?: string;
}

function renderFormattedText(text: string) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={index} className="font-bold text-gray-950">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export default function StaticFaqAccordion({
  faqs,
  title = "Frequently Asked Questions",
  className = "",
}: StaticFaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!faqs || faqs.length === 0) return null;

  const toggleFaq = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <article className={`pt-8 border-t border-gray-200/80 mt-10 ${className}`}>
      <h2 className="text-2xl sm:text-3xl font-black text-gray-950">
        {title}
      </h2>

      <div className="mt-6 divide-y divide-gray-200">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={faq.id || index} className="py-4 sm:py-5">
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
                <div className="mt-3 text-base sm:text-lg leading-7 sm:leading-8 text-gray-800 whitespace-pre-line">
                  {renderFormattedText(faq.answer)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
