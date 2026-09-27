"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export default function AdGallery({
  images,
  name,
  className,
}: {
  images: string[];
  name: string;
  className?: string;
}) {
  const count = images.length;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, 2000);
    return () => clearInterval(timer);
  }, [count]);

  if (count === 0) {
    return (
      <div
        className={cn(
          "relative h-[20rem] w-full overflow-hidden rounded-[1.5rem] bg-gray-50 sm:h-[24rem] md:h-[28rem] lg:h-[32rem] xl:h-[34rem] max-h-[calc(100vh-10rem)]",
          className
        )}
      />
    );
  }

  const go = (dir: number) => setIndex((i) => (i + dir + count) % count);

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative h-[20rem] w-full overflow-hidden rounded-[1.5rem] bg-gray-50 sm:h-[24rem] md:h-[28rem] lg:h-[32rem] xl:h-[34rem] max-h-[calc(100vh-10rem)]">
        <Image
          src={images[index]}
          alt={`${name} image ${index + 1}`}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority={index === 0}
        />
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous image"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-2 text-2xl font-black text-gray-950 shadow hover:bg-white"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next image"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-2 text-2xl font-black text-gray-950 shadow hover:bg-white"
          >
            ›
          </button>

          <div className="mt-3 flex justify-center gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to image ${i + 1}`}
                className={`h-2.5 w-2.5 rounded-full ${
                  i === index ? "bg-gray-700" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
