import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getAllStaticSeo,
  getStaticSeo,
  upsertStaticSeo,
  StaticPageKey,
  STATIC_PAGES,
} from "@/lib/models/static-seo";
import { getAdminContext, canAccess } from "@/lib/admin-access";

const VALID_KEYS = new Set(STATIC_PAGES.map((p) => p.key));

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "static-seo")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page")?.trim().toLowerCase();

  if (page && VALID_KEYS.has(page as StaticPageKey)) {
    const seo = await getStaticSeo(page);
    return NextResponse.json({ seo });
  }

  const allSeo = await getAllStaticSeo();
  return NextResponse.json({ seo: allSeo });
}

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "static-seo")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { pageKey, title, description, keywords, images, content, faqs, status } =
    body ?? {};

  const cleanKey = String(pageKey || "").trim().toLowerCase() as StaticPageKey;
  if (!cleanKey || !VALID_KEYS.has(cleanKey)) {
    return NextResponse.json(
      { error: `Invalid pageKey: "${pageKey}". Must be one of: ${Array.from(VALID_KEYS).join(", ")}` },
      { status: 400 }
    );
  }

  const saved = await upsertStaticSeo({
    pageKey: cleanKey,
    title: typeof title === "string" ? title : undefined,
    description: typeof description === "string" ? description : undefined,
    keywords: typeof keywords === "string" ? keywords : undefined,
    images: Array.isArray(images) ? images : [],
    content: Array.isArray(content) ? content : [],
    faqs: Array.isArray(faqs) ? faqs : [],
    status: status === "published" ? "published" : "draft",
  });

  const pagePath = cleanKey === "home" ? "/" : `/${cleanKey}`;
  try {
    revalidatePath(pagePath);
    revalidatePath("/", "layout");
  } catch (err) {
    console.warn(`[static-seo] revalidatePath failed for ${pagePath}:`, err);
  }

  return NextResponse.json({ success: true, seo: saved });
}
