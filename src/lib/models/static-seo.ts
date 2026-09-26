import "server-only";

import { cache } from "react";
import { getDb } from "../db";
import { readStore, writeStore, invalidateStoreCache } from "../persist";
import {
  StaticPageKey,
  StaticSeoImage,
  StaticContentBlock,
  StaticSeoStatus,
  StaticSeo,
  STATIC_PAGES,
  DEFAULT_STATIC_SEO_DATA,
} from "../types/static-seo";

export type {
  StaticPageKey,
  StaticSeoImage,
  StaticContentBlock,
  StaticSeoStatus,
  StaticSeo,
};
export { STATIC_PAGES, DEFAULT_STATIC_SEO_DATA };

function normalizeStaticSeoDoc(raw: Record<string, unknown>): StaticSeo {
  const pageKey = String(raw.pageKey || "home").trim().toLowerCase() as StaticPageKey;

  const images: StaticSeoImage[] = [];
  if (Array.isArray(raw.images)) {
    for (const img of raw.images) {
      if (img && typeof img === "object") {
        const item = img as Record<string, unknown>;
        const url = String(item.url || "").trim();
        if (url) {
          images.push({
            url,
            alt: item.alt ? String(item.alt).trim() : "",
          });
        }
      }
    }
  }

  const content: StaticContentBlock[] = [];
  if (Array.isArray(raw.content)) {
    raw.content.forEach((b, i) => {
      if (b && typeof b === "object") {
        const item = b as Record<string, unknown>;
        const type = (["h2", "h3", "p"].includes(String(item.type))
          ? String(item.type)
          : "p") as "h2" | "h3" | "p";
        content.push({
          id: String(item.id || `b_${Date.now()}_${i}`),
          type,
          text: String(item.text || ""),
        });
      }
    });
  }

  return {
    pageKey,
    title: raw.title ? String(raw.title).trim() : "",
    description: raw.description ? String(raw.description).trim() : "",
    keywords: raw.keywords ? String(raw.keywords).trim() : "",
    images: images.slice(0, 2), // maximum 2 images
    content,
    status: raw.status === "published" ? "published" : "draft",
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : new Date().toISOString(),
  };
}

export async function getAllStaticSeo(): Promise<Record<StaticPageKey, StaticSeo>> {
  const result: Partial<Record<StaticPageKey, StaticSeo>> = {};

  const db = await getDb();
  if (db) {
    try {
      const docs = await db.collection("static_seo").find({}).toArray();
      if (docs && docs.length > 0) {
        docs.forEach((doc) => {
          const item = normalizeStaticSeoDoc(doc as unknown as Record<string, unknown>);
          result[item.pageKey] = item;
        });
      }
    } catch (err) {
      console.error("[static-seo] getAllStaticSeo from mongo failed:", err);
    }
  }

  // Fallback to store if mongo returned nothing
  if (Object.keys(result).length === 0) {
    const store = await readStore();
    const list = (store.staticSeo ?? []) as unknown as Record<string, unknown>[];
    list.forEach((doc) => {
      const item = normalizeStaticSeoDoc(doc);
      result[item.pageKey] = item;
    });
  }

  // Ensure extracted default objects exist for all 7 keys if not yet saved or empty
  STATIC_PAGES.forEach(({ key }) => {
    const existing = result[key];
    const def = DEFAULT_STATIC_SEO_DATA[key];
    if (!existing || existing.content.length === 0) {
      result[key] = {
        pageKey: key,
        title: existing?.title || def?.title || "",
        description: existing?.description || def?.description || "",
        keywords: existing?.keywords || def?.keywords || "",
        images: existing?.images && existing.images.length > 0 ? existing.images : (def?.images || []),
        content: existing?.content && existing.content.length > 0 ? existing.content : (def?.content || []),
        status: existing?.status || def?.status || "published",
        updatedAt: existing?.updatedAt || new Date().toISOString(),
      };
    }
  });

  return result as Record<StaticPageKey, StaticSeo>;
}

const staticSeoCache = new Map<string, { data: StaticSeo | null; expiresAt: number }>();
const STATIC_SEO_CACHE_TTL_MS = 60_000;

