import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "crypto";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 10 * 1000; // 10 seconds

function cleanEnv(val?: string): string {
  return (val ?? "").trim().replace(/^['"]|['"]$/g, "");
}

// Server-side secret used to create an HMAC binding the OTP to the user email.
// Falling back to JWT_SECRET keeps a single secret in environments that don't
// define a dedicated OTP secret.
export function otpHashSecret(): string {
  const secret = cleanEnv(process.env.OTP_HASH_SECRET) || cleanEnv(process.env.JWT_SECRET);
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("[otp] CRITICAL: Neither OTP_HASH_SECRET nor JWT_SECRET is configured in environment variables.");
  }
  return "rojlo-dev-local-otp-hmac-secret-key-do-not-use-in-production";
}

/**
 * Generate a cryptographically secure 6-digit OTP.
 */
export function generateOtp(): string {
  // randomInt(0, 1_000_000) returns a uniformly distributed value in [0, 1e6).
  // Pad with leading zeros so the result is always exactly 6 digits.
  return String(randomInt(0, 1_000_000)).padStart(OTP_LENGTH, "0");
}

/**
 * HMAC the OTP with the user's email so a stored hash cannot be used against a
 * different account and cannot be brute-forced without the server secret.
 */
export function hashOtp(otp: string, email: string): string {
  return createHmac("sha256", otpHashSecret())
    .update(`${email.trim().toLowerCase()}:${otp}`)
    .digest("hex");
}

/**
 * Constant-time comparison of the candidate OTP hash against expected hash.
 */
export function verifyOtp(candidate: string, expectedHash: string, email: string): boolean {
  const candidateHash = hashOtp(candidate, email);
  if (candidateHash.length !== expectedHash.length) return false;

  try {
    const a = Buffer.from(candidateHash, "hex");
    const b = Buffer.from(expectedHash, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
