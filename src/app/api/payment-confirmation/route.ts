import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import {
  createPaymentRequest,
  findPaymentRequestByTransactionId,
  listPaymentRequestsByUser,
  checkCoinPurchaseEligibility,
} from "@/lib/models/payment-request";
import { getCoinPackages } from "@/lib/models/coin-package";
import { calculateDiscount } from "@/lib/models/coupon";
import { checkRateLimitAsync, clientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userIdStr = String(user._id || "");
    const userEmailStr = (user.email || "").toLowerCase();

    const myRequests = await listPaymentRequestsByUser(userIdStr, userEmailStr);

    return NextResponse.json({ requests: myRequests, success: true });
  } catch (error) {
    console.error("Payment history fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch payment history" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const rate = await checkRateLimitAsync(`payment-submit:${ip}`, 10, 60 * 1000);
    if (!rate.ok) {
      return NextResponse.json(
        { error: "Too many payment submissions. Please wait a moment." },
        { status: 429 }
      );
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { coins, amount, transactionId, couponCode } = body;

    if (!transactionId || !coins || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const coinCount = Number(coins);
    const amountValue = Number(amount);

    if (!Number.isFinite(coinCount) || coinCount <= 0) {
      return NextResponse.json(
        { error: "Invalid coins value" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return NextResponse.json(
        { error: "Invalid amount value" },
        { status: 400 }
      );
    }

    // Validate that the requested coins match an official configured package
    const packages = await getCoinPackages();
    const matchedPkg = packages.find((p) => Number(p.coins) === coinCount);
    if (!matchedPkg) {
      return NextResponse.json(
        { error: "Invalid coin package selected." },
        { status: 400 }
      );
    }

    const expectedBaseAmount = Number(matchedPkg.price);
    let expectedFinalAmount = expectedBaseAmount;
    let expectedDiscount = 0;

    if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
      const discountCalc = await calculateDiscount(couponCode.trim(), expectedBaseAmount);
      if (discountCalc) {
        expectedFinalAmount = discountCalc.finalAmount;
        expectedDiscount = discountCalc.discount;
      }
    }

    // Verify payment amount matches (allowing up to 1 INR margin for rounding)
    if (Math.abs(amountValue - expectedFinalAmount) > 1) {
      return NextResponse.json(
        { error: "Payment amount does not match package price." },
        { status: 400 }
      );
    }

    // Deduplicate: reject an already-used transaction id using direct indexed query
    const existing = await findPaymentRequestByTransactionId(String(transactionId).trim());
    if (existing) {
      return NextResponse.json(
        { error: "This transaction has already been recorded." },
        { status: 409 }
      );
    }

    // 24-Hour Purchase Limit: Each email can only purchase coins once every 24 hours
    const eligibility = await checkCoinPurchaseEligibility(user.email);
    if (!eligibility.allowed) {
      return NextResponse.json(
        {
          error: `You can only purchase coins once every 24 hours on this email. Please wait ${eligibility.remainingFormatted} before purchasing again.`,
          remainingMs: eligibility.remainingMs,
          remainingFormatted: eligibility.remainingFormatted,
          nextAllowedAt: eligibility.nextAllowedAt,
        },
        { status: 403 }
      );
    }

    const paymentRequest = await createPaymentRequest({
      userEmail: user.email.toLowerCase(),
      userId: String(user._id || ""),
      transactionId: String(transactionId).trim(),
      coins: matchedPkg.coins,
      amount: expectedFinalAmount,
      discount: expectedDiscount > 0 ? expectedDiscount : undefined,
      couponCode: couponCode ? String(couponCode).trim() : undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Payment recorded successfully",
      paymentRequest,
    });
  } catch (error) {
    console.error("Payment confirmation error:", error);
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    );
  }
}
