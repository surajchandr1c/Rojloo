import "server-only";

import { cache } from "react";
import { readStore, writeStore, invalidateStoreCache } from "../persist";
import { cityPlaces } from "../places";
import { invalidateCityCache, listAllCities } from "./city";
import { slugify } from "../utils/string";
import { getDb } from "../db";
import { listStates } from "./state";
import { getAllCitySeo, normalizeSeoDoc, invalidateCitySeoCache, type CitySeo } from "./city-seo";
import { getAllLocalAreaSeo, normalizeLocalAreaSeoDoc, type LocalAreaSeo } from "./local-area-seo";
import { getAllStateSeo, normalizeStateSeoDoc, invalidateStateSeoCache, type StateSeo } from "./state-seo";

export type LocalAreaRecord = {
  _id?: string;
  name: string;
  slug: string;
  cityName: string;
  citySlug: string;
  stateName?: string;
  stateSlug?: string;
  createdAt: Date | string;
};

export type JsonImportSummary = {
  totalStates: number;
  totalCities: number;
  totalLocalAreas: number;
  newStates: number;
  newCities: number;
  newLocalAreas: number;
  stateSeoCount: number;
  citySeoCount: number;
  localAreaSeoCount: number;
};

export type ParsedLocalAreaItem = {
  name: string;
  slug: string;
  seo?: LocalAreaSeo;
};

export type ParsedCityItem = {
  cityName: string;
  citySlug: string;
  region?: string;
  country?: string;
  famousFood?: string;
  seoDescription?: string;
  seo?: CitySeo;
  localAreas: ParsedLocalAreaItem[];
};

export type ParsedStateItem = {
  stateName: string;
  stateSlug: string;
  seo?: StateSeo;
  cities: ParsedCityItem[];
};

export type ParsedImportData = ParsedStateItem[];

export type JsonValidationResult =
  | { valid: true; summary: JsonImportSummary; data: ParsedImportData }
  | { valid: false; error: string };

export type ExportedLocalArea = {
  name: string;
  slug: string;
  seo?: Partial<LocalAreaSeo>;
};

export type ExportedCity = {
  slug: string;
  region?: string;
  country?: string;
  famousFood?: string;
  seoDescription?: string;
  seo?: Partial<CitySeo>;
  localAreas: ExportedLocalArea[];
  "Local areas": string[];
};

export type ExportedState = {
  slug: string;
  seo?: Partial<StateSeo>;
  cities: Record<string, ExportedCity>;
};

export type LocationsExportSchema = Record<string, ExportedState>;

let cachedLocalAreas: LocalAreaRecord[] | null = null;
let cachedByCitySlug: Map<string, LocalAreaRecord[]> | null = null;
let cachedByCityName: Map<string, LocalAreaRecord[]> | null = null;
let cachedByState: Map<string, LocalAreaRecord[]> | null = null;
let cacheExpiresAt = 0;
const LOCAL_AREAS_CACHE_TTL_MS = 10_000;

export function invalidateLocalAreasCache(): void {
  cachedLocalAreas = null;
  cachedByCitySlug = null;
  cachedByCityName = null;
  cachedByState = null;
  cacheExpiresAt = 0;
}

async function getIndexedLocalAreas(forceFresh = false): Promise<{
  all: LocalAreaRecord[];
  byCitySlug: Map<string, LocalAreaRecord[]>;
  byCityName: Map<string, LocalAreaRecord[]>;
  byState: Map<string, LocalAreaRecord[]>;
}> {
  const now = Date.now();
  if (
    !forceFresh &&
    cachedLocalAreas &&
    cachedByCitySlug &&
    cachedByCityName &&
    cachedByState &&
    now < cacheExpiresAt
  ) {
    return {
      all: cachedLocalAreas,
      byCitySlug: cachedByCitySlug,
      byCityName: cachedByCityName,
      byState: cachedByState,
    };
  }

  const store = await readStore(forceFresh);
  const rawAreas = (store.localAreas ?? []) as unknown as LocalAreaRecord[];
  const all = [...rawAreas].sort((a, b) =>
    String(a.name).localeCompare(String(b.name))
  );

  const byCitySlug = new Map<string, LocalAreaRecord[]>();
  const byCityName = new Map<string, LocalAreaRecord[]>();
  const byState = new Map<string, LocalAreaRecord[]>();

  for (const a of all) {
    if (a.citySlug) {
      const cSlug = a.citySlug.toLowerCase();
      const list = byCitySlug.get(cSlug) || [];
      list.push(a);
      byCitySlug.set(cSlug, list);
    }
    if (a.cityName) {
      const cName = a.cityName.toLowerCase().trim();
      const list = byCityName.get(cName) || [];
      list.push(a);
      byCityName.set(cName, list);

      // Also map slugify(a.cityName) into byCitySlug
      const cNameSlug = slugify(a.cityName);
      if (cNameSlug && cNameSlug !== (a.citySlug || "").toLowerCase()) {
        const slugList = byCitySlug.get(cNameSlug) || [];
        slugList.push(a);
        byCitySlug.set(cNameSlug, slugList);
      }
    }
    if (a.stateName) {
      const sName = a.stateName.toLowerCase().trim();
      const list = byState.get(sName) || [];
      list.push(a);
      byState.set(sName, list);
    }
  }

  cachedLocalAreas = all;
  cachedByCitySlug = byCitySlug;
  cachedByCityName = byCityName;
  cachedByState = byState;
  cacheExpiresAt = now + LOCAL_AREAS_CACHE_TTL_MS;

  return { all, byCitySlug, byCityName, byState };
}

