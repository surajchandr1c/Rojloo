import { NextRequest, NextResponse } from "next/server";
import { findUserBySessionToken } from "@/lib/models/user";
import {
  createPaymentRequest,
  listPaymentRequests,
} from "@/lib/models/payment-request";

export async function GET(req: NextRequest) {
  try {
    const raw = req.cookies.get("rojlo_auth")?.value;
    if (!raw) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await findUserBySessionToken(raw);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requests = await listPaymentRequests();
    const myRequests = requests.filter((request) => request.userId === user._id);

    return NextResponse.json({ requests: myRequests, success: true });
  } catch (error) {
    console.error("Payment history fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch payment history" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = req.cookies.get("rojlo_auth")?.value;

    if (!raw) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await findUserBySessionToken(raw);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { coins, amount, transactionId, couponCode, discount } = body;

    if (!transactionId || !coins || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const coinCount = Number(coins);
    const amountValue = Number(amount);

    // Basic sanity validation to prevent negative/zero/abusive values.
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

    // Deduplicate: reject an already-used transaction id.
    const existing = await listPaymentRequests();
    const duplicate = existing.some(
      (r) => r.transactionId === String(transactionId)
    );
    if (duplicate) {
      return NextResponse.json(
        { error: "This transaction has already been recorded." },
        { status: 409 }
      );
    }

    const paymentRequest = await createPaymentRequest({
      userEmail: user.email,
      userId: user._id ?? "",
      transactionId: String(transactionId),
      coins: coinCount,
      amount: amountValue,
      discount: discount ? Number(discount) : undefined,
      couponCode: couponCode || undefined,
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
