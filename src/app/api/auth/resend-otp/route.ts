import { NextRequest, NextResponse } from "next/server";
import {
  findUserByEmail,
  normalizeEmail,
} from "@/lib/models/user";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import {
  createAndSendOtp,
  otpCooldownRemainingMs,
} from "@/lib/verification";

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rate = checkRateLimit(`resend-otp:${ip}`, 5);
    if (!rate.ok) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again in a few minutes.",
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email } = body ?? {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const existing = await findUserByEmail(normalizedEmail);
    if (!existing || !existing._id || existing.emailVerified === true) {
      // Do not reveal whether an email exists or is already verified.
      return NextResponse.json(
        { message: "If that email was pending verification, a new code has been sent." },
        { status: 200 }
      );
    }

    const now = new Date();
    const cooldown = otpCooldownRemainingMs(existing.otpLastSentAt, now);
    if (cooldown > 0) {
      return NextResponse.json(
        {
          error: `Please wait ${Math.ceil(cooldown / 1000)} seconds before requesting a new code.`,
          resendInMs: cooldown,
        },
        { status: 429 }
      );
    }

    const otpResult = await createAndSendOtp(existing._id, normalizedEmail, now);
    if (!otpResult.ok) {
      return NextResponse.json({ error: otpResult.error }, { status: otpResult.status });
    }

    return NextResponse.json(
      {
        message: otpResult.sent
          ? "A new verification code has been sent to your email."
          : "We couldn't send the code right now. Please check your connection and try again.",
        emailSent: otpResult.sent,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[resend-otp] Error details:", {
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
      { error: "Unable to resend the verification code. Please try again." },
      { status: 500 }
    );
  }
}