export const listLocalAreas = cache(async function (filters?: {
  cityName?: string;
  citySlug?: string;
  stateName?: string;
  fresh?: boolean;
}): Promise<LocalAreaRecord[]> {
  const indexed = await getIndexedLocalAreas(filters?.fresh);

  if (filters?.citySlug) {
    const targetSlug = filters.citySlug.trim().toLowerCase();
    const bySlug = indexed.byCitySlug.get(targetSlug);
    if (bySlug && bySlug.length > 0) return bySlug;

    if (filters.cityName) {
      const byName = indexed.byCityName.get(filters.cityName.trim().toLowerCase());
      if (byName && byName.length > 0) return byName;
    }

    // Fallback: match by citySlug or slugified cityName
    const fallback = indexed.all.filter(
      (a) =>
        a.citySlug?.toLowerCase() === targetSlug ||
        slugify(a.cityName) === targetSlug
    );
    if (fallback.length > 0) return fallback;
  }
  if (filters?.cityName) {
    const byName = indexed.byCityName.get(filters.cityName.trim().toLowerCase());
    if (byName && byName.length > 0) return byName;
  }
  if (filters?.stateName) {
    const s = filters.stateName.trim().toLowerCase();
    return indexed.byState.get(s) ?? [];
  }

  return indexed.all;
});

export const getLocalAreaBySlug = cache(async function (
  citySlug: string,
  areaSlug: string
): Promise<LocalAreaRecord | null> {
  const normalizedAreaSlug = slugify(areaSlug);
  const areas = await listLocalAreas({ citySlug, fresh: true });
  let match = areas.find(
    (area) =>
      area.slug.toLowerCase() === normalizedAreaSlug ||
      slugify(area.name) === normalizedAreaSlug
  );
  if (!match) {
    const targetClean = citySlug.trim().toLowerCase();
    const indexed = await getIndexedLocalAreas(true);
    match = indexed.all.find(
      (area) =>
        (area.citySlug?.toLowerCase() === targetClean ||
          slugify(area.cityName) === targetClean) &&
        (area.slug.toLowerCase() === normalizedAreaSlug ||
          slugify(area.name) === normalizedAreaSlug)
    );
  }
  return match ?? null;
});

export async function createLocalArea(data: {
  name: string;
  cityName: string;
  stateName?: string;
  citySlug?: string;
}): Promise<LocalAreaRecord> {
  const trimmedName = data.name.trim();
  const trimmedCity = data.cityName.trim();
  let trimmedState = data.stateName?.trim() ?? "";
  let citySlug = data.citySlug ? slugify(data.citySlug) : "";

  if (!trimmedName) throw new Error("Local area name is required.");
  if (!trimmedCity) throw new Error("City name is required.");

  const store = await readStore(true);

  if (!citySlug || !trimmedState) {
    const customCity = (
      (store.cities ?? []) as Array<{ name?: string; slug?: string; state?: string }>
    ).find(
      (c) =>
        (c.name && c.name.trim().toLowerCase() === trimmedCity.toLowerCase()) ||
        (c.slug && c.slug.toLowerCase() === slugify(trimmedCity))
    );
    const staticCity = !customCity
      ? cityPlaces.find(
          (c) =>
            c.name.trim().toLowerCase() === trimmedCity.toLowerCase() ||
            c.slug.toLowerCase() === slugify(trimmedCity)
        )
      : null;

    const matchedCity = customCity || staticCity;
    if (matchedCity) {
      if (!citySlug && matchedCity.slug) citySlug = matchedCity.slug;
      if (!trimmedState && matchedCity.state) trimmedState = matchedCity.state.trim();
    }
  }

  if (!citySlug) {
    citySlug = slugify(trimmedCity);
  }

  const areaSlug = slugify(trimmedName) || `area-${Date.now()}`;
  const stateSlug = trimmedState ? slugify(trimmedState) : "";

  store.localAreas = (store.localAreas ?? []) as unknown as typeof store.localAreas;
  const existingAreas = store.localAreas as unknown as LocalAreaRecord[];

  const existingIndex = existingAreas.findIndex(
    (a) =>
      (a.citySlug === citySlug || slugify(a.cityName) === slugify(trimmedCity)) &&
      (a.slug === areaSlug || a.name.toLowerCase() === trimmedName.toLowerCase())
  );

  if (existingIndex >= 0) {
    const existing = existingAreas[existingIndex];
    existing.name = trimmedName;
    if (citySlug) existing.citySlug = citySlug;
    if (trimmedState && !existing.stateName) {
      existing.stateName = trimmedState;
      existing.stateSlug = stateSlug;
    }
    await writeStore(store);
    invalidateLocalAreasCache();
    invalidateCityCache();
    return existing;
  }

  const localArea: LocalAreaRecord = {
    _id: `mem_area_${existingAreas.length + 1}_${Date.now()}`,
    name: trimmedName,
    slug: areaSlug,
    cityName: trimmedCity,
    citySlug,
    stateName: trimmedState,
    stateSlug,
    createdAt: new Date(),
  };

  store.localAreas.push(localArea as unknown as (typeof store.localAreas)[number]);
  await writeStore(store);
  invalidateLocalAreasCache();
  invalidateCityCache();
  return localArea;
}

