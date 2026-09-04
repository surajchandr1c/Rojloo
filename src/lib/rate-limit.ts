import "server-only";

// Simple in-memory sliding-window rate limiter.
//
// NOTE: This is per-serverless-instance. On Vercel, multiple instances can
// run concurrently so this isn't a hard global limit — but it still provides
// meaningful protection against burst/brute-force within a single instance and
// costs nothing extra. For a hard global limit, swap in a shared store such as
// Upstash Redis or Vercel KV.
//
// Keyed by IP (and optionally extra scope like email).

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs = WINDOW_MS
): { ok: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  // Drop timestamps outside the window.
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0];
    const retryAfterMs = Math.max(0, oldest + windowMs - now);
    return { ok: false, remaining: 0, retryAfterMs };
  }

  bucket.timestamps.push(now);

  // Prevent unbounded growth of the map (simple cleanup).
  if (buckets.size > 10000) {
    const now2 = Date.now();
    for (const [k, v] of buckets) {
      v.timestamps = v.timestamps.filter((t) => now2 - t < windowMs);
      if (v.timestamps.length === 0) buckets.delete(k);
    }
  }

  return { ok: true, remaining: limit - bucket.timestamps.length, retryAfterMs: 0 };
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
