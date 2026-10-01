"use client";

import { useEffect, useState } from "react";

/**
 * Custom hook to debounce rapidly changing values (such as search queries and form inputs).
 *
 * @param value The input value to debounce.
 * @param delayMs Delay in milliseconds (default: 300ms).
 * @returns The debounced value.
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