export async function deleteLocalArea(
  input: string | { id?: string; name?: string; cityName?: string }
): Promise<boolean> {
  let targetId = "";
  let targetName = "";
  let targetCity = "";

  if (typeof input === "string") {
    targetId = input.trim();
  } else if (input && typeof input === "object") {
    targetId = (input.id ?? "").trim();
    targetName = (input.name ?? "").trim().toLowerCase();
    targetCity = (input.cityName ?? "").trim().toLowerCase();
  }

  if (!targetId && !targetName) return false;

  const store = await readStore();
  store.localAreas = (store.localAreas ?? []) as unknown as typeof store.localAreas;
  const targetIdLower = targetId.toLowerCase();
  const cleanId = targetId.replace(/^mem_area_\d+_/, "").toLowerCase();
  const slugified = slugify(targetId).toLowerCase();

  const initialLength = store.localAreas.length;
  store.localAreas = store.localAreas.filter((a) => {
    const area = a as LocalAreaRecord;
    const aId = String(area._id ?? "");
    const aSlug = String(area.slug ?? "").toLowerCase();
    const aName = String(area.name ?? "").trim().toLowerCase();
    const aCity = String(area.cityName ?? "").trim().toLowerCase();

    // If city is specified, require city to match
    if (targetCity && aCity && aCity !== targetCity) {
      return true;
    }

    const matchesId =
      targetId &&
      (aId === targetId ||
        aSlug === targetIdLower ||
        aSlug === slugified ||
        aSlug === cleanId ||
        aName === targetIdLower);

    const matchesName =
      targetName &&
      (aName === targetName || aSlug === slugify(targetName));

    return !(matchesId || matchesName);
  });

  if (store.localAreas.length === initialLength) return false;

  await writeStore(store);
  invalidateLocalAreasCache();
  return true;
}

