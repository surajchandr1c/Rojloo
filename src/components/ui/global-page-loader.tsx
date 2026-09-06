"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import PageLoader from "./page-loader";

function LoaderListener({
  setIsLoading,
}: {
  setIsLoading: (val: boolean) => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Reset loading whenever route finishes rendering
  useEffect(() => {
    setIsLoading(false);
  }, [pathname, searchParams, setIsLoading]);

  return null;
}

export function GlobalPageLoader({ children }: { children: React.ReactNode }) {
  // Start with loading on first mount/refresh
  const [isLoading, setIsLoading] = useState(true);

  // Handle initial page load / refresh
  useEffect(() => {
    // When the component mounts on page load / refresh, turn off loading smoothly
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 180);

    // When the user hits Refresh or unloads the page, show circular bar immediately
    const handleBeforeUnload = () => {
      setIsLoading(true);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Intercept click on internal links so the loader shows during page transitions
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      const targetAttr = target.getAttribute("target");

      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("//") &&
        targetAttr !== "_blank" &&
        !href.includes("#") &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        const currentUrl = window.location.pathname + window.location.search;
        if (href !== currentUrl) {
          setIsLoading(true);
        }
      }
    };

    // Safety timeout in case a navigation is aborted or fails
    let safetyTimer: NodeJS.Timeout | null = null;
    if (isLoading) {
      safetyTimer = setTimeout(() => {
        setIsLoading(false);
      }, 8000);
    }

    document.addEventListener("click", handleAnchorClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleAnchorClick, { capture: true });
      if (safetyTimer) clearTimeout(safetyTimer);
    };
  }, [isLoading]);

  return (
    <>
      <Suspense fallback={null}>
        <LoaderListener setIsLoading={setIsLoading} />
      </Suspense>
      {isLoading && <PageLoader fullScreen text="Wait, page is loading..." />}
      {children}
    </>
  );
}

export default GlobalPageLoader;
