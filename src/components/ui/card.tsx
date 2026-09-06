import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("min-w-0 rounded-[1.5rem] bg-white p-4 sm:p-6 shadow-sm", className)}
      {...props}
    />
  );
}

export function SectionPanel({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        "mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] bg-pink-100/85 p-4 sm:p-6 md:p-8 lg:p-10 shadow-lg shadow-pink-200/40",
        className
      )}
      {...props}
    />
  );
}
