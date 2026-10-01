import { NextResponse } from "next/server";
import { getPromotionPackages } from "@/lib/models/promotion-package";
import { getAllPackagesCoins } from "@/lib/models/coin-package";
import { NO_CACHE_HEADERS } from "@/lib/constants/http";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const packages = await getPromotionPackages();
    const allPackagesCoins = await getAllPackagesCoins();
    return NextResponse.json(
      { packages, allPackagesCoins, success: true },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("Failed to fetch public promotion packages:", error);
    return NextResponse.json(
      { error: "Failed to fetch promotion packages" },
      { status: 500 }
    );
  }
}
