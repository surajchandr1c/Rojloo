import "server-only";

import { cache } from "react";
import { getDb } from "../db";
import { readStore, writeStore, invalidateStoreCache } from "../persist";
import type { BlockType, ContentBlock, FaqItem, SeoStatus } from "./city-seo";

export type LocalAreaSeoMode = "inherit" | "individual";

export type LocalAreaSeo = {
  citySlug: string;
  areaSlug: string;
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
  mode: LocalAreaSeoMode;
  updatedAt?: string;
};

function normalizeRecord(raw: Record<string, unknown>): LocalAreaSeo {
  const citySlug = String(raw.citySlug || "").trim().toLowerCase();
  const areaSlug = String(raw.areaSlug || raw.slug || "").trim().toLowerCase();
  const secondaryKeywords = Array.isArray(raw.secondaryKeywords)
    ? (raw.secondaryKeywords as unknown[]).map(String).map((s) => s.trim()).filter(Boolean)
    : [];
  const longTailKeywords = Array.isArray(raw.longTailKeywords)
    ? (raw.longTailKeywords as unknown[]).map(String).map((s) => s.trim()).filter(Boolean)
    : [];
  const popularSearches = Array.isArray(raw.popularSearches)
    ? (raw.popularSearches as unknown[]).map(String).map((s) => s.trim()).filter(Boolean)
    : [...secondaryKeywords, ...longTailKeywords];

  return {
    citySlug,
    areaSlug,
    slug: areaSlug,
    name: String(raw.name || areaSlug),
    title: String(raw.title || ""),
    description: String(raw.description || ""),
    keywords: String(raw.keywords || raw.primaryKeyword || ""),
    primaryKeyword: String(raw.primaryKeyword || ""),
    secondaryKeywords,
    longTailKeywords,
    popularSearches: Array.from(new Set(popularSearches)),
    canonicalUrl: String(raw.canonicalUrl || ""),
    featuredImage: String(raw.featuredImage || ""),
    imageAlt: String(raw.imageAlt || ""),
    content: Array.isArray(raw.content)
      ? (raw.content as Array<Partial<ContentBlock>>).map((block, index) => ({
          id: String(block.id || `b_${index}`),
          type: (["h1", "h2", "h3", "p"] as BlockType[]).includes(block.type as BlockType)
            ? (block.type as BlockType)
            : "p",
          text: String(block.text || ""),
        }))
      : [],
    faqs: Array.isArray(raw.faqs)
      ? (raw.faqs as Array<Partial<FaqItem>>)
          .map((faq, index) => ({
            id: String(faq.id || `faq_${index}`),
            question: String(faq.question || "").trim(),
            answer: String(faq.answer || "").trim(),
          }))
          .filter((faq) => faq.question || faq.answer)
      : [],
    status: raw.status === "published" ? "published" : "draft",
    mode: raw.mode === "individual" ? "individual" : "inherit",
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : new Date().toISOString(),
  };
}

export const getAllLocalAreaSeo = cache(async function (): Promise<LocalAreaSeo[]> {
  const db = await getDb();
  if (db) {
    try {
      const docs = await db.collection("local_area_seo").find({}).toArray();
      if (docs.length > 0) {
        return docs.map((doc) => normalizeRecord(doc as unknown as Record<string, unknown>));
      }
    } catch (error) {
      console.error("[local-area-seo] Mongo read failed:", error);
    }
  }

  const store = await readStore();
  return ((store.localAreaSeo ?? []) as unknown as Record<string, unknown>[]).map(normalizeRecord);
});

export const getLocalAreaSeo = cache(async function (
  citySlug: string,
  areaSlug: string
): Promise<LocalAreaSeo | null> {
  const city = citySlug.trim().toLowerCase();
  const area = areaSlug.trim().toLowerCase();
  if (!city || !area) return null;

  const db = await getDb();
  if (db) {
    try {
      const doc = await db.collection("local_area_seo").findOne({ citySlug: city, areaSlug: area });
      if (doc) return normalizeRecord(doc as unknown as Record<string, unknown>);
    } catch (error) {
      console.error("[local-area-seo] Mongo lookup failed:", error);
    }
  }

  const records = await getAllLocalAreaSeo();
  return records.find((record) => record.citySlug === city && record.areaSlug === area) ?? null;
});

export async function upsertLocalAreaSeo(data: LocalAreaSeo): Promise<LocalAreaSeo> {
  const record = normalizeRecord({ ...data, citySlug: data.citySlug, areaSlug: data.areaSlug });
  const db = await getDb();
  if (db) {
    try {
      await db.collection("local_area_seo").updateOne(
        { citySlug: record.citySlug, areaSlug: record.areaSlug },
        { $set: record },
        { upsert: true }
      );
    } catch (error) {
      console.error("[local-area-seo] Mongo write failed:", error);
    }
  }

  const store = await readStore();
  const records = (store.localAreaSeo ?? []) as unknown as LocalAreaSeo[];
  const index = records.findIndex(
    (item) => item.citySlug === record.citySlug && item.areaSlug === record.areaSlug
  );
  if (index >= 0) records[index] = record;
  else records.push(record);
  store.localAreaSeo = records as unknown as typeof store.localAreaSeo;
  await writeStore(store);
  invalidateStoreCache();
  return record;
}