export async function validateLocationsJson(json: unknown): Promise<JsonValidationResult> {
  if (!json || typeof json !== "object") {
    return {
      valid: false,
      error: "Invalid JSON: Root must be an object or array of States.",
    };
  }

  type RawStateEntry = {
    name: string;
    slug?: string;
    val: Record<string, unknown>;
  };

  const rawStates: RawStateEntry[] = [];

  if (Array.isArray(json)) {
    if (json.length === 0) {
      return {
        valid: false,
        error: "JSON is empty: Must contain at least one State.",
      };
    }
    for (let i = 0; i < json.length; i++) {
      const item = json[i];
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return {
          valid: false,
          error: `Invalid format at State array index ${i}: Element must be an object.`,
        };
      }
      const itemObj = item as Record<string, unknown>;
      const sName = String(itemObj.name || itemObj.stateName || itemObj.state || "").trim();
      if (!sName) {
        return {
          valid: false,
          error: `Invalid format at State array index ${i}: State name cannot be empty.`,
        };
      }
      rawStates.push({
        name: sName,
        slug: itemObj.slug ? String(itemObj.slug).trim() : undefined,
        val: itemObj,
      });
    }
  } else {
    const root = json as Record<string, unknown>;
    const stateKeys = Object.keys(root);

    if (stateKeys.length === 0) {
      return {
        valid: false,
        error: "JSON is empty: Must contain at least one State.",
      };
    }

    for (const stateKey of stateKeys) {
      const stateName = stateKey.trim();
      if (!stateName) {
        return {
          valid: false,
          error: `Invalid format: State name cannot be empty.`,
        };
      }
      const stateVal = root[stateKey];
      if (!stateVal || typeof stateVal !== "object" || Array.isArray(stateVal)) {
        return {
          valid: false,
          error: `Invalid format at State "${stateName}": Value must be an object of Cities or State details.`,
        };
      }
      rawStates.push({
        name: stateName,
        val: stateVal as Record<string, unknown>,
      });
    }
  }

  const parsedData: ParsedImportData = [];
  let totalLocalAreas = 0;
  let totalCities = 0;
  let stateSeoCount = 0;
  let citySeoCount = 0;
  let localAreaSeoCount = 0;

  const RESERVED_STATE_KEYS = new Set([
    "seo",
    "stateseo",
    "slug",
    "stateslug",
    "name",
    "statename",
    "_id",
    "id",
    "createdat",
    "updatedat",
    "cities",
  ]);

  for (const { name: stateName, slug: explicitStateSlug, val: stateVal } of rawStates) {
    const stateSlug = explicitStateSlug || (stateVal.slug ? String(stateVal.slug).trim() : slugify(stateName));

    // Extract State SEO if provided
    let stateSeo: StateSeo | undefined = undefined;
    const rawStateSeo =
      stateVal.seo ??
      stateVal.stateSeo ??
      stateVal.SEO ??
      (stateVal.title && (stateVal.description || stateVal.keywords) ? stateVal : undefined);

    if (rawStateSeo && typeof rawStateSeo === "object" && !Array.isArray(rawStateSeo)) {
      const normalizedStateSeo = normalizeStateSeoDoc({
        ...(rawStateSeo as Record<string, unknown>),
        slug: stateSlug,
        name: stateName,
      });
      if (
        normalizedStateSeo.title ||
        normalizedStateSeo.description ||
        normalizedStateSeo.keywords ||
        normalizedStateSeo.primaryKeyword ||
        (normalizedStateSeo.content && normalizedStateSeo.content.length > 0) ||
        (normalizedStateSeo.faqs && normalizedStateSeo.faqs.length > 0)
      ) {
        stateSeo = normalizedStateSeo;
        stateSeoCount++;
      }
    }

    // Extract Cities
    type RawCityEntry = {
      name: string;
      slug?: string;
      val: Record<string, unknown>;
    };
    const rawCities: RawCityEntry[] = [];

    const explicitCities = stateVal.cities;
    if (explicitCities && typeof explicitCities === "object") {
      if (Array.isArray(explicitCities)) {
        for (let i = 0; i < explicitCities.length; i++) {
          const cItem = explicitCities[i];
          if (!cItem || typeof cItem !== "object" || Array.isArray(cItem)) {
            return {
              valid: false,
              error: `Invalid format in State "${stateName}" -> cities[${i}]: City must be an object.`,
            };
          }
          const cObj = cItem as Record<string, unknown>;
          const cName = String(cObj.name || cObj.cityName || "").trim();
          if (!cName) {
            return {
              valid: false,
              error: `Invalid format in State "${stateName}" -> cities[${i}]: City name cannot be empty.`,
            };
          }
          rawCities.push({
            name: cName,
            slug: cObj.slug ? String(cObj.slug).trim() : undefined,
            val: cObj,
          });
        }
      } else {
        const cObjDict = explicitCities as Record<string, unknown>;
        for (const cKey of Object.keys(cObjDict)) {
          const cVal = cObjDict[cKey];
          if (!cVal || typeof cVal !== "object" || Array.isArray(cVal)) {
            return {
              valid: false,
              error: `Invalid format in State "${stateName}" -> City "${cKey}": Value must be an object.`,
            };
          }
          rawCities.push({
            name: cKey.trim(),
            val: cVal as Record<string, unknown>,
          });
        }
      }
    } else {
      // Direct keys on state object (excluding reserved state keys)
      for (const key of Object.keys(stateVal)) {
        if (RESERVED_STATE_KEYS.has(key.toLowerCase().trim())) continue;
        const val = stateVal[key];
        if (val && typeof val === "object" && !Array.isArray(val)) {
          rawCities.push({
            name: key.trim(),
            val: val as Record<string, unknown>,
          });
        }
      }
    }

    const stateCities: ParsedCityItem[] = [];

    for (const { name: cityName, slug: explicitCitySlug, val: cityVal } of rawCities) {
      if (!cityName) {
        return {
          valid: false,
          error: `Invalid format in State "${stateName}": City name cannot be empty.`,
        };
      }

      const citySlug = explicitCitySlug || (cityVal.slug ? String(cityVal.slug).trim() : slugify(cityName));

      // Extract City SEO if provided
      let citySeo: CitySeo | undefined = undefined;
      const rawCitySeo =
        cityVal.seo ??
        cityVal.citySeo ??
        cityVal.SEO ??
        (cityVal.title && (cityVal.description || cityVal.keywords || cityVal.primaryKeyword)
          ? cityVal
          : undefined);

      if (rawCitySeo && typeof rawCitySeo === "object" && !Array.isArray(rawCitySeo)) {
        const normalizedCitySeo = normalizeSeoDoc({
          ...(rawCitySeo as Record<string, unknown>),
          slug: citySlug,
          name: cityName,
        });
        if (
          normalizedCitySeo.title ||
          normalizedCitySeo.description ||
          normalizedCitySeo.keywords ||
          normalizedCitySeo.primaryKeyword ||
          normalizedCitySeo.canonicalUrl ||
          (normalizedCitySeo.content && normalizedCitySeo.content.length > 0) ||
          (normalizedCitySeo.faqs && normalizedCitySeo.faqs.length > 0) ||
          normalizedCitySeo.status === "published"
        ) {
          citySeo = normalizedCitySeo;
          citySeoCount++;
        }
      }

      // Extract Local Areas
      const rawAreas =
        cityVal.localAreas ??
        cityVal["Local areas"] ??
        cityVal["Local Areas"] ??
        cityVal["local areas"] ??
        cityVal["local_areas"] ??
        cityVal.areas;

      const cityAreas: ParsedLocalAreaItem[] = [];

      if (Array.isArray(rawAreas)) {
        for (let i = 0; i < rawAreas.length; i++) {
          const areaItem = rawAreas[i];
          if (typeof areaItem === "string") {
            const areaName = areaItem.trim();
            if (!areaName) continue;
            cityAreas.push({
              name: areaName,
              slug: slugify(areaName),
            });
          } else if (areaItem && typeof areaItem === "object" && !Array.isArray(areaItem)) {
            const areaObj = areaItem as Record<string, unknown>;
            const areaName = String(areaObj.name || areaObj.areaName || areaObj.title || "").trim();
            if (!areaName) {
              return {
                valid: false,
                error: `Invalid local area at State "${stateName}" -> City "${cityName}" index ${i}: Area name must be non-empty.`,
              };
            }
            const areaSlug = areaObj.slug ? String(areaObj.slug).trim() : slugify(areaName);

            // Extract Local Area SEO if present
            let areaSeo: LocalAreaSeo | undefined = undefined;
            const rawAreaSeo =
              areaObj.seo ??
              areaObj.localAreaSeo ??
              areaObj.SEO ??
              (areaObj.mode || areaObj.title || areaObj.description ? areaObj : undefined);

            if (rawAreaSeo && typeof rawAreaSeo === "object" && !Array.isArray(rawAreaSeo)) {
              const normalizedAreaSeo = normalizeLocalAreaSeoDoc({
                ...(rawAreaSeo as Record<string, unknown>),
                citySlug,
                areaSlug,
                slug: areaSlug,
                name: areaName,
              });
              if (
                normalizedAreaSeo.mode === "individual" ||
                Boolean(
                  normalizedAreaSeo.title ||
                  normalizedAreaSeo.description ||
                  normalizedAreaSeo.keywords ||
                  normalizedAreaSeo.primaryKeyword ||
                  (normalizedAreaSeo.content && normalizedAreaSeo.content.length > 0) ||
                  (normalizedAreaSeo.faqs && normalizedAreaSeo.faqs.length > 0)
                )
              ) {
                areaSeo = normalizedAreaSeo;
                localAreaSeoCount++;
              }
            }

            cityAreas.push({
              name: areaName,
              slug: areaSlug,
              seo: areaSeo,
            });
          }
        }
      }

      stateCities.push({
        cityName,
        citySlug,
        region: cityVal.region ? String(cityVal.region).trim() : undefined,
        country: cityVal.country ? String(cityVal.country).trim() : "India",
        famousFood: cityVal.famousFood || cityVal.famous_food ? String(cityVal.famousFood || cityVal.famous_food).trim() : undefined,
        seoDescription: cityVal.seoDescription || cityVal.seo_description ? String(cityVal.seoDescription || cityVal.seo_description).trim() : undefined,
        seo: citySeo,
        localAreas: cityAreas,
      });

      totalCities++;
      totalLocalAreas += cityAreas.length;
    }

    parsedData.push({
      stateName,
      stateSlug,
      seo: stateSeo,
      cities: stateCities,
    });
  }

  // Calculate new vs existing records against current store
  const store = await readStore();
  const existingStates = (store.states ?? []) as Array<{ name?: string; slug?: string }>;
  const existingCities = (store.cities ?? []) as Array<{ name?: string; slug?: string; state?: string }>;
  const existingAreas = (store.localAreas ?? []) as unknown as LocalAreaRecord[];

  let newStates = 0;
  let newCities = 0;
  let newLocalAreas = 0;

  for (const s of parsedData) {
    const sSlugLower = s.stateSlug.toLowerCase();
    const sNameLower = s.stateName.toLowerCase();
    const stateExists = existingStates.some(
      (st) =>
        (st.slug && st.slug.toLowerCase() === sSlugLower) ||
        (st.name && st.name.trim().toLowerCase() === sNameLower)
    );
    if (!stateExists) newStates++;

    for (const c of s.cities) {
      const cSlugLower = c.citySlug.toLowerCase();
      const cNameLower = c.cityName.toLowerCase();
      const cityExists = existingCities.some(
        (ct) =>
          (ct.slug && ct.slug.toLowerCase() === cSlugLower) ||
          (ct.name &&
            ct.name.trim().toLowerCase() === cNameLower &&
            ct.state &&
            ct.state.trim().toLowerCase() === sNameLower)
      );
      if (!cityExists) newCities++;

      for (const a of c.localAreas) {
        const aSlugLower = a.slug.toLowerCase();
        const aNameLower = a.name.toLowerCase();
        const areaExists = existingAreas.some(
          (ar) =>
            ar.citySlug?.toLowerCase() === cSlugLower &&
            (ar.slug?.toLowerCase() === aSlugLower || ar.name?.trim().toLowerCase() === aNameLower)
        );
        if (!areaExists) newLocalAreas++;
      }
    }
  }

  return {
    valid: true,
    summary: {
      totalStates: parsedData.length,
      totalCities,
      totalLocalAreas,
      newStates,
      newCities,
      newLocalAreas,
      stateSeoCount,
      citySeoCount,
      localAreaSeoCount,
    },
    data: parsedData,
  };
}

