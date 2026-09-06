import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, canAccess } from "@/lib/admin-access";
import {
  listVipAssignments,
  createVipAssignment,
  updateVipAssignment,
  deleteVipAssignment,
  syncVipStatus,
  extendVipAssignment,
  createVipSetupToken,
} from "@/lib/models/vip";
import { sendVipInviteEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "vip")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const setupEmail = searchParams.get("setupEmail");

  if (setupEmail) {
    const token = await createVipSetupToken(setupEmail);
    const origin = request.nextUrl.origin;
    const setupUrl = `${origin}/vip/create-password?token=${token}&email=${encodeURIComponent(setupEmail)}`;
    return NextResponse.json({ success: true, setupUrl });
  }

  await syncVipStatus();
  const assignments = await listVipAssignments();
  return NextResponse.json({ assignments, success: true });
}

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "vip")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const email = String(body?.email ?? "").trim().toLowerCase();
    const type = (body?.type === "state" ? "state" : "city") as "state" | "city";
    const expiresInDays = Number(body?.expiresInDays ?? 7);
    const origin = request.nextUrl.origin;

    if (!email) {
      return NextResponse.json(
        { error: "VIP owner email is required." },
        { status: 400 }
      );
    }

    const created: Array<{
      _id?: string;
      type: "city" | "state";
      stateName?: string;
      cityName?: string;
      email: string;
      expiresAt: Date;
    }> = [];

    let areaLabel = "";

    if (type === "state") {
      const stateName = String(body?.stateName ?? "").trim();
      if (!stateName) {
        return NextResponse.json(
          { error: "State name is required for state VIP assignment." },
          { status: 400 }
        );
      }

      areaLabel = `State: ${stateName}`;

      const assignment = await createVipAssignment({
        type: "state",
        stateName,
        email,
        assignedBy: ctx.role === "main" ? "main-admin" : ctx.email,
        expiresInDays: Number.isFinite(expiresInDays) && expiresInDays > 0 ? expiresInDays : 7,
      });

      created.push({
        _id: assignment._id,
        type: "state",
        stateName: assignment.stateName,
        email: assignment.email,
        expiresAt: new Date(assignment.expiresAt),
      });
    } else {
      const rawCities = Array.isArray(body?.cities)
        ? body.cities
        : typeof body?.cities === "string"
          ? body.cities.split(",")
          : [body?.cityName];

      const cityEntries = rawCities
        .map((entry: unknown) => String(entry ?? "").trim())
        .filter(Boolean);

      if (cityEntries.length === 0) {
        return NextResponse.json(
          { error: "At least one city name is required." },
          { status: 400 }
        );
      }

      areaLabel = `Cities: ${cityEntries.join(", ")}`;

      for (const cityNameValue of [...new Set(cityEntries)]) {
        const cityName = String(cityNameValue).trim();
        const citySlug = typeof body?.citySlug === "string" && body.citySlug.trim()
          ? String(body.citySlug).trim()
          : cityName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

        const assignment = await createVipAssignment({
          type: "city",
          cityName,
          citySlug,
          email,
          assignedBy: ctx.role === "main" ? "main-admin" : ctx.email,
          expiresInDays: Number.isFinite(expiresInDays) && expiresInDays > 0 ? expiresInDays : 7,
        });

        created.push({
          _id: assignment._id,
          type: "city",
          cityName: assignment.cityName,
          email: assignment.email,
          expiresAt: new Date(assignment.expiresAt),
        });
      }
    }

    // Generate password setup token and links
    const setupToken = await createVipSetupToken(email);
    const createPasswordUrl = `${origin}/vip/create-password?token=${setupToken}&email=${encodeURIComponent(email)}`;
    const loginUrl = `${origin}/vip/login`;

    const latestExpiry = created[0]?.expiresAt || new Date();

    // Send invitation email with create password link
    await sendVipInviteEmail({
      to: email,
      areaLabel,
      createPasswordUrl,
      loginUrl,
      expiresAt: latestExpiry,
    });

    return NextResponse.json(
      {
        success: true,
        assignments: created,
        setupUrl: createPasswordUrl,
        loginUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("createVipAssignment failed:", error);
    return NextResponse.json(
      { error: "Failed to assign VIP control." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "vip")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const id = body?.id;
    const extendDays = Number(body?.extendDays ?? 0);
    const active = typeof body?.active === "boolean" ? body.active : null;
    const status = body?.status;

    if (!id) {
      return NextResponse.json({ error: "VIP id is required." }, { status: 400 });
    }

    if (Number.isFinite(extendDays) && extendDays !== 0) {
      const updated = await extendVipAssignment(String(id), extendDays);
      if (!updated) {
        return NextResponse.json({ error: "VIP assignment not found." }, { status: 404 });
      }
      return NextResponse.json({ success: true, assignment: updated });
    }

    if (status && (status === "active" || status === "inactive" || status === "expired")) {
      const nextStatus = status === "expired" ? "inactive" : status;
      const updated = await updateVipAssignment(String(id), { status: nextStatus });
      if (!updated) {
        return NextResponse.json({ error: "VIP assignment not found." }, { status: 404 });
      }
      return NextResponse.json({ success: true, assignment: updated });
    }

    if (active === null) {
      return NextResponse.json({ error: "VIP status update is required." }, { status: 400 });
    }

    const updated = await updateVipAssignment(String(id), { status: active ? "active" : "inactive" });
    if (!updated) {
      return NextResponse.json({ error: "VIP assignment not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, assignment: updated });
  } catch (error) {
    console.error("updateVipAssignment failed:", error);
    return NextResponse.json({ error: "Failed to update VIP assignment." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "vip")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const id = body?.id;

    if (!id) {
      return NextResponse.json({ error: "VIP id is required." }, { status: 400 });
    }

    const ok = await deleteVipAssignment(String(id));
    if (!ok) {
      return NextResponse.json({ error: "VIP assignment not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("deleteVipAssignment failed:", error);
    return NextResponse.json({ error: "Failed to delete VIP assignment." }, { status: 500 });
  }
}
