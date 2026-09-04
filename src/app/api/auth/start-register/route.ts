import { NextRequest, NextResponse } from "next/server";
import {
  createUser,
  findUserByEmail,
  normalizeEmail,
} from "@/lib/models/user";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import {
  createAndSendOtp,
  otpCooldownRemainingMs,
} from "@/lib/verification";

/**
 * Step 1 of the signup flow: the user enters their email. This reserves the
 * email (as a pending, email-only user if not already registered), sends an OTP,
 * and returns `needsVerification` so the client can show the OTP step.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rate = checkRateLimit(`start-register:${ip}`, 5);
    if (!rate.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a few minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email } = body ?? {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const existing = await findUserByEmail(normalizedEmail);

    if (existing && existing.emailVerified !== false) {
      // Already verified (active or completed) → do not create another account.
      return NextResponse.json(
        { error: "An account with this email already exists. Please log in." },
        { status: 409 }
      );
    }

    const now = new Date();

    let userId: string;
    if (existing && existing._id) {
      // Pending registration already started → enforce the resend cooldown.
      userId = existing._id;
      const cooldown = otpCooldownRemainingMs(existing.otpLastSentAt, now);
      if (cooldown > 0) {
        return NextResponse.json(
          {
            error: `Please wait ${Math.ceil(cooldown / 1000)} seconds before requesting a new code.`,
            needsVerification: true,
            email: normalizedEmail,
            resendInMs: cooldown,
          },
          { status: 429 }
        );
      }
    } else {
      // Create a pending, email-only user. Password/name/service are added on
      // the final signup step once the OTP has been verified.
      const user = await createUser({
        name: "",
        email: normalizedEmail,
        passwordHash: "",
        emailVerified: false,
      });
      if (!user._id) {
        return NextResponse.json(
          { error: "Unable to start registration. Please try again." },
          { status: 500 }
        );
      }
      userId = user._id;
    }

    const otpResult = await createAndSendOtp(userId, normalizedEmail, now);
    if (!otpResult.ok) {
      return NextResponse.json({ error: otpResult.error }, { status: otpResult.status });
    }

    return NextResponse.json(
      {
        message: otpResult.sent
          ? "We sent a verification code to your email."
          : "We couldn't send the verification code right now. Please try Resend below.",
        needsVerification: true,
        email: normalizedEmail,
        emailSent: otpResult.sent,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[start-register] Error details:", {
      message: errorMsg,
      name: error instanceof Error ? error.name : "Unknown",
    });

    const isStorageError =
      errorMsg.includes("EROFS") ||
      errorMsg.includes("EACCES") ||
      errorMsg.includes("EPERM") ||
      errorMsg.includes("writeStore");

    const isDbConnectionError =
      errorMsg.includes("MongoDB") ||
      errorMsg.includes("ECONNREFUSED") ||
      errorMsg.includes("ETIMEDOUT") ||
      errorMsg.includes("MongoNetworkError") ||
      errorMsg.includes("MongoServerSelectionError") ||
      errorMsg.includes("ENOTFOUND") ||
      errorMsg.includes("getaddrinfo");

    if (isStorageError || isDbConnectionError) {
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Unable to start registration. Please try again." },
      { status: 500 }
    );
  }
}