export async function importLocationsJson(json: unknown): Promise<{
  success: boolean;
  summary: JsonImportSummary;
}> {
  const validation = await validateLocationsJson(json);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const { data, summary } = validation;
  const store = await readStore();
  const db = await getDb();

  store.states = (store.states ?? []) as unknown as typeof store.states;
  store.cities = (store.cities ?? []) as unknown as typeof store.cities;
  store.localAreas = (store.localAreas ?? []) as unknown as typeof store.localAreas;
  store.citySeo = (store.citySeo ?? []) as unknown as typeof store.citySeo;
  store.localAreaSeo = (store.localAreaSeo ?? []) as unknown as typeof store.localAreaSeo;
  store.stateSeo = (store.stateSeo ?? []) as unknown as typeof store.stateSeo;

  const states = store.states as Array<{ _id?: string; name: string; slug: string; createdAt: Date | string }>;
  const cities = store.cities as Array<{
    _id?: string;
    name: string;
    slug: string;
    state?: string;
    region: string;
    country?: string;
    famousFood: string;
    seoDescription: string;
    createdAt: Date | string;
  }>;
  const localAreas = store.localAreas as unknown as LocalAreaRecord[];
  const citySeoList = store.citySeo as unknown as CitySeo[];
  const localAreaSeoList = store.localAreaSeo as unknown as LocalAreaSeo[];
  const stateSeoList = store.stateSeo as unknown as StateSeo[];

  const citySeoBulkOps: Array<{ updateOne: { filter: Record<string, unknown>; update: Record<string, unknown>; upsert: boolean } }> = [];
  const localAreaSeoBulkOps: Array<{ updateOne: { filter: Record<string, unknown>; update: Record<string, unknown>; upsert: boolean } }> = [];
  const stateSeoBulkOps: Array<{ updateOne: { filter: Record<string, unknown>; update: Record<string, unknown>; upsert: boolean } }> = [];

  for (const s of data) {
    const trimmedStateName = s.stateName.trim();
    const stateSlug = s.stateSlug || slugify(trimmedStateName) || `state-${Date.now()}`;
    const sNameLower = trimmedStateName.toLowerCase();
    const sSlugLower = stateSlug.toLowerCase();

    // Un-delete state if it was in deletedStates
    store.deletedStates = (store.deletedStates ?? []).filter((del: string) => {
      const v = del.trim().toLowerCase();
      return v !== sNameLower && v !== sSlugLower;
    });

    let existingState = states.find(
      (st) =>
        st.slug.toLowerCase() === sSlugLower ||
        st.name?.trim().toLowerCase() === sNameLower
    );

    if (!existingState) {
      existingState = {
        _id: `mem_state_${states.length + 1}_${Date.now()}`,
        name: trimmedStateName,
        slug: stateSlug,
        createdAt: new Date(),
      };
      states.push(existingState);
    } else {
      existingState.name = trimmedStateName;
      existingState.slug = stateSlug;
    }

    // Handle State SEO
    if (s.seo) {
      const stateSeoDoc: StateSeo = {
        ...s.seo,
        slug: stateSlug,
        name: trimmedStateName,
        updatedAt: new Date().toISOString(),
      };
      const existingSeoIdx = stateSeoList.findIndex((item) => item.slug.toLowerCase() === sSlugLower);
      if (existingSeoIdx >= 0) {
        stateSeoList[existingSeoIdx] = stateSeoDoc;
      } else {
        stateSeoList.push(stateSeoDoc);
      }
      stateSeoBulkOps.push({
        updateOne: {
          filter: { slug: stateSlug },
          update: { $set: stateSeoDoc },
          upsert: true,
        },
      });
    }

    for (const c of s.cities) {
      const trimmedCityName = c.cityName.trim();
      const citySlug = c.citySlug || slugify(trimmedCityName) || `city-${Date.now()}`;
      const cSlugLower = citySlug.toLowerCase();
      const cNameLower = trimmedCityName.toLowerCase();

      // Un-delete city from deletedCities
      store.deletedCities = (store.deletedCities ?? []).filter((del: string) => {
        const v = del.trim().toLowerCase();
        return v !== cSlugLower && v !== cNameLower;
      });

      let existingCity = cities.find(
        (ct) =>
          ct.slug.toLowerCase() === cSlugLower ||
          (ct.name?.trim().toLowerCase() === cNameLower &&
            ct.state?.trim().toLowerCase() === sNameLower)
      );

      if (!existingCity) {
        existingCity = {
          _id: `mem_city_${cities.length + 1}_${Date.now()}`,
          name: trimmedCityName,
          slug: citySlug,
          state: trimmedStateName,
          region: c.region || trimmedStateName || "India",
          country: c.country || "India",
          famousFood: c.famousFood || "",
          seoDescription: c.seoDescription || "",
          createdAt: new Date(),
        };
        cities.push(existingCity);
      } else {
        existingCity.name = trimmedCityName;
        existingCity.state = trimmedStateName;
        if (c.region) existingCity.region = c.region;
        if (c.country) existingCity.country = c.country;
        if (c.famousFood) existingCity.famousFood = c.famousFood;
        if (c.seoDescription) existingCity.seoDescription = c.seoDescription;
      }

      // Handle City SEO
      if (c.seo) {
        const citySeoDoc: CitySeo = {
          ...c.seo,
          slug: citySlug,
          name: trimmedCityName,
          updatedAt: new Date().toISOString(),
        };
        const existingCitySeoIdx = citySeoList.findIndex(
          (item) => item.slug.toLowerCase() === cSlugLower || item.urlSlug?.toLowerCase() === cSlugLower
        );
        if (existingCitySeoIdx >= 0) {
          citySeoList[existingCitySeoIdx] = citySeoDoc;
        } else {
          citySeoList.push(citySeoDoc);
        }
        citySeoBulkOps.push({
          updateOne: {
            filter: { slug: citySlug },
            update: { $set: citySeoDoc },
            upsert: true,
          },
        });
      }

      for (const a of c.localAreas) {
        const trimmedAreaName = a.name.trim();
        const areaSlug = a.slug || slugify(trimmedAreaName) || `area-${Date.now()}`;
        const aSlugLower = areaSlug.toLowerCase();
        const aNameLower = trimmedAreaName.toLowerCase();

        const existingArea = localAreas.find(
          (ar) =>
            (ar.citySlug?.toLowerCase() === cSlugLower || slugify(ar.cityName) === cSlugLower) &&
            (ar.slug.toLowerCase() === aSlugLower || ar.name?.trim().toLowerCase() === aNameLower)
        );

        if (!existingArea) {
          const newArea: LocalAreaRecord = {
            _id: `mem_area_${localAreas.length + 1}_${Date.now()}`,
            name: trimmedAreaName,
            slug: areaSlug,
            cityName: trimmedCityName,
            citySlug,
            stateName: trimmedStateName,
            stateSlug,
            createdAt: new Date(),
          };
          localAreas.push(newArea);
        } else {
          existingArea.name = trimmedAreaName;
          existingArea.cityName = trimmedCityName;
          existingArea.citySlug = citySlug;
          existingArea.stateName = trimmedStateName;
          existingArea.stateSlug = stateSlug;
        }

        // Handle Local Area SEO
        if (a.seo) {
          const localAreaSeoDoc: LocalAreaSeo = {
            ...a.seo,
            citySlug,
            areaSlug,
            slug: areaSlug,
            name: trimmedAreaName,
            mode: a.seo.mode || "individual",
            updatedAt: new Date().toISOString(),
          };
          const existingAreaSeoIdx = localAreaSeoList.findIndex(
            (item) =>
              item.citySlug.toLowerCase() === cSlugLower &&
              (item.areaSlug.toLowerCase() === aSlugLower || item.slug.toLowerCase() === aSlugLower)
          );
          if (existingAreaSeoIdx >= 0) {
            localAreaSeoList[existingAreaSeoIdx] = localAreaSeoDoc;
          } else {
            localAreaSeoList.push(localAreaSeoDoc);
          }
          localAreaSeoBulkOps.push({
            updateOne: {
              filter: { citySlug: citySlug.toLowerCase(), areaSlug: areaSlug.toLowerCase() },
              update: { $set: localAreaSeoDoc },
              upsert: true,
            },
          });
        }
      }
    }
  }

  // Execute Mongo bulk writes if db is available
  if (db) {
    try {
      if (stateSeoBulkOps.length > 0) {
        await db.collection("state_seo").bulkWrite(stateSeoBulkOps, { ordered: false });
      }
    } catch (err) {
      console.error("[localArea] Mongo state_seo bulkWrite failed:", err);
    }
    try {
      if (citySeoBulkOps.length > 0) {
        await db.collection("city_seo").bulkWrite(citySeoBulkOps, { ordered: false });
      }
    } catch (err) {
      console.error("[localArea] Mongo city_seo bulkWrite failed:", err);
    }
    try {
      if (localAreaSeoBulkOps.length > 0) {
        await db.collection("local_area_seo").bulkWrite(localAreaSeoBulkOps, { ordered: false });
      }
    } catch (err) {
      console.error("[localArea] Mongo local_area_seo bulkWrite failed:", err);
    }
  }

  await writeStore(store);
  invalidateStoreCache();
  invalidateCityCache();
  invalidateLocalAreasCache();
  invalidateCitySeoCache();
  invalidateStateSeoCache();

  return {
    success: true,
    summary,
  };
}

