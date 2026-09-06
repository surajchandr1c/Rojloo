import React from "react";

export function PageLoader({
  text = "Wait, page is loading...",
  fullScreen = true,
}: {
  text?: string;
  fullScreen?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        fullScreen
          ? "fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-pink-50/95 backdrop-blur-sm transition-opacity duration-200"
          : "flex min-h-[60vh] w-full flex-col items-center justify-center py-12"
      }
    >
      <div className="relative flex items-center justify-center">
        {/* Outer Circular Spinner */}
        <svg
          className="h-16 w-16 animate-spin text-red-700 sm:h-20 sm:w-20"
          viewBox="0 0 50 50"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle track circle */}
          <circle
            className="stroke-red-200/70"
            cx="25"
            cy="25"
            r="20"
            strokeWidth="4"
          />
          {/* Active spinning circular bar */}
          <circle
            className="stroke-red-700"
            cx="25"
            cy="25"
            r="20"
            strokeWidth="4.5"
            strokeDasharray="80 150"
            strokeLinecap="round"
          />
        </svg>

        {/* Center glowing accent */}
        <div className="absolute flex h-7 w-7 items-center justify-center rounded-full bg-pink-100">
          <div className="h-2.5 w-2.5 rounded-full bg-red-800 animate-ping opacity-75" />
          <div className="absolute h-2 w-2 rounded-full bg-red-700" />
        </div>
      </div>

      {/* Caption Text Below Circular Bar */}
      <p className="mt-5 text-sm font-semibold tracking-wide text-red-950 sm:text-base">
        {text}
      </p>
    </div>
  );
}

export default PageLoader;
