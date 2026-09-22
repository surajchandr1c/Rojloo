import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { checkCoinPurchaseEligibility } from "@/lib/models/payment-request";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    let email = "";
    const user = await getAuthenticatedUser(req);
    if (user?.email) {
      email = String(user.email).toLowerCase().trim();
    }

    const queryEmail = req.nextUrl.searchParams.get("email");
    if (!email && queryEmail) {
      email = String(queryEmail).toLowerCase().trim();
    }

    if (!email) {
      return NextResponse.json({ error: "Unauthorized: email required" }, { status: 401 });
    }

    const eligibility = await checkCoinPurchaseEligibility(email);

    return NextResponse.json(
      {
        success: true,
        email,
        ...eligibility,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("[eligibility] error checking coin purchase eligibility:", error);
    return NextResponse.json(
      { error: "Failed to check coin purchase eligibility" },
      { status: 500 }
    );
  }
}
