"use client";

import { useState } from "react";

export interface FaqItemProp {
  id?: string;
  question: string;
  answer: string | React.ReactNode;
}

const defaultFaqs: FaqItemProp[] = [
  {
    question: "What can I find on Rojloo?",
    answer:
      "You can find adult-oriented social listings covering **call girls in Rojloo, escort call girl in Rojloo, escort service Rojloo, male escort, male escort service, night out, night meetings, hotel parties, Thai massage call girl, massage in Rojloo, and body massage**.",
  },
  {
    question: "Can I post my own advertisement?",
    answer:
      "Yes. Users can create advertisements describing their available services or social offerings, subject to the platform's rules and applicable laws.",
  },
  {
    question: "How can I find listings in Rojloo?",
    answer:
      "Use the location or city filters available on Rojloo to browse advertisements relevant to your area.",
  },
  {
    question: "Are Thai massage and body massage listings available?",
    answer:
      "Yes. Depending on the location, users may find listings for **Thai massage call girl, massage in Rojloo, and body massage** services.",
  },
  {
    question: "How do I contact an advertiser?",
    answer:
      "Open a listing to review the available information and use the contact method provided by the advertiser. Always verify details and agree on arrangements before meeting.",
  },
  {
    question: "Is Rojloo available for adults only?",
    answer:
      "The platform is intended for adults. Users should comply with applicable age requirements, local laws, and the platform's terms when creating or responding to listings.",
  },
];

function renderFormattedAnswer(ans: string | React.ReactNode) {
  if (typeof ans !== "string") return ans;
  const parts = ans.split(/(\*\*[^*]+\*\*)/g);
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

export default function HomeFaq({
  items,
}: {
  items?: FaqItemProp[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const list = items && items.length > 0 ? items : defaultFaqs;

  const toggleFaq = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <article className="pt-2">
      <h2 className="text-2xl sm:text-3xl font-black text-gray-950">
        Frequently Asked Questions
      </h2>

      <div className="mt-6 divide-y divide-gray-200">
        {list.map((faq, index) => {
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
                <p className="mt-3 text-base sm:text-lg leading-7 sm:leading-8 text-gray-800 whitespace-pre-line">
                  {renderFormattedAnswer(faq.answer)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
