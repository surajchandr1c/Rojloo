import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, canAccess } from "@/lib/admin-access";
import { getAllLocalAreaSeo, upsertLocalAreaSeo } from "@/lib/models/local-area-seo";

export async function GET(request: NextRequest) {
  const context = await getAdminContext(request);
  if (
    !context ||
    (!canAccess(context, "dynamic-seo") &&
      !canAccess(context, "local-area-seo") &&
      !canAccess(context, "city-seo"))
  ) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json({ seo: await getAllLocalAreaSeo() });
}

export async function POST(request: NextRequest) {
  const context = await getAdminContext(request);
  if (
    !context ||
    (!canAccess(context, "dynamic-seo") &&
      !canAccess(context, "local-area-seo") &&
      !canAccess(context, "city-seo"))
  ) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const citySlug = String(body?.citySlug || "").trim().toLowerCase();
  const areaSlug = String(body?.areaSlug || "").trim().toLowerCase();
  if (!citySlug || !areaSlug) {
    return NextResponse.json(
      { error: "City slug and local-area slug are required." },
      { status: 400 }
    );
  }

  const saved = await upsertLocalAreaSeo({
    citySlug,
    areaSlug,
    slug: areaSlug,
    name: String(body?.name || areaSlug),
    title: String(body?.title || ""),
    description: String(body?.description || ""),
    keywords: String(body?.keywords || body?.primaryKeyword || ""),
    primaryKeyword: String(body?.primaryKeyword || ""),
    secondaryKeywords: Array.isArray(body?.secondaryKeywords) ? body.secondaryKeywords.map(String) : [],
    longTailKeywords: Array.isArray(body?.longTailKeywords) ? body.longTailKeywords.map(String) : [],
    popularSearches: Array.isArray(body?.popularSearches) ? body.popularSearches.map(String) : [],
    canonicalUrl: String(body?.canonicalUrl || ""),
    featuredImage: String(body?.featuredImage || ""),
    imageAlt: String(body?.imageAlt || ""),
    content: Array.isArray(body?.content) ? body.content : [],
    faqs: Array.isArray(body?.faqs) ? body.faqs : [],
    status: body?.status === "published" ? "published" : "draft",
    mode: body?.mode === "individual" ? "individual" : "inherit",
  });

  return NextResponse.json({ success: true, seo: saved });
}
