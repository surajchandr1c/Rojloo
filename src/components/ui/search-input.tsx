"use client";

import React, { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  containerClassName?: string;
  showIcon?: boolean;
}

export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = "Search...",
  containerClassName = "",
  className = "",
  showIcon = true,
  disabled,
  ...props
}: SearchInputProps) {
  const handleClear = () => {
    onChange("");
    onClear?.();
  };

  return (
    <div className={cn("relative w-full", containerClassName)}>
      {showIcon && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      )}

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "w-full rounded-xl border border-gray-200 bg-white py-2.5 text-sm text-gray-950 placeholder-gray-400 outline-none transition focus:border-gray-500 shadow-2xs",
          showIcon ? "pl-9 pr-8" : "pl-3.5 pr-8",
          disabled && "opacity-60 cursor-not-allowed bg-gray-50",
          className
        )}
        {...props}
      />

      {value && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer text-xs leading-none"
          aria-label="Clear search query"
          title="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default SearchInput;
