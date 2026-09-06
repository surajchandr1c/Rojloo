"use client";

import { useEffect } from "react";
import Link from "next/link";
import NavBar from "@/components/navbar";
import Footer from "@/components/footer";
import { Providers } from "./providers";

export default function NotFound() {
  useEffect(() => {
    try {
      const url = window.location.pathname + window.location.search;
      const referrer = document.referrer || undefined;
      fetch("/api/log-404", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, referrer }),
      }).catch(() => {});
    } catch {
      // Ignore
    }
  }, []);

  return (
    <Providers>
      <div className="flex min-h-screen flex-col bg-pink-50 text-red-950">
        <NavBar />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:py-24">
        <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-8 shadow-xl">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-red-100 text-rose-600 shadow-inner">
            <span className="text-3xl font-black tracking-tight">404</span>
          </div>
          <h1 className="text-2xl font-black text-red-950 sm:text-3xl">Page Not Found</h1>
          <p className="mt-3 text-sm leading-relaxed text-red-800/80">
            The page or URL you are looking for does not exist or has been moved. We have recorded this URL in the system so it can be resolved.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-red-700 hover:to-rose-700"
            >
              Go to Homepage
            </Link>
            <Link
              href="/places"
              className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-6 py-3 text-sm font-semibold text-red-900 shadow-sm transition hover:bg-red-50"
            >
              Browse Places
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
    </Providers>
  );
}