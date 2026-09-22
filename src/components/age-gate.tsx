"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "rojlo_age_verified";

export default function AgeGate() {
  const [show, setShow] = useState(false);
  const [declined, setDeclined] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const acceptBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let verified = false;
    try {
      verified = localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      verified = false;
    }

    if (!verified) {
      setShow(true);
    }
  }, []);

  useEffect(() => {
    if (!show) {
      document.body.classList.remove("age-gate-locked");
      return;
    }

    // Always scroll to top so the popup is centered directly over the hero section
    window.scrollTo({ top: 0, behavior: "instant" });

    // Lock page scrolling and interaction
    document.body.classList.add("age-gate-locked");
    const origBodyOverflow = document.body.style.overflow;
    const origHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    // Focus the 18+ button
    const focusTimer = setTimeout(() => {
      acceptBtnRef.current?.focus();
    }, 80);

    const preventScroll = (e: Event) => {
      if (modalRef.current && modalRef.current.contains(e.target as Node)) {
        return; // Allow scrolling inside the modal card if viewport is very short
      }
      e.preventDefault();
      e.stopPropagation();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        return; // Never allow closing via Escape key
      }

      // Prevent scrolling with keys
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Space"].includes(e.code)) {
        if (!modalRef.current || !modalRef.current.contains(e.target as Node)) {
          e.preventDefault();
        }
      }

      // Trap tab focus inside the modal dialog
      if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length > 0) {
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("wheel", preventScroll, { passive: false });
    window.addEventListener("touchmove", preventScroll, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.body.classList.remove("age-gate-locked");
      document.body.style.overflow = origBodyOverflow;
      document.documentElement.style.overflow = origHtmlOverflow;
      window.removeEventListener("wheel", preventScroll);
      window.removeEventListener("touchmove", preventScroll);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [show]);

  function acceptAge() {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore storage error
    }
    document.body.classList.remove("age-gate-locked");
    setShow(false);
  }

  function declineAge() {
    setDeclined(true);
    // Immediately redirect away from the website
    setTimeout(() => {
      window.location.href = "https://www.google.com";
    }, 500);
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="agegate-title"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-modal-backdrop select-none"
      onClick={(e) => {
        // Stop any click propagation to prevent clicking underlying elements
        e.stopPropagation();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-[2.25rem] border border-white/10 bg-white p-6 sm:p-8 text-center shadow-2xl animate-modal-content max-h-[92vh] overflow-y-auto"
      >
        {declined ? (
          <div className="py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">
              <span aria-hidden="true">🚫</span>
            </div>
            <h2 className="mt-4 text-2xl font-black text-gray-950">
              Access Denied
            </h2>
            <p className="mt-2 text-sm text-gray-700 leading-relaxed">
              You must be 18 years of age or older to enter this website.
              Redirecting you away...
            </p>
          </div>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 border border-red-200 text-3xl shadow-inner">
              <span aria-hidden="true">🔞</span>
            </div>

            <span className="mt-4 inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-black tracking-wide text-red-700 uppercase">
              Adult Content (18+)
            </span>

            <h2
              id="agegate-title"
              className="mt-3 text-2xl font-black text-gray-950 tracking-tight"
            >
              Are you 18 or older?
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-800">
              This website contains adult-oriented services and escort listings
              intended exclusively for adults. You must confirm you are 18+ to
              enter and view this website.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                ref={acceptBtnRef}
                type="button"
                onClick={acceptAge}
                className="flex-1 rounded-full bg-gray-950 px-6 py-3.5 text-sm font-black !text-white transition-all hover:bg-black active:scale-[0.98] shadow-md hover:shadow-lg cursor-pointer"
              >
                I&apos;m 18+
              </button>
              <button
                type="button"
                onClick={declineAge}
                className="flex-1 rounded-full border border-gray-300 bg-gray-100 px-6 py-3.5 text-sm font-bold text-gray-700 transition-all hover:bg-gray-200 active:scale-[0.98] cursor-pointer"
              >
                Under 18 (Exit)
              </button>
            </div>
            <p className="mt-4 text-[11px] text-gray-600">
              By clicking &ldquo;I&apos;m 18+&rdquo;, you confirm that you are at
              least 18 years of age.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
