import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-access";
import { findUserById, findUserBySessionToken } from "@/lib/models/user";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

async function isAuthorizedUploader(request: NextRequest): Promise<boolean> {
  const admin = await getAdminContext(request);
  if (admin) return true;

  const raw = request.cookies.get("rojlo_auth")?.value;
  if (!raw) return false;

  if (await findUserBySessionToken(raw)) return true;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (parsed && parsed._id) {
      return Boolean(await findUserById(String(parsed._id)));
    }
  } catch {
    if (await findUserById(raw)) return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthorizedUploader(request))) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "An image file is required." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed." },
        { status: 400 }
      );
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be 8 MB or smaller." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const url = await uploadImageToCloudinary(buffer);

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload image." },
      { status: 500 }
    );
  }
}
