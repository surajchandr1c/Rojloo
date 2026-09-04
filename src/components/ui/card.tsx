import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-[1.5rem] bg-white p-6 shadow-sm", className)}
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
        "mx-auto max-w-6xl rounded-[2rem] bg-pink-100/85 p-8 shadow-lg shadow-pink-200/40 sm:p-10",
        className
      )}
      {...props}
    />
  );
}
