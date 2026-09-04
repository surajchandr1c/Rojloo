import { NextRequest, NextResponse } from "next/server";
import {
  clearUserOtp,
  findUserByEmail,
  incrementUserOtpAttempts,
  normalizeEmail,
} from "@/lib/models/user";
import { OTP_MAX_ATTEMPTS } from "@/lib/otp";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { generateJWT } from "@/lib/jwt";
import { verifyOtp } from "@/lib/otp";

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rate = checkRateLimit(`verify-otp:${ip}`, 10);
    if (!rate.ok) {
      return NextResponse.json(
        {
          error: "Too many verification attempts. Please try again in a few minutes.",
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, otp } = body ?? {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: "Enter the 6-digit verification code." },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(normalizedEmail);

    // Do not reveal whether the email exists.
    if (!user || !user._id || user.emailVerified === true) {
      return NextResponse.json(
        { error: "Invalid verification code." },
        { status: 400 }
      );
    }

    const now = new Date();

    // Expired OTP — clear it and ask for a new one.
    if (!user.otpHash || !user.otpExpires || new Date(user.otpExpires).getTime() < now.getTime()) {
      await clearUserOtp(user._id);
      return NextResponse.json(
        { error: "This verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    // Too many failed attempts — invalidate and require a new OTP.
    if (Number(user.otpAttempts ?? 0) >= OTP_MAX_ATTEMPTS) {
      await clearUserOtp(user._id);
      return NextResponse.json(
        { error: "Too many incorrect attempts. Please request a new code." },
        { status: 429 }
      );
    }

    if (!verifyOtp(otp, user.otpHash, normalizedEmail)) {
      const attempts = await incrementUserOtpAttempts(user._id);
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await clearUserOtp(user._id);
        return NextResponse.json(
          { error: "Too many incorrect attempts. Please request a new code." },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: "Invalid verification code." },
        { status: 400 }
      );
    }

    // OTP correct → the email is proven. Invalidate the OTP and issue a
    // short-lived signup token so the final step ("create account") can be
    // completed only by someone who verified this email. We do NOT create the
    // account or start a session here (password/name aren't known yet).
    await clearUserOtp(user._id);

    const signupToken = generateJWT({
      _id: user._id,
      email: user.email,
      name: "signup",
      purpose: "signup",
    });

    return NextResponse.json({
      message: "Email verified successfully.",
      otpVerified: true,
      email: user.email,
      signupToken,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[verify-otp] Error details:", {
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
      { error: "Unable to verify the code. Please try again." },
      { status: 500 }
    );
  }
}
