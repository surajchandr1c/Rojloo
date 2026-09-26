import { NextRequest, NextResponse } from "next/server";
import {
  listLocalAreas,
  createLocalArea,
  updateLocalAreaName,
  deleteLocalArea,
} from "@/lib/models/localArea";
import { getAdminContext, canAccess } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (
    !ctx ||
    (!canAccess(ctx, "city") &&
      !canAccess(ctx, "state") &&
      !canAccess(ctx, "city-seo") &&
      !canAccess(ctx, "dynamic-seo") &&
      !canAccess(ctx, "local-area-seo"))
  ) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cityName = searchParams.get("cityName") || undefined;
  const citySlug = searchParams.get("citySlug") || undefined;
  const stateName = searchParams.get("stateName") || undefined;

  try {
    const localAreas = await listLocalAreas({ cityName, citySlug, stateName });
    return NextResponse.json({ localAreas }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("listLocalAreas failed:", error);
    return NextResponse.json(
      { error: "Failed to list local areas." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || (!canAccess(ctx, "city") && !canAccess(ctx, "state"))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { name, cityName, stateName } = body ?? {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json(
      { error: "Local area name is required." },
      { status: 400 }
    );
  }

  if (!cityName || typeof cityName !== "string" || !cityName.trim()) {
    return NextResponse.json(
      { error: "City name is required." },
      { status: 400 }
    );
  }

  try {
    const localArea = await createLocalArea({
      name: String(name),
      cityName: String(cityName),
      stateName: stateName ? String(stateName) : undefined,
    });
    return NextResponse.json(
      { success: true, localArea },
      { status: 201, headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("createLocalArea failed:", error);
    return NextResponse.json(
      { error: "Failed to create local area." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || (!canAccess(ctx, "city") && !canAccess(ctx, "state"))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = body?.id;
  const name = body?.name;
  const cityName = body?.cityName;

  if (!id && !name) {
    return NextResponse.json(
      { error: "Local area id or name is required." },
      { status: 400 }
    );
  }

  try {
    const ok = await deleteLocalArea({
      id: id ? String(id) : undefined,
      name: name ? String(name) : undefined,
      cityName: cityName ? String(cityName) : undefined,
    });
    if (!ok) {
      return NextResponse.json(
        { error: "Local area not found." },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("deleteLocalArea failed:", error);
    return NextResponse.json(
      { error: "Failed to delete local area." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || (!canAccess(ctx, "city") && !canAccess(ctx, "state"))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { id, oldName, cityName, newName } = body ?? {};

  if ((!id && !oldName) || !newName || typeof newName !== "string" || !newName.trim()) {
    return NextResponse.json(
      { error: "Local area ID or name and new name are required." },
      { status: 400 }
    );
  }

  try {
    const updated = await updateLocalAreaName({
      id: id ? String(id) : undefined,
      oldName: oldName ? String(oldName) : undefined,
      cityName: cityName ? String(cityName) : undefined,
      newName: String(newName).trim(),
    });
    return NextResponse.json({ success: true, localArea: updated });
  } catch (error) {
    console.error("updateLocalAreaName failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update local area." },
      { status: 500 }
    );
  }
}
