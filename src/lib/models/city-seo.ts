import { cache } from "react";
import { readStore, writeStore } from "../persist";

export type BlockType = "h1" | "h2" | "h3" | "p";

export type ContentBlock = {
  id: string;
  type: BlockType;
  text: string;
};

export type SeoStatus = "draft" | "published";

export type CitySeo = {
  slug: string;
  name: string;
  title: string;
  description: string;
  keywords: string;
  urlSlug?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  longTailKeywords?: string[];
  canonicalUrl?: string;
  featuredImage?: string;
  imageAlt?: string;
  content?: ContentBlock[];
  status?: SeoStatus;
  updatedAt?: string;
};

export async function getAllCitySeo(): Promise<CitySeo[]> {
  const store = await readStore();
  return ((store.citySeo ?? []) as unknown as CitySeo[]).slice();
}

export const getCitySeo = cache(async function (
  slug: string
): Promise<CitySeo | null> {
  const store = await readStore();
  const found = ((store.citySeo ?? []) as unknown as CitySeo[]).find(
    (c) => c.slug === slug
  );
  return found ?? null;
});

export async function upsertCitySeo(data: CitySeo): Promise<CitySeo> {
  const store = await readStore();
  const list = (store.citySeo ?? []) as unknown as CitySeo[];
  const index = list.findIndex((c) => c.slug === data.slug);
  const prev = index >= 0 ? (list[index] as unknown as CitySeo) : undefined;

  const record: CitySeo = {
    slug: data.slug,
    name: data.name?.trim() || prev?.name || String(data.slug),
    title: data.title?.trim() ?? "",
    description: data.description?.trim() ?? "",
    keywords:
      data.keywords?.trim() ||
      (data.primaryKeyword ? data.primaryKeyword.trim() : ""),
    urlSlug: data.urlSlug?.trim() || prev?.urlSlug || data.slug,
    primaryKeyword: data.primaryKeyword?.trim() ?? "",
    secondaryKeywords: Array.isArray(data.secondaryKeywords)
      ? data.secondaryKeywords
      : [],
    longTailKeywords: Array.isArray(data.longTailKeywords)
      ? data.longTailKeywords
      : [],
    canonicalUrl: data.canonicalUrl?.trim() ?? "",
    featuredImage: data.featuredImage ?? "",
    imageAlt: data.imageAlt?.trim() ?? "",
    content: Array.isArray(data.content) ? data.content : [],
    status: data.status ?? prev?.status ?? "draft",
    updatedAt: new Date().toISOString(),
  };

  if (index >= 0) {
    list[index] = record as unknown as (typeof list)[number];
  } else {
    list.push(record as unknown as (typeof list)[number]);
  }

  await writeStore(store);
  return record;
}
