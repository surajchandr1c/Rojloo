import { cache } from "react";
import { Collection, Document, ObjectId } from "mongodb";
import { getDb } from "../db";
import { readStore, writeStore } from "../persist";
import type { ServiceRate } from "@/components/post-ad/types";

export interface Ad {
  _id?: string;
  userId: string;
  name: string;
  title?: string;
  age?: string;
  category: string;
  toServe?: string[];
  placeOfService?: string[];
  state?: string;
  city: string;
  pincode?: string;
  phone: string;
  whatsapp?: string;
  telegram?: string;
  about: string;
  images: string[];
  status: string;
  serviceRates?: ServiceRate[];
  createdAt: Date;
  updatedAt: Date;
}

export type PublicAd = Omit<Ad, never>;

// --- File-backed fallback (used when MongoDB is unreachable) ---
async function memoryListByUser(userId: string): Promise<Ad[]> {
  const store = await readStore();
  return store.ads
    .filter((ad) => ad.userId === userId)
    .sort(
      (a, b) =>
        (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime()
    ) as unknown as Ad[];
}

async function memoryFindById(id: string): Promise<Ad | null> {
  const store = await readStore();
  return (store.ads.find((ad) => ad._id === id) as unknown as Ad) ?? null;
}

function buildAdIdCandidates(id: string): Array<string | ObjectId> {
  const trimmed = id.trim();
  const candidates: Array<string | ObjectId> = [trimmed];
  if (ObjectId.isValid(trimmed)) {
    candidates.unshift(new ObjectId(trimmed));
  }
  return candidates;
}

type MongoQuery = Record<string, unknown>;

async function collectionFindById(
  collection: Collection<Document>,
  id: string
): Promise<Ad | null> {
  for (const candidate of buildAdIdCandidates(id)) {
    const doc = await collection.findOne({ _id: candidate } as MongoQuery);
    if (doc) {
      return doc as unknown as Ad;
    }
  }

  return null;
}

async function collectionListByUser(userId: string): Promise<Ad[]> {
  const collection = await getAdsCollection();
  if (!collection) return [];

  const docs = await collection.find({ userId }).sort({ createdAt: -1 }).toArray();
  return docs.map((doc) => doc as unknown as Ad);
}

async function collectionListByCity(city: string): Promise<Ad[]> {
  const collection = await getAdsCollection();
  if (!collection) return [];

  const escaped = city.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const docs = await collection
    .find({
      city: { $regex: new RegExp(`^${escaped}$`, "i") },
      status: { $ne: "deleted" },
    })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((doc) => doc as unknown as Ad);
}

function isVisibleAd(ad: Ad): boolean {
  return (ad.status ?? "active") !== "deleted";
}

function mergeAds(...groups: Ad[][]): Ad[] {
  const merged = new Map<string, Ad>();

  for (const group of groups) {
    for (const ad of group) {
      if (!ad._id) continue;
      if (!isVisibleAd(ad)) continue;
      merged.set(ad._id, ad);
    }
  }

  return Array.from(merged.values()).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

async function memoryUpsert(ad: Ad): Promise<Ad> {
  const store = await readStore();
  if (!ad._id) {
    ad._id = `mem_ad_${store.ads.length + 1}_${Date.now()}`;
  }
  const index = store.ads.findIndex((a) => a._id === ad._id);
  if (index >= 0) store.ads[index] = ad as unknown as (typeof store.ads)[number];
  else store.ads.push(ad as unknown as (typeof store.ads)[number]);
  await writeStore(store);
  return ad;
}

async function memoryDelete(id: string, userId: string): Promise<boolean> {
  const store = await readStore();
  const index = store.ads.findIndex((a) => a._id === id && a.userId === userId);
  if (index < 0) return false;
  store.ads.splice(index, 1);
  await writeStore(store);
  return true;
}

let adIndexesCreated = false;

async function getAdsCollection(): Promise<Collection<Document> | null> {
  const db = await getDb();
  if (!db) return null;

  const collection = db.collection("ads");
  if (!adIndexesCreated) {
    try {
      await collection.createIndexes([
        { key: { userId: 1 }, name: "user_idx" },
        { key: { userId: 1, _id: 1 }, name: "user_ad_idx" },
        { key: { city: 1, status: 1, createdAt: -1 }, name: "city_status_created_idx" },
        { key: { status: 1, createdAt: -1 }, name: "status_created_idx" },
      ]);
      adIndexesCreated = true;
    } catch {
      // Non-fatal.
    }
  }
  return collection;
}

export async function listAds(userId: string): Promise<PublicAd[]> {
  const collection = await getAdsCollection();
  const memoryAds = await memoryListByUser(userId);
  if (!collection) {
    return memoryAds.map(toPublicAd);
  }

  const docs = await collectionListByUser(userId);
  return mergeAds(docs, memoryAds).map(toPublicAd);
}

export async function listAdsByCity(city: string): Promise<PublicAd[]> {
  const collection = await getAdsCollection();
  const store = await readStore();
  const normalized = city.trim().toLowerCase();
  const memoryAds = store.ads
    .filter(
      (ad) =>
        isVisibleAd(ad as unknown as Ad) &&
        String(ad.city ?? "").trim().toLowerCase() === normalized
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt as string | Date).getTime() -
        new Date(a.createdAt as string | Date).getTime()
    ) as unknown as Ad[];

  if (!collection) {
    return memoryAds.map(toPublicAd);
  }

  const docs = await collectionListByCity(city);
  return mergeAds(docs, memoryAds).map(toPublicAd);
}

export async function getAdById(
  id: string,
  userId: string
): Promise<Ad | null> {
  const collection = await getAdsCollection();
  if (!collection) {
    const ad = await memoryFindById(id);
    return ad && ad.userId === userId ? ad : null;
  }

  for (const candidate of buildAdIdCandidates(id)) {
    const doc = await collection.findOne({ _id: candidate, userId } as MongoQuery);
    if (doc) return doc as unknown as Ad;
  }

  const ad = await memoryFindById(id);
  return ad && ad.userId === userId ? ad : null;
}

export async function getAdCountsByCity(): Promise<Record<string, number>> {
  const collection = await getAdsCollection();
  const counts: Record<string, number> = {};

  if (collection) {
    try {
      const results = await collection
        .aggregate([
          { $match: { status: { $ne: "deleted" } } },
          { $group: { _id: { $toLower: "$city" }, count: { $sum: 1 } } },
        ])
        .toArray();

      for (const item of results) {
        if (item._id && typeof item.count === "number") {
          counts[String(item._id).trim().toLowerCase()] = item.count;
        }
      }
      return counts;
    } catch (err) {
      console.error("[ad] getAdCountsByCity aggregation failed:", err);
    }
  }

  const store = await readStore();
  for (const ad of store.ads) {
    if (isVisibleAd(ad as unknown as Ad) && ad.city) {
      const key = String(ad.city).trim().toLowerCase();
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return counts;
}

export const getPublicAdById = cache(async function (
  id: string
): Promise<PublicAd | null> {
  const collection = await getAdsCollection();
  if (!collection) {
    const ad = await memoryFindById(id);
    return ad ? toPublicAd(ad) : null;
  }

  const doc = await collectionFindById(collection, id);
  if (doc) return toPublicAd(doc);

  const ad = await memoryFindById(id);
  return ad ? toPublicAd(ad) : null;
});

export async function createAd(
  data: Omit<Ad, "_id" | "createdAt" | "updatedAt">
): Promise<PublicAd> {
  const collection = await getAdsCollection();
  const now = new Date();
  const ad: Ad = { ...data, createdAt: now, updatedAt: now };

  if (!collection) {
    return toPublicAd(await memoryUpsert(ad));
  }

  const result = await collection.insertOne(ad as unknown as Document);
  return { ...ad, _id: result.insertedId.toString() };
}

export async function updateAd(
  id: string,
  userId: string,
  data: Partial<Omit<Ad, "_id" | "userId" | "createdAt" | "updatedAt">>
): Promise<PublicAd | null> {
  const collection = await getAdsCollection();
  const now = new Date();

  if (!collection) {
    const existing = await memoryFindById(id);
    if (!existing || existing.userId !== userId) return null;
    Object.assign(existing, data, { updatedAt: now });
    await memoryUpsert(existing);
    return toPublicAd(existing);
  }

  for (const candidate of buildAdIdCandidates(id)) {
    const result = await collection.updateOne(
      { _id: candidate, userId } as MongoQuery,
      { $set: { ...data, updatedAt: now } }
    );
    if (result.matchedCount > 0) {
      const updated = await collection.findOne({ _id: candidate, userId } as MongoQuery);
      return updated ? toPublicAd(updated as unknown as Ad) : null;
    }
  }

  const existing = await memoryFindById(id);
  if (!existing || existing.userId !== userId) return null;
  Object.assign(existing, data, { updatedAt: now });
  await memoryUpsert(existing);
  return toPublicAd(existing);
}

export async function deleteAd(
  id: string,
  userId: string
): Promise<boolean> {
  const collection = await getAdsCollection();
  if (!collection) return await memoryDelete(id, userId);

  for (const candidate of buildAdIdCandidates(id)) {
    const result = await collection.deleteOne({ _id: candidate, userId } as MongoQuery);
    if (result.deletedCount > 0) return true;
  }

  return await memoryDelete(id, userId);
}

export async function softDeleteAd(
  id: string,
  userId: string
): Promise<boolean> {
  const collection = await getAdsCollection();
  if (!collection) {
    const store = await readStore();
    const idx = store.ads.findIndex(
      (a) => a._id === id && a.userId === userId
    );
    if (idx < 0) return false;
    store.ads[idx].status = "deleted";
    store.ads[idx].updatedAt = new Date();
    await writeStore(store);
    return true;
  }

  for (const candidate of buildAdIdCandidates(id)) {
    const result = await collection.updateOne(
      { _id: candidate, userId } as MongoQuery,
      { $set: { status: "deleted", updatedAt: new Date() } }
    );
    if (result.matchedCount > 0) return true;
  }

  return await memoryDelete(id, userId);
}

export async function restoreAd(
  id: string,
  userId: string
): Promise<boolean> {
  const collection = await getAdsCollection();
  if (!collection) {
    const store = await readStore();
    const idx = store.ads.findIndex(
      (a) => a._id === id && a.userId === userId
    );
    if (idx < 0) return false;
    store.ads[idx].status = "active";
    store.ads[idx].updatedAt = new Date();
    await writeStore(store);
    return true;
  }

  for (const candidate of buildAdIdCandidates(id)) {
    const result = await collection.updateOne(
      { _id: candidate, userId } as MongoQuery,
      { $set: { status: "active", updatedAt: new Date() } }
    );
    if (result.matchedCount > 0) return true;
  }

  const store = await readStore();
  const idx = store.ads.findIndex(
    (a) => a._id === id && a.userId === userId
  );
  if (idx < 0) return false;
  store.ads[idx].status = "active";
  store.ads[idx].updatedAt = new Date();
  await writeStore(store);
  return true;
}

export async function listAllAds(): Promise<PublicAd[]> {
  const collection = await getAdsCollection();
  if (!collection) {
    const store = await readStore();
    return store.ads
      .filter((ad) => (ad.status ?? "active") !== "deleted")
      .sort(
        (a, b) =>
          (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime()
      )
      .map((ad) => toPublicAd(ad as unknown as Ad));
  }

  const docs = await collection
    .find({ status: { $ne: "deleted" } })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((doc) => toPublicAd(doc as unknown as Ad));
}

export async function setAdStatus(
  id: string,
  status: string
): Promise<PublicAd | null> {
  const collection = await getAdsCollection();
  const now = new Date();

  if (!collection) {
    const existing = await memoryFindById(id);
    if (!existing) return null;
    existing.status = status;
    existing.updatedAt = now;
    await memoryUpsert(existing);
    return toPublicAd(existing);
  }

  for (const candidate of buildAdIdCandidates(id)) {
    const result = await collection.updateOne(
      { _id: candidate } as MongoQuery,
      { $set: { status, updatedAt: now } }
    );
    if (result.matchedCount > 0) {
      const updated = await collection.findOne({ _id: candidate } as MongoQuery);
      return updated ? toPublicAd(updated as unknown as Ad) : null;
    }
  }

  const existing = await memoryFindById(id);
  if (!existing) return null;
  existing.status = status;
  existing.updatedAt = now;
  await memoryUpsert(existing);
  return toPublicAd(existing);
}

export async function adminDeleteAd(id: string): Promise<boolean> {
  const collection = await getAdsCollection();

  if (!collection) {
    const store = await readStore();
    const index = store.ads.findIndex((a) => a._id === id);
    if (index < 0) return false;
    store.ads.splice(index, 1);
    await writeStore(store);
    return true;
  }

  for (const candidate of buildAdIdCandidates(id)) {
    const result = await collection.deleteOne({ _id: candidate } as MongoQuery);
    if (result.deletedCount > 0) return true;
  }

  const store = await readStore();
  const index = store.ads.findIndex((a) => a._id === id);
  if (index < 0) return false;
  store.ads.splice(index, 1);
  await writeStore(store);
  return true;
}

export function toPublicAd(ad: Ad): PublicAd {
  return {
    _id: ad._id,
    userId: ad.userId,
    name: ad.name,
    title: ad.title,
    age: ad.age,
    category: ad.category,
    toServe: ad.toServe,
    placeOfService: ad.placeOfService,
    city: ad.city,
    phone: ad.phone,
    whatsapp: ad.whatsapp,
    telegram: ad.telegram,
    about: ad.about,
    images: ad.images,
    serviceRates: ad.serviceRates,
    status: ad.status,
    createdAt: ad.createdAt,
    updatedAt: ad.updatedAt,
  };
}

export async function countAdsPerUser(): Promise<Record<string, number>> {
  const collection = await getAdsCollection();
  const store = await readStore();

  const all: Ad[] = [];
  if (collection) {
    const docs = await collection.find({}).toArray();
    all.push(...(docs as unknown as Ad[]));
  }
  all.push(...((store.ads ?? []) as unknown as Ad[]));

  const counts: Record<string, number> = {};
  const seen = new Set<string>();
  for (const ad of all) {
    if ((ad.status ?? "active") === "deleted") continue;
    if (!ad._id || seen.has(ad._id)) continue;
    seen.add(ad._id);
    if (!ad.userId) continue;
    counts[ad.userId] = (counts[ad.userId] ?? 0) + 1;
  }
  return counts;
}
