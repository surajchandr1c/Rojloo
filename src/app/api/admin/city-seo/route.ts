import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAllCitySeo, upsertCitySeo } from "@/lib/models/city-seo";
import { getAdminContext, canAccess } from "@/lib/admin-access";

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "city-seo")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const seo = await getAllCitySeo();
  return NextResponse.json({ seo });
}

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "city-seo")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const {
    slug,
    name,
    title,
    description,
    keywords,
    urlSlug,
    primaryKeyword,
    popularSearches,
    secondaryKeywords,
    longTailKeywords,
    canonicalUrl,
    featuredImage,
    imageAlt,
    content,
    faqs,
    status,
  } = body ?? {};

  if (!slug) {
    return NextResponse.json(
      { error: "City slug is required." },
      { status: 400 }
    );
  }

  const saved = await upsertCitySeo({
    slug: String(slug),
    name: name ? String(name) : String(slug),
    title: title ? String(title) : "",
    description: description ? String(description) : "",
    keywords: keywords ? String(keywords) : "",
    urlSlug: urlSlug ? String(urlSlug) : undefined,
    primaryKeyword: primaryKeyword ? String(primaryKeyword) : "",
    popularSearches: Array.isArray(popularSearches)
      ? popularSearches.map(String)
      : undefined,
    secondaryKeywords: Array.isArray(secondaryKeywords)
      ? secondaryKeywords.map(String)
      : [],
    longTailKeywords: Array.isArray(longTailKeywords)
      ? longTailKeywords.map(String)
      : [],
    canonicalUrl: canonicalUrl ? String(canonicalUrl) : "",
    featuredImage: featuredImage ? String(featuredImage) : "",
    imageAlt: imageAlt ? String(imageAlt) : "",
    content: Array.isArray(content) ? content : [],
    faqs: Array.isArray(faqs) ? faqs : [],
    status: status === "published" || status === "draft" ? status : "draft",
  });

  try {
    revalidatePath(`/places/${saved.slug}`);
    if (saved.urlSlug && saved.urlSlug !== saved.slug) {
      revalidatePath(`/places/${saved.urlSlug}`);
    }
    revalidatePath("/places");
    revalidatePath("/", "layout");
  } catch (err) {
    console.warn("[city-seo] revalidatePath error:", err);
  }

  return NextResponse.json({ success: true, seo: saved });
}
