import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, canAccess } from "@/lib/admin-access";
import { getCoinPackages, saveCoinPackages } from "@/lib/models/coin-package";

export async function GET(req: NextRequest) {
  const ctx = await getAdminContext(req);

  if (!ctx || !canAccess(ctx, "set-coins")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const packages = await getCoinPackages();
    return NextResponse.json({ packages, success: true });
  } catch (error) {
    console.error("Failed to fetch coin packages:", error);
    return NextResponse.json(
      { error: "Failed to fetch coin packages" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getAdminContext(req);

  if (!ctx || !canAccess(ctx, "set-coins")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const packages = Array.isArray(body?.packages) ? body.packages : [];

    if (packages.length === 0) {
      return NextResponse.json(
        { error: "At least one coin package is required" },
        { status: 400 }
      );
    }

    const saved = await saveCoinPackages(packages);
    return NextResponse.json({ packages: saved, success: true });
  } catch (error) {
    console.error("Failed to save coin packages:", error);
    return NextResponse.json(
      { error: "Failed to save coin packages" },
      { status: 500 }
    );
  }
}
