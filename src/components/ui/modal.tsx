"use client";

import React, { useEffect, useCallback, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  headerExtra?: ReactNode;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
  className?: string;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
}

const maxWidthMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  full: "max-w-5xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  headerExtra,
  children,
  maxWidth = "lg",
  className = "",
  showCloseButton = true,
  closeOnBackdropClick = true,
}: ModalProps) {
  // Handle ESC key press
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener("keydown", handleKeyDown);
    // Prevent background scrolling while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-modal-backdrop overflow-y-auto"
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          "relative w-full rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 animate-modal-content",
          maxWidthMap[maxWidth] || maxWidthMap.lg,
          className
        )}
      >
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between border-b border-gray-100 pb-4">
            <div>
              {title && (
                typeof title === "string" ? (
                  <h2 className="text-xl font-bold text-gray-950">{title}</h2>
                ) : (
                  title
                )
              )}
              {description && (
                <p className="mt-1 text-xs text-gray-700">{description}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {headerExtra}
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
                  aria-label="Close dialog"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
