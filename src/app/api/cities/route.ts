import { NextRequest, NextResponse } from "next/server";
import { listAllCities } from "@/lib/models/city";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stateFilter = searchParams.get("state")?.trim().toLowerCase();

  try {
    let cities = await listAllCities();
    if (stateFilter) {
      cities = cities.filter(
        (c) =>
          c.state?.trim().toLowerCase() === stateFilter ||
          c.region?.trim().toLowerCase() === stateFilter
      );
    }
    return NextResponse.json({ cities });
  } catch (error) {
    console.error("[cities] GET error:", error);
    return NextResponse.json(
      { error: "Unable to load cities." },
      { status: 500 }
    );
  }
}
