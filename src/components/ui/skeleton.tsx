import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Base skeleton block with subtle pulse animation and reduced-motion support.
 */
export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse motion-reduce:animate-none rounded-lg bg-pink-200/60 ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
}

/**
 * Skeleton text lines with realistic staggered widths.
 */
export function SkeletonText({
  lines = 2,
  className = "",
  lineHeight = "h-4",
  lastLineWidth = "w-3/5",
}: {
  lines?: number;
  className?: string;
  lineHeight?: string;
  lastLineWidth?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => {
        const isLast = i === lines - 1 && lines > 1;
        return (
          <Skeleton
            key={i}
            className={`${lineHeight} ${isLast ? lastLineWidth : "w-full"} rounded-md`}
          />
        );
      })}
    </div>
  );
}

/**
 * Skeleton circular/avatar placeholder.
 */
export function SkeletonAvatar({
  size = "h-12 w-12",
  className = "",
}: {
  size?: string;
  className?: string;
}) {
  return <Skeleton className={`${size} rounded-full shrink-0 ${className}`} />;
}

/**
 * Skeleton badge/pill placeholder.
 */
export function SkeletonBadge({
  className = "h-6 w-16",
}: {
  className?: string;
}) {
  return <Skeleton className={`rounded-full ${className}`} />;
}

/**
 * Skeleton button placeholder.
 */
export function SkeletonButton({
  className = "h-10 w-24",
}: {
  className?: string;
}) {
  return <Skeleton className={`rounded-full ${className}`} />;
}
