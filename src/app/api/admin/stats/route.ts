import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-access";
import { listUsers } from "@/lib/models/user";
import { listAllAds } from "@/lib/models/ad";
import { listAllCities } from "@/lib/models/city";
import { listStates } from "@/lib/models/state";
import { listSubAdmins } from "@/lib/models/admin-user";
import { listUPIs } from "@/lib/models/upi";
import { listCoupons } from "@/lib/models/coupon";
import { listPaymentRequests } from "@/lib/models/payment-request";
import { listPaymentHistory } from "@/lib/models/payment-history";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAdminContext(request);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const [
      users,
      ads,
      cities,
      states,
      subAdmins,
      upis,
      coupons,
      paymentRequests,
      paymentHistory,
    ] = await Promise.all([
      listUsers().catch(() => []),
      listAllAds().catch(() => []),
      listAllCities().catch(() => []),
      listStates().catch(() => []),
      listSubAdmins().catch(() => []),
      listUPIs().catch(() => []),
      listCoupons().catch(() => []),
      listPaymentRequests().catch(() => []),
      listPaymentHistory().catch(() => []),
    ]);

    const activeCoupons = coupons.filter((c) => Boolean(c.active)).length;
    const pendingPayments = paymentRequests.filter(
      (r) => r.status === "pending"
    ).length;
    const confirmedPayments = paymentRequests.filter(
      (r) => r.status === "confirmed"
    ).length;
    const declinedPayments = paymentRequests.filter(
      (r) => r.status === "declined"
    ).length;

    const totalAmountAfterDiscount = paymentHistory.reduce((sum, item) => {
      const finalAmount =
        typeof item.finalAmount === "number"
          ? item.finalAmount
          : Math.max(0, (item.amount ?? 0) - (item.discount ?? 0));
      return sum + finalAmount;
    }, 0);

    const totalCoinsSold = paymentHistory.reduce(
      (sum, item) => sum + (item.coins ?? 0),
      0
    );

    return NextResponse.json({
      users: users.length,
      ads: ads.length,
      cities: cities.length,
      states: states.length,
      subAdmins: subAdmins.length,
      upiTotal: upis.length,
      activeCoupons,
      pendingPayments,
      confirmedPayments,
      declinedPayments,
      totalAmountAfterDiscount,
      totalCoinsSold,
    });
  } catch (error) {
    console.error("[admin/stats] GET error:", error);
    return NextResponse.json(
      { error: "Unable to load dashboard statistics." },
      { status: 500 }
    );
  }
}
