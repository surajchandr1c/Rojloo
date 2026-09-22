"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const STORAGE_KEY = "rojlo_age_verified";
const DECLINED_KEY = "rojlo_age_declined";

export default function AgeGate() {
  const pathname = usePathname();
  const router = useRouter();
  // Default to hidden so the server render is identical to a fresh client
  // render (avoids a hydration mismatch that would disable the buttons).
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Defer the storage read until after hydration (same pattern as
    // auth-context.tsx) so the modal decision never happens during SSR.
    queueMicrotask(() => {
      let verified = false;
      let declined = false;
      try {
        verified = localStorage.getItem(STORAGE_KEY) === "true";
        declined = sessionStorage.getItem(DECLINED_KEY) === "true";
      } catch {
        verified = false;
        declined = false;
      }

      if (verified) {
        setShow(false);
        return;
      }

      // If the user already indicated they are under 18 and is on the home page,
      // allow them to browse the home page without re-showing the modal.
      if (declined && pathname === "/") {
        setShow(false);
        return;
      }

      setShow(true);
    });
  }, [pathname]);

  function acceptAge() {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
      sessionStorage.removeItem(DECLINED_KEY);
    } catch {
      // ignore storage failures
    }
    setShow(false);
  }

  function declineAge() {
    try {
      sessionStorage.setItem(DECLINED_KEY, "true");
    } catch {
      // ignore storage failures
    }
    setShow(false);
    if (pathname !== "/") {
      router.push("/");
    }
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="agegate-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4"
    >
      <div className="w-full max-w-md rounded-[2rem] bg-white p-5 sm:p-8 text-center shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
          <span aria-hidden="true">🔞</span>
        </div>

        <h2 id="agegate-title" className="mt-5 text-2xl font-black text-gray-950">
          Are you 18+?
        </h2>
        <p className="mt-3 text-sm leading-6 text-gray-900">
          This website contains adult content and is intended for individuals
          who are 18 years of age or older. Please confirm your age to continue.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={acceptAge}
            className="flex-1 rounded-full bg-gray-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-gray-700"
          >
            Yes, I am 18+
          </button>
          <button
            type="button"
            onClick={declineAge}
            className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-6 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-100"
          >
            No, I&apos;m under 18
          </button>
        </div>
      </div>
    </div>
  );
}
