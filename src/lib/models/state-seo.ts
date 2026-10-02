import "server-only";

import { cache } from "react";
import { getDb } from "../db";
import { readStore, writeStore, invalidateStoreCache } from "../persist";
import type { BlockType, ContentBlock, FaqItem, SeoStatus } from "./city-seo";

export type StateSeo = {
  slug: string;
  name: string;
  title: string;
  description: string;
  keywords: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  longTailKeywords?: string[];
  popularSearches?: string[];
  canonicalUrl?: string;
  featuredImage?: string;
  imageAlt?: string;
  content?: ContentBlock[];
  faqs?: FaqItem[];
  status?: SeoStatus;
  updatedAt?: string;
};

export function normalizeStateSeoDoc(raw: Record<string, unknown>): StateSeo {
  const secondaryKeywords = Array.isArray(raw.secondaryKeywords)
    ? (raw.secondaryKeywords as unknown[]).map(String).map((s) => s.trim()).filter(Boolean)
    : [];
  const longTailKeywords = Array.isArray(raw.longTailKeywords)
    ? (raw.longTailKeywords as unknown[]).map(String).map((s) => s.trim()).filter(Boolean)
    : [];
  const popularSearches = Array.isArray(raw.popularSearches) && raw.popularSearches.length > 0
    ? Array.from(new Set((raw.popularSearches as unknown[]).map(String).map((s) => s.trim()).filter(Boolean)))
    : Array.from(new Set([...secondaryKeywords, ...longTailKeywords]));

  return {
    slug: String(raw.slug || "").trim().toLowerCase(),
    name: String(raw.name || raw.slug || "").trim(),
    title: String(raw.title || ""),
    description: String(raw.description || ""),
    keywords: String(raw.keywords || raw.primaryKeyword || ""),
    primaryKeyword: String(raw.primaryKeyword || ""),
    secondaryKeywords,
    longTailKeywords,
    popularSearches,
    canonicalUrl: String(raw.canonicalUrl || ""),
    featuredImage: String(raw.featuredImage || ""),
    imageAlt: String(raw.imageAlt || ""),
    content: Array.isArray(raw.content)
      ? (raw.content as Array<Partial<ContentBlock>>).map((b, i) => ({
          id: String(b.id || `b_${i}`),
          type: (["h1", "h2", "h3", "p"].includes(String(b.type)) ? b.type : "p") as BlockType,
          text: String(b.text || ""),
        }))
      : [],
    faqs: Array.isArray(raw.faqs)
      ? (raw.faqs as Array<Partial<FaqItem>>)
          .map((f, i) => ({
            id: String(f.id || `faq_${i}`),
            question: String(f.question || "").trim(),
            answer: String(f.answer || "").trim(),
          }))
          .filter((f) => f.question || f.answer)
      : [],
    status: raw.status === "published" ? "published" : "draft",
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : new Date().toISOString(),
  };
}

let stateSeoIndexesCreated = false;
function ensureStateSeoIndexes(db: import("mongodb").Db) {
  if (stateSeoIndexesCreated) return;
  stateSeoIndexesCreated = true;
  db.collection("state_seo")
    .createIndexes([{ key: { slug: 1 }, name: "state_seo_slug_idx", unique: true }])
    .catch(() => {});
}

const stateSeoCache = new Map<string, { data: StateSeo | null; expiresAt: number }>();
const STATE_SEO_CACHE_TTL_MS = 60_000;

export function invalidateStateSeoCache(slug?: string): void {
  if (slug) {
    stateSeoCache.delete(slug.toLowerCase().trim());
  } else {
    stateSeoCache.clear();
  }
}

export const getAllStateSeo = cache(async function (): Promise<StateSeo[]> {
  const db = await getDb();
  if (db) {
    try {
      const docs = await db.collection("state_seo").find({}).toArray();
      if (docs && docs.length > 0) {
        return docs.map((d) => normalizeStateSeoDoc(d as unknown as Record<string, unknown>));
      }
    } catch (err) {
      console.error("[state-seo] getAllStateSeo mongo failed:", err);
    }
  }

  const store = await readStore();
  const list = ((store.stateSeo ?? []) as unknown as Record<string, unknown>[]);
  return list.map(normalizeStateSeoDoc);
});

export const getStateSeo = cache(async function (
  slug: string
): Promise<StateSeo | null> {
  const target = String(slug || "").trim().toLowerCase();
  if (!target) return null;

  const now = Date.now();
  const cached = stateSeoCache.get(target);
  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  let result: StateSeo | null = null;
  const db = await getDb();
  if (db) {
    ensureStateSeoIndexes(db);
    try {
      const doc = await db.collection("state_seo").findOne({ slug: target });
      if (doc) {
        result = normalizeStateSeoDoc(doc as unknown as Record<string, unknown>);
      }
    } catch (err) {
      console.error("[state-seo] getStateSeo mongo lookup failed:", err);
    }
  }

  if (!result) {
    const all = await getAllStateSeo();
    result = all.find((s) => s.slug === target || s.name.toLowerCase() === target) ?? null;
  }

  stateSeoCache.set(target, { data: result, expiresAt: now + STATE_SEO_CACHE_TTL_MS });
  return result;
});

export async function upsertStateSeo(data: Partial<StateSeo> & { slug: string; name?: string }): Promise<StateSeo> {
  const record = normalizeStateSeoDoc({
    ...data,
    slug: data.slug,
    name: data.name || data.slug,
    updatedAt: new Date().toISOString(),
  });

  const db = await getDb();
  if (db) {
    try {
      await db.collection("state_seo").updateOne(
        { slug: record.slug },
        { $set: record },
        { upsert: true }
      );
    } catch (err) {
      console.error("[state-seo] upsertStateSeo mongo failed:", err);
    }
  }

  try {
    const store = await readStore();
    const list = ((store.stateSeo ?? []) as unknown as StateSeo[]);
    const idx = list.findIndex((s) => s.slug.toLowerCase() === record.slug.toLowerCase());
    if (idx >= 0) {
      list[idx] = record;
    } else {
      list.push(record);
    }
    store.stateSeo = list as unknown as typeof store.stateSeo;
    await writeStore(store);
  } catch (err) {
    console.warn("[state-seo] store fallback write failed:", err);
  }

  invalidateStoreCache();
  invalidateStateSeoCache();
  return record;
}
