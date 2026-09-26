import React from "react";
import Image from "next/image";
import { getStaticSeo, StaticPageKey, StaticContentBlock } from "@/lib/models/static-seo";
import { cn } from "@/lib/cn";

interface StaticSeoSectionProps {
  pageKey: StaticPageKey;
  className?: string;
  inCard?: boolean;
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

function renderBlock(block: StaticContentBlock) {
  switch (block.type) {
    case "h2":
      return (
        <h2
          key={block.id}
          className="text-xl sm:text-2xl font-bold text-gray-950 tracking-tight"
        >
          {renderFormattedText(block.text)}
        </h2>
      );
    case "h3":
      return (
        <h3
          key={block.id}
          className="text-lg sm:text-xl font-bold text-gray-950 tracking-tight"
        >
          {renderFormattedText(block.text)}
        </h3>
      );
    case "p":
    default:
      return (
        <p
          key={block.id}
          className="text-base sm:text-lg leading-7 sm:leading-8 text-gray-900 whitespace-pre-line"
        >
          {renderFormattedText(block.text)}
        </p>
      );
  }
}

export async function StaticSeoSection({
  pageKey,
  className,
  inCard = true,
}: StaticSeoSectionProps) {
  const seo = await getStaticSeo(pageKey);

  if (!seo || seo.status !== "published") {
    return null;
  }

  const { images = [], content = [] } = seo;
  if (images.length === 0 && content.length === 0) {
    return null;
  }

  const img1 = images[0];
  const img2 = images[1];

  let bodyContent: React.ReactNode = null;

  // Case 1: Both Image 1 and Image 2 exist
  // Rule:
  // Section 1: Content on the LEFT side, Image 1 on the RIGHT side
  // Section 2: Image 2 on the LEFT side, Content on the RIGHT side
  if (img1 && img2) {
    const mid = Math.ceil(content.length / 2);
    const firstHalfBlocks = content.slice(0, mid);
    const secondHalfBlocks = content.slice(mid);

    bodyContent = (
      <div className="space-y-12 sm:space-y-16">
        {/* Section 1: Content LEFT, Image 1 RIGHT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            {firstHalfBlocks.map(renderBlock)}
          </div>
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-2xl border border-gray-200/80 bg-gray-100 shadow-md">
              <img
                src={img1.url}
                alt={img1.alt || "SEO Image 1"}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Image 2 LEFT, Content RIGHT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 flex justify-center order-last lg:order-first">
            <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-2xl border border-gray-200/80 bg-gray-100 shadow-md">
              <img
                src={img2.url}
                alt={img2.alt || "SEO Image 2"}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
          <div className="lg:col-span-7 space-y-4">
            {secondHalfBlocks.map(renderBlock)}
          </div>
        </div>
      </div>
    );
  } else if (img1) {
    // Case 2: Only 1 image (Image 1)
    // Rule: Content on LEFT side, Image 1 on RIGHT side
    bodyContent = (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-4">
          {content.map(renderBlock)}
        </div>
        <div className="lg:col-span-5 flex justify-center">
          <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-2xl border border-gray-200/80 bg-gray-100 shadow-md">
            <img
              src={img1.url}
              alt={img1.alt || "SEO Image 1"}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    );
  } else if (img2) {
    // Case 3: Only Image 2 exists
    // Rule: Image 2 on LEFT side, Content on RIGHT side
    bodyContent = (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-5 flex justify-center order-last lg:order-first">
          <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-2xl border border-gray-200/80 bg-gray-100 shadow-md">
            <img
              src={img2.url}
              alt={img2.alt || "SEO Image 2"}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
        <div className="lg:col-span-7 space-y-4">
          {content.map(renderBlock)}
        </div>
      </div>
    );
  } else {
    // Case 4: No images, only content blocks
    bodyContent = (
      <div className="space-y-4 max-w-4xl mx-auto">
        {content.map(renderBlock)}
      </div>
    );
  }

  const containerClasses = inCard
    ? "mx-auto w-full max-w-6xl rounded-[2rem] bg-gray-100/85 p-5 sm:p-8 md:p-10 shadow-lg shadow-gray-200/40"
    : "mx-auto w-full max-w-6xl";

  return (
    <section
      aria-label="Additional Information"
      className={cn("mt-12 sm:mt-16 w-full", className)}
    >
      <div className={containerClasses}>{bodyContent}</div>
    </section>
  );
}