export function invalidateStaticSeoCache(pageKey?: string): void {
  if (pageKey) {
    staticSeoCache.delete(pageKey.toLowerCase().trim());
  } else {
    staticSeoCache.clear();
  }
}

export const getStaticSeo = cache(async function (
  pageKey: string
): Promise<StaticSeo | null> {
  const target = String(pageKey || "").trim().toLowerCase() as StaticPageKey;
  if (!target) return null;

  const now = Date.now();
  const cached = staticSeoCache.get(target);
  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  let result: StaticSeo | null = null;
  const db = await getDb();
  if (db) {
    try {
      const doc = await db.collection("static_seo").findOne({ pageKey: target });
      if (doc) {
        result = normalizeStaticSeoDoc(doc as unknown as Record<string, unknown>);
      }
    } catch (err) {
      console.error(`[static-seo] getStaticSeo mongo failed for ${target}:`, err);
    }
  }

  if (!result) {
    const store = await readStore();
    const list = (store.staticSeo ?? []) as unknown as Record<string, unknown>[];
    const match = list.find((item) => String(item.pageKey).toLowerCase() === target);
    if (match) {
      result = normalizeStaticSeoDoc(match);
    }
  }

  // Fallback to extracted default content if no record or no content blocks yet
  if (!result || result.content.length === 0) {
    const def = DEFAULT_STATIC_SEO_DATA[target];
    if (def) {
      result = {
        pageKey: target,
        title: result?.title || def.title || "",
        description: result?.description || def.description || "",
        keywords: result?.keywords || def.keywords || "",
        images: result?.images && result.images.length > 0 ? result.images : def.images,
        content: result?.content && result.content.length > 0 ? result.content : def.content,
        status: result?.status || def.status || "published",
        updatedAt: result?.updatedAt || new Date().toISOString(),
      };
    }
  }

  staticSeoCache.set(target, {
    data: result,
    expiresAt: Date.now() + STATIC_SEO_CACHE_TTL_MS,
  });

  return result;
});

export async function upsertStaticSeo(data: {
  pageKey: StaticPageKey;
  title?: string;
  description?: string;
  keywords?: string;
  images?: StaticSeoImage[];
  content?: StaticContentBlock[];
  status?: StaticSeoStatus;
}): Promise<StaticSeo> {
  const targetKey = data.pageKey.toLowerCase().trim() as StaticPageKey;

  const record: StaticSeo = {
    pageKey: targetKey,
    title: data.title?.trim() ?? "",
    description: data.description?.trim() ?? "",
    keywords: data.keywords?.trim() ?? "",
    images: (data.images ?? [])
      .map((img) => ({
        url: String(img.url || "").trim(),
        alt: String(img.alt || "").trim(),
      }))
      .filter((img) => Boolean(img.url))
      .slice(0, 2),
    content: (data.content ?? []).map((b, i) => ({
      id: b.id || `b_${Date.now()}_${i}`,
      type: (["h2", "h3", "p"].includes(b.type) ? b.type : "p") as "h2" | "h3" | "p",
      text: String(b.text || "").trim(),
    })),
    status: data.status === "published" ? "published" : "draft",
    updatedAt: new Date().toISOString(),
  };

  const db = await getDb();
  if (db) {
    try {
      await db.collection("static_seo").updateOne(
        { pageKey: targetKey },
        { $set: record },
        { upsert: true }
      );
    } catch (err) {
      console.error(`[static-seo] Mongo upsert error for ${targetKey}:`, err);
    }
  }

  // Update file store
  try {
    const store = await readStore();
    const list = (store.staticSeo ?? []) as unknown as Record<string, unknown>[];
    const index = list.findIndex(
      (item) => String(item.pageKey).toLowerCase() === targetKey
    );
    if (index >= 0) {
      list[index] = { ...record };
    } else {
      list.push({ ...record });
    }
    store.staticSeo = list as unknown as typeof store.staticSeo;
    await writeStore(store);
  } catch (err) {
    console.error(`[static-seo] writeStore failed for ${targetKey}:`, err);
  }

  invalidateStaticSeoCache(targetKey);
  invalidateStoreCache();

  return record;
}
