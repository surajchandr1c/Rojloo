import { NextResponse } from "next/server";
import { listStates } from "@/lib/models/state";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const states = await listStates();
    return NextResponse.json({ states });
  } catch (error) {
    console.error("[states] GET error:", error);
    return NextResponse.json(
      { error: "Unable to load states." },
      { status: 500 }
    );
  }
}
