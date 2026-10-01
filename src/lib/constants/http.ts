/**
 * Shared HTTP headers and constants.
 */

/**
 * Standard headers to completely disable caching on dynamic admin and transactional API responses.
 */
export const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;