export async function exportLocationsJson(): Promise<LocationsExportSchema> {
  const [allStates, allCities, allLocalAreas, allCitySeos, allLocalAreaSeos, allStateSeos] =
    await Promise.all([
      listStates({ fresh: true }),
      listAllCities(true),
      listLocalAreas({ fresh: true }),
      getAllCitySeo(),
      getAllLocalAreaSeo(),
      getAllStateSeo(),
    ]);

  // Index City SEO
  const citySeoMap = new Map<string, CitySeo>();
  for (const cSeo of allCitySeos) {
    if (cSeo.slug) citySeoMap.set(cSeo.slug.toLowerCase().trim(), cSeo);
    if (cSeo.urlSlug) citySeoMap.set(cSeo.urlSlug.toLowerCase().trim(), cSeo);
    if (cSeo.name) citySeoMap.set(cSeo.name.toLowerCase().trim(), cSeo);
  }

  // Index Local Area SEO by `citySlug:areaSlug`
  const areaSeoMap = new Map<string, LocalAreaSeo>();
  for (const aSeo of allLocalAreaSeos) {
    const cSlug = (aSeo.citySlug || "").toLowerCase().trim();
    const aSlug = (aSeo.areaSlug || aSeo.slug || "").toLowerCase().trim();
    if (cSlug && aSlug) {
      areaSeoMap.set(`${cSlug}:${aSlug}`, aSeo);
    }
  }

  // Index State SEO
  const stateSeoMap = new Map<string, StateSeo>();
  for (const sSeo of allStateSeos) {
    if (sSeo.slug) stateSeoMap.set(sSeo.slug.toLowerCase().trim(), sSeo);
    if (sSeo.name) stateSeoMap.set(sSeo.name.toLowerCase().trim(), sSeo);
  }

  const result: LocationsExportSchema = {};

  // Sort states alphabetically
  const sortedStates = [...allStates].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""))
  );

  for (const s of sortedStates) {
    const stateName = s.name.trim();
    if (!stateName) continue;
    const stateSlug = s.slug || slugify(stateName);

    // Look up state SEO
    const matchedStateSeo =
      stateSeoMap.get(stateSlug.toLowerCase()) ||
      stateSeoMap.get(stateName.toLowerCase());

    const exportedStateSeo: Partial<StateSeo> | undefined =
      matchedStateSeo &&
      (matchedStateSeo.title ||
        matchedStateSeo.description ||
        matchedStateSeo.keywords ||
        matchedStateSeo.primaryKeyword ||
        (matchedStateSeo.content && matchedStateSeo.content.length > 0) ||
        (matchedStateSeo.faqs && matchedStateSeo.faqs.length > 0))
        ? {
            title: matchedStateSeo.title,
            description: matchedStateSeo.description,
            keywords: matchedStateSeo.keywords,
            primaryKeyword: matchedStateSeo.primaryKeyword,
            secondaryKeywords: matchedStateSeo.secondaryKeywords,
            longTailKeywords: matchedStateSeo.longTailKeywords,
            popularSearches: matchedStateSeo.popularSearches,
            canonicalUrl: matchedStateSeo.canonicalUrl,
            featuredImage: matchedStateSeo.featuredImage,
            imageAlt: matchedStateSeo.imageAlt,
            content: matchedStateSeo.content,
            faqs: matchedStateSeo.faqs,
            status: matchedStateSeo.status,
          }
        : undefined;

    // Find cities belonging to this state
    const sNameLower = stateName.toLowerCase();
    const sSlugLower = stateSlug.toLowerCase();
    const stateCities = allCities
      .filter((c) => {
        if (!c.state) return false;
        const cState = c.state.trim().toLowerCase();
        return cState === sNameLower || slugify(c.state).toLowerCase() === sSlugLower;
      })
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    const citiesObj: Record<string, ExportedCity> = {};

    for (const c of stateCities) {
      const cityName = c.name?.trim();
      if (!cityName) continue;
      const citySlug = c.slug || slugify(cityName);
      const cSlugLower = citySlug.toLowerCase();

      // Look up City SEO
      const matchedCitySeo =
        citySeoMap.get(cSlugLower) ||
        (c.name ? citySeoMap.get(c.name.toLowerCase().trim()) : undefined) ||
        citySeoMap.get(slugify(cityName).toLowerCase());

      const exportedCitySeo: Partial<CitySeo> | undefined =
        matchedCitySeo &&
        (matchedCitySeo.title ||
          matchedCitySeo.description ||
          matchedCitySeo.keywords ||
          matchedCitySeo.primaryKeyword ||
          matchedCitySeo.canonicalUrl ||
          (matchedCitySeo.content && matchedCitySeo.content.length > 0) ||
          (matchedCitySeo.faqs && matchedCitySeo.faqs.length > 0) ||
          matchedCitySeo.status === "published")
          ? {
              title: matchedCitySeo.title,
              description: matchedCitySeo.description,
              keywords: matchedCitySeo.keywords,
              urlSlug: matchedCitySeo.urlSlug,
              primaryKeyword: matchedCitySeo.primaryKeyword,
              secondaryKeywords: matchedCitySeo.secondaryKeywords,
              longTailKeywords: matchedCitySeo.longTailKeywords,
              popularSearches: matchedCitySeo.popularSearches,
              canonicalUrl: matchedCitySeo.canonicalUrl,
              featuredImage: matchedCitySeo.featuredImage,
              imageAlt: matchedCitySeo.imageAlt,
              content: matchedCitySeo.content,
              faqs: matchedCitySeo.faqs,
              status: matchedCitySeo.status,
            }
          : undefined;

      // Find local areas for this city
      const cityAreas = allLocalAreas
        .filter((a) => {
          const aCitySlug = (a.citySlug || "").toLowerCase();
          const aCityName = (a.cityName || "").trim().toLowerCase();
          const cityMatches =
            aCitySlug === cSlugLower ||
            aCityName === cityName.toLowerCase() ||
            slugify(a.cityName) === cSlugLower;

          if (!cityMatches) return false;
          if (!a.stateName) return true;
          const aState = a.stateName.trim().toLowerCase();
          return aState === sNameLower || slugify(a.stateName) === sSlugLower;
        })
        .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

      // Deduplicate areas by slug
      const seenAreaSlugs = new Set<string>();
      const exportedAreas: ExportedLocalArea[] = [];
      const legacyAreaNames: string[] = [];

      for (const a of cityAreas) {
        const areaName = a.name?.trim();
        if (!areaName) continue;
        const areaSlug = a.slug || slugify(areaName);
        const aSlugLower = areaSlug.toLowerCase();
        if (seenAreaSlugs.has(aSlugLower)) continue;
        seenAreaSlugs.add(aSlugLower);

        legacyAreaNames.push(areaName);

        // Look up Local Area SEO
        const matchedAreaSeo =
          areaSeoMap.get(`${cSlugLower}:${aSlugLower}`) ||
          areaSeoMap.get(`${slugify(cityName).toLowerCase()}:${aSlugLower}`) ||
          areaSeoMap.get(`${cSlugLower}:${slugify(areaName).toLowerCase()}`);

        const hasCustomAreaSeo =
          matchedAreaSeo &&
          (matchedAreaSeo.mode === "individual" ||
            Boolean(
              matchedAreaSeo.title ||
              matchedAreaSeo.description ||
              matchedAreaSeo.keywords ||
              matchedAreaSeo.primaryKeyword ||
              (matchedAreaSeo.content && matchedAreaSeo.content.length > 0) ||
              (matchedAreaSeo.faqs && matchedAreaSeo.faqs.length > 0)
            ));

        const exportedAreaSeo: Partial<LocalAreaSeo> | undefined = hasCustomAreaSeo
          ? {
              mode: matchedAreaSeo.mode,
              title: matchedAreaSeo.title,
              description: matchedAreaSeo.description,
              keywords: matchedAreaSeo.keywords,
              primaryKeyword: matchedAreaSeo.primaryKeyword,
              secondaryKeywords: matchedAreaSeo.secondaryKeywords,
              longTailKeywords: matchedAreaSeo.longTailKeywords,
              popularSearches: matchedAreaSeo.popularSearches,
              canonicalUrl: matchedAreaSeo.canonicalUrl,
              featuredImage: matchedAreaSeo.featuredImage,
              imageAlt: matchedAreaSeo.imageAlt,
              content: matchedAreaSeo.content,
              faqs: matchedAreaSeo.faqs,
              status: matchedAreaSeo.status,
            }
          : undefined;

        exportedAreas.push({
          name: areaName,
          slug: areaSlug,
          ...(exportedAreaSeo ? { seo: exportedAreaSeo } : {}),
        });
      }

      citiesObj[cityName] = {
        slug: citySlug,
        region: c.region || "",
        country: c.country || "India",
        famousFood: c.famousFood || "",
        seoDescription: c.seoDescription || "",
        ...(exportedCitySeo ? { seo: exportedCitySeo } : {}),
        localAreas: exportedAreas,
        "Local areas": legacyAreaNames,
      };
    }

    result[stateName] = {
      slug: stateSlug,
      ...(exportedStateSeo ? { seo: exportedStateSeo } : {}),
      cities: citiesObj,
    };
  }

  return result;
}

