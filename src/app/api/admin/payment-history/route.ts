import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, canAccess } from "@/lib/admin-access";
import { listPaymentHistory } from "@/lib/models/payment-history";

export async function GET(req: NextRequest) {
  const ctx = await getAdminContext(req);

  if (!ctx || !canAccess(ctx, "payment-history")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const history = await listPaymentHistory();
    return NextResponse.json({ history, success: true });
  } catch (error) {
    console.error("Failed to fetch payment history:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment history" },
      { status: 500 }
    );
  }
}
