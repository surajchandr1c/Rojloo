import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Eyebrow({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-sm font-semibold uppercase tracking-[0.3em] text-gray-700",
        className
      )}
      {...props}
    />
  );
}
