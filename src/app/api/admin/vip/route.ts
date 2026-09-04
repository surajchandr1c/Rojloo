import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, canAccess } from "@/lib/admin-access";
import {
  listVipAssignments,
  createVipAssignment,
  updateVipAssignment,
  deleteVipAssignment,
  syncVipStatus,
  extendVipAssignment,
} from "@/lib/models/vip";
import { sendEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "vip")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
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
    const email = body?.email;
    const expiresInDays = Number(body?.expiresInDays ?? 7);

    const rawCities = Array.isArray(body?.cities)
      ? body.cities
      : typeof body?.cities === "string"
        ? body.cities.split(",")
        : [body?.cityName];

    const cityEntries = rawCities
      .map((entry: unknown) => String(entry ?? "").trim())
      .filter(Boolean);

    if (cityEntries.length === 0 || !email) {
      return NextResponse.json(
        { error: "At least one city and an email are required." },
        { status: 400 }
      );
    }

    const created: Array<{
      cityName: string;
      email: string;
      expiresAt: Date;
      citySlug?: string;
    }> = [];

    for (const cityNameValue of [...new Set(cityEntries)]) {
      const cityName = String(cityNameValue).trim();
      const citySlug = typeof body?.citySlug === "string" && body.citySlug.trim()
        ? String(body.citySlug).trim()
        : cityName.trim();

      const assignment = await createVipAssignment({
        cityName: String(cityName),
        citySlug: citySlug ? String(citySlug) : undefined,
        email: String(email),
        assignedBy: ctx.role === "main" ? "main-admin" : ctx.email,
        expiresInDays: Number.isFinite(expiresInDays) && expiresInDays > 0 ? expiresInDays : 7,
      });

      created.push({
        cityName: assignment.cityName,
        email: assignment.email,
        expiresAt: new Date(assignment.expiresAt),
        citySlug: assignment.citySlug,
      });

      const message = [
        `Hello,`,
        "",
        `You have been assigned city control for ${assignment.cityName}.`,
        `This access is valid until ${new Date(assignment.expiresAt).toLocaleString()}.`,
        "Please contact the admin team to extend this access before expiry.",
        "",
        "Regards,",
        "Rojlo Admin Team",
      ].join("\n");

      await sendEmail({
        to: assignment.email,
        subject: `City access confirmation for ${assignment.cityName}`,
        text: message,
        html: `<p>Hello,</p><p>You have been assigned city control for <strong>${assignment.cityName}</strong>.</p><p>This access is valid until <strong>${new Date(assignment.expiresAt).toLocaleString()}</strong>.</p><p>Please contact the admin team to extend this access before expiry.</p><p>Regards,<br/>Rojlo Admin Team</p>`,
      });
    }

    return NextResponse.json({ success: true, assignments: created }, { status: 201 });
  } catch (error) {
    console.error("createVipAssignment failed:", error);
    return NextResponse.json(
      { error: "Failed to assign city VIP control." },
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
