import Script from "next/script";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

interface GoogleAnalyticsProps {
  measurementId?: string;
}

/**
 * Google Analytics 4 (GA4) Global Script Integration.
 * Uses Next.js next/script with strategy="afterInteractive" to ensure
 * zero blocking of initial page rendering and optimal Core Web Vitals (LCP/INP).
 */
export default function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const gaId = (measurementId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-FX3QPQVFZ").trim();

  // If gaId is empty or not in GA4 format, safely do not inject scripts
  if (!gaId || !gaId.startsWith("G-")) {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}');
          `,
        }}
      />
    </>
  );
}
