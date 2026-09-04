import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, canAccess } from "@/lib/admin-access";
import {
  listPaymentRequests,
  confirmPaymentRequest,
  declinePaymentRequest,
} from "@/lib/models/payment-request";
import { createPaymentHistory } from "@/lib/models/payment-history";

export async function GET(req: NextRequest) {
  const ctx = await getAdminContext(req);

  if (!ctx || !canAccess(ctx, "payment-request")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = await listPaymentRequests();
  return NextResponse.json({ requests, success: true });
}

export async function POST(req: NextRequest) {
  const ctx = await getAdminContext(req);

  if (!ctx || !canAccess(ctx, "payment-request")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, id, reason, upiId, upiName, userName } = body;

    if (!id || !action) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (action === "confirm") {
      const updated = await confirmPaymentRequest(id);
      if (!updated) {
        return NextResponse.json(
          { error: "Payment request not found" },
          { status: 404 }
        );
      }

      // Create payment history record
      try {
        await createPaymentHistory({
          userEmail: updated.userEmail,
          userName: userName,
          userId: updated.userId,
          transactionId: updated.transactionId,
          upiId: upiId || "manual",
          upiName: upiName,
          coins: updated.coins,
          amount: updated.amount,
          discount: updated.discount,
          finalAmount: Math.max(0, updated.amount - (updated.discount || 0)),
          couponCode: updated.couponCode,
          paymentRequestId: id,
        });
      } catch (err) {
        console.error("Failed to create payment history:", err);
        // Don't fail the entire operation if history creation fails
      }

      return NextResponse.json({ request: updated, success: true });
    } else if (action === "decline") {
      const updated = await declinePaymentRequest(id, reason);
      if (!updated) {
        return NextResponse.json(
          { error: "Payment request not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ request: updated, success: true });
    } else {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Payment request action error:", error);
    return NextResponse.json(
      { error: "Failed to process payment request" },
      { status: 500 }
    );
  }
}
