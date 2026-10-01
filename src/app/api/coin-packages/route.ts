import { NextResponse } from "next/server";
import { getCoinPackages } from "@/lib/models/coin-package";
import { NO_CACHE_HEADERS } from "@/lib/constants/http";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const packages = await getCoinPackages();
    return NextResponse.json(
      { packages, success: true },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("Failed to load coin packages:", error);
    return NextResponse.json(
      { error: "Failed to load coin packages" },
      { status: 500 }
    );
  }
}
