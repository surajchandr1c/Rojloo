import { NextResponse } from "next/server";
import { getCoinPackages } from "@/lib/models/coin-package";

export async function GET() {
  try {
    const packages = await getCoinPackages();
    return NextResponse.json({ packages, success: true });
  } catch (error) {
    console.error("Failed to load coin packages:", error);
    return NextResponse.json(
      { error: "Failed to load coin packages" },
      { status: 500 }
    );
  }
}