export async function updateLocalAreaName(data: {
  id?: string;
  oldName?: string;
  cityName?: string;
  newName: string;
}): Promise<LocalAreaRecord> {
  const trimmedNewName = data.newName.trim();
  if (!trimmedNewName) {
    throw new Error("Local area name cannot be empty.");
  }

  const store = await readStore();
  store.localAreas = store.localAreas ?? [];
  const localAreas = store.localAreas as unknown as LocalAreaRecord[];
  const newSlug = slugify(trimmedNewName) || `area-${Date.now()}`;
  const trimmedId = data.id?.trim() ?? "";
  const trimmedOldName = data.oldName?.trim() ?? "";
  const trimmedCity = data.cityName?.trim().toLowerCase() ?? "";

  const index = localAreas.findIndex((a) => {
    const aId = String(a._id ?? "");
    const aSlug = String(a.slug ?? "").toLowerCase();
    const aName = String(a.name ?? "").trim().toLowerCase();
    const aCity = String(a.cityName ?? "").trim().toLowerCase();
    const aCitySlug = String(a.citySlug ?? "").toLowerCase();

    const matchesId = trimmedId && (aId === trimmedId || aSlug === trimmedId.toLowerCase());
    const matchesName = trimmedOldName && aName === trimmedOldName.toLowerCase();
    const matchesCity = !trimmedCity || aCity === trimmedCity || aCitySlug === slugify(trimmedCity);

    return (matchesId || matchesName) && matchesCity;
  });

  if (index < 0) {
    throw new Error("Local area not found.");
  }

  const area = localAreas[index];
  const oldAreaName = area.name;
  const oldAreaSlug = area.slug;

  area.name = trimmedNewName;
  area.slug = newSlug;

  // Cascade to ads
  if (Array.isArray(store.ads)) {
    const oldNameLower = oldAreaName.toLowerCase();
    const oldSlugLower = oldAreaSlug.toLowerCase();
    for (const ad of store.ads) {
      if (ad && typeof ad === "object") {
        const adArea = String(ad.localArea ?? "").trim().toLowerCase();
        if (
          (oldNameLower && adArea === oldNameLower) ||
          (oldSlugLower && slugify(adArea) === oldSlugLower)
        ) {
          ad.localArea = trimmedNewName;
        }
      }
    }
  }

  await writeStore(store);
  invalidateLocalAreasCache();

  return area;
}

