import "server-only";

import { cache } from "react";
import { readStore, writeStore } from "../persist";

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
};

export type JsonValidationResult =
  | { valid: true; summary: JsonImportSummary; data: ParsedImportData }
  | { valid: false; error: string };

type ParsedImportData = Array<{
  stateName: string;
  cities: Array<{
    cityName: string;
    localAreas: string[];
  }>;
}>;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const listLocalAreas = cache(async function (filters?: {
  cityName?: string;
  citySlug?: string;
  stateName?: string;
}): Promise<LocalAreaRecord[]> {
  const store = await readStore();
  let areas = ((store.localAreas ?? []) as unknown as LocalAreaRecord[]);

  if (filters?.citySlug) {
    const targetSlug = filters.citySlug.trim().toLowerCase();
    areas = areas.filter((a) => a.citySlug?.toLowerCase() === targetSlug);
  } else if (filters?.cityName) {
    const targetName = filters.cityName.trim().toLowerCase();
    areas = areas.filter((a) => a.cityName?.toLowerCase() === targetName);
  }

  if (filters?.stateName) {
    const targetState = filters.stateName.trim().toLowerCase();
    areas = areas.filter(
      (a) =>
        a.stateName?.toLowerCase() === targetState ||
        a.stateSlug?.toLowerCase() === slugify(targetState)
    );
  }

  return [...areas].sort((a, b) =>
    String(a.name).localeCompare(String(b.name))
  );
});

export async function createLocalArea(data: {
  name: string;
  cityName: string;
  stateName?: string;
}): Promise<LocalAreaRecord> {
  const trimmedName = data.name.trim();
  const trimmedCity = data.cityName.trim();
  const trimmedState = data.stateName?.trim() ?? "";

  if (!trimmedName) throw new Error("Local area name is required.");
  if (!trimmedCity) throw new Error("City name is required.");

  const store = await readStore();
  const areaSlug = slugify(trimmedName) || `area-${Date.now()}`;
  const citySlug = slugify(trimmedCity);
  const stateSlug = trimmedState ? slugify(trimmedState) : "";

  store.localAreas = (store.localAreas ?? []) as unknown as typeof store.localAreas;
  const existingAreas = store.localAreas as unknown as LocalAreaRecord[];

  const existingIndex = existingAreas.findIndex(
    (a) =>
      a.citySlug === citySlug &&
      (a.slug === areaSlug || a.name.toLowerCase() === trimmedName.toLowerCase())
  );

  if (existingIndex >= 0) {
    const existing = existingAreas[existingIndex];
    existing.name = trimmedName;
    if (trimmedState && !existing.stateName) {
      existing.stateName = trimmedState;
      existing.stateSlug = stateSlug;
    }
    await writeStore(store);
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
  return localArea;
}

export async function deleteLocalArea(id: string): Promise<boolean> {
  const trimmed = id.trim();
  if (!trimmed) return false;

  const store = await readStore();
  store.localAreas = (store.localAreas ?? []) as unknown as typeof store.localAreas;
  const trimmedLower = trimmed.toLowerCase();
  const slugified = slugify(trimmed);

  const index = store.localAreas.findIndex((a) => {
    const area = a as LocalAreaRecord;
    const aId = String(area._id ?? "");
    const aSlug = String(area.slug ?? "").toLowerCase();
    const aName = String(area.name ?? "").trim().toLowerCase();
    return (
      aId === trimmed ||
      aSlug === trimmedLower ||
      aSlug === slugified ||
      aName === trimmedLower
    );
  });

  if (index < 0) return false;

  store.localAreas.splice(index, 1);
  await writeStore(store);
  return true;
}

export async function validateLocationsJson(json: unknown): Promise<JsonValidationResult> {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return {
      valid: false,
      error: "Invalid JSON: Root must be an object representing States.",
    };
  }

  const root = json as Record<string, unknown>;
  const stateKeys = Object.keys(root);

  if (stateKeys.length === 0) {
    return {
      valid: false,
      error: "JSON is empty: Must contain at least one State.",
    };
  }

  const parsedData: ParsedImportData = [];
  let totalLocalAreas = 0;
  let totalCities = 0;

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
        error: `Invalid format at State "${stateName}": Value must be an object of Cities.`,
      };
    }

    const cityObj = stateVal as Record<string, unknown>;
    const cityKeys = Object.keys(cityObj);

    if (cityKeys.length === 0) {
      return {
        valid: false,
        error: `State "${stateName}" contains no cities.`,
      };
    }

    const stateCities: Array<{ cityName: string; localAreas: string[] }> = [];

    for (const cityKey of cityKeys) {
      const cityName = cityKey.trim();
      if (!cityName) {
        return {
          valid: false,
          error: `Invalid format in State "${stateName}": City name cannot be empty.`,
        };
      }

      const cityVal = cityObj[cityKey];
      if (!cityVal || typeof cityVal !== "object" || Array.isArray(cityVal)) {
        return {
          valid: false,
          error: `Invalid format at State "${stateName}" -> City "${cityName}": Value must be an object containing "Local areas".`,
        };
      }

      const cityData = cityVal as Record<string, unknown>;
      const localAreasRaw =
        cityData["Local areas"] ??
        cityData["local areas"] ??
        cityData["Local Areas"] ??
        cityData["localAreas"];

      if (!Array.isArray(localAreasRaw)) {
        return {
          valid: false,
          error: `Invalid format at State "${stateName}" -> City "${cityName}": "Local areas" must be an array of strings.`,
        };
      }

      const localAreas: string[] = [];
      for (let i = 0; i < localAreasRaw.length; i++) {
        const area = localAreasRaw[i];
        if (typeof area !== "string" || !area.trim()) {
          return {
            valid: false,
            error: `Invalid local area at State "${stateName}" -> City "${cityName}" index ${i}: Area name must be a non-empty string.`,
          };
        }
        localAreas.push(area.trim());
      }

      stateCities.push({
        cityName,
        localAreas,
      });

      totalCities++;
      totalLocalAreas += localAreas.length;
    }

    parsedData.push({
      stateName,
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
    const stateSlug = slugify(s.stateName);
    const stateExists = existingStates.some(
      (st) =>
        st.slug === stateSlug ||
        st.name?.trim().toLowerCase() === s.stateName.toLowerCase()
    );
    if (!stateExists) newStates++;

    for (const c of s.cities) {
      const citySlug = slugify(c.cityName);
      const cityExists = existingCities.some(
        (ct) =>
          ct.slug === citySlug ||
          (ct.name?.trim().toLowerCase() === c.cityName.toLowerCase() &&
            ct.state?.trim().toLowerCase() === s.stateName.toLowerCase())
      );
      if (!cityExists) newCities++;

      for (const a of c.localAreas) {
        const areaSlug = slugify(a);
        const areaExists = existingAreas.some(
          (ar) =>
            ar.citySlug === citySlug &&
            (ar.slug === areaSlug || ar.name?.trim().toLowerCase() === a.toLowerCase())
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

  store.states = (store.states ?? []) as unknown as typeof store.states;
  store.cities = (store.cities ?? []) as unknown as typeof store.cities;
  store.localAreas = (store.localAreas ?? []) as unknown as typeof store.localAreas;

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

  for (const s of data) {
    const trimmedStateName = s.stateName.trim();
    const stateSlug = slugify(trimmedStateName) || `state-${Date.now()}`;

    let existingState = states.find(
      (st) =>
        st.slug === stateSlug ||
        st.name?.trim().toLowerCase() === trimmedStateName.toLowerCase()
    );

    if (!existingState) {
      existingState = {
        _id: `mem_state_${states.length + 1}_${Date.now()}`,
        name: trimmedStateName,
        slug: stateSlug,
        createdAt: new Date(),
      };
      states.push(existingState);
    }

    for (const c of s.cities) {
      const trimmedCityName = c.cityName.trim();
      const citySlug = slugify(trimmedCityName) || `city-${Date.now()}`;

      let existingCity = cities.find(
        (ct) =>
          ct.slug === citySlug ||
          (ct.name?.trim().toLowerCase() === trimmedCityName.toLowerCase() &&
            ct.state?.trim().toLowerCase() === trimmedStateName.toLowerCase())
      );

      if (!existingCity) {
        existingCity = {
          _id: `mem_city_${cities.length + 1}_${Date.now()}`,
          name: trimmedCityName,
          slug: citySlug,
          state: trimmedStateName,
          region: "India",
          country: "India",
          famousFood: "",
          seoDescription: "",
          createdAt: new Date(),
        };
        cities.push(existingCity);
      } else if (!existingCity.state) {
        existingCity.state = trimmedStateName;
      }

      for (const areaName of c.localAreas) {
        const trimmedAreaName = areaName.trim();
        const areaSlug = slugify(trimmedAreaName) || `area-${Date.now()}`;

        const existingArea = localAreas.find(
          (ar) =>
            ar.citySlug === citySlug &&
            (ar.slug === areaSlug ||
              ar.name?.trim().toLowerCase() === trimmedAreaName.toLowerCase())
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
        }
      }
    }
  }

  await writeStore(store);

  return {
    success: true,
    summary,
  };
}

export type LocationsExportSchema = Record<
  string,
  Record<string, { "Local areas": string[] }>
>;

export async function exportLocationsJson(): Promise<LocationsExportSchema> {
  const store = await readStore();

  const states = (store.states ?? []) as Array<{ name?: string; slug?: string }>;
  const cities = (store.cities ?? []) as Array<{ name?: string; slug?: string; state?: string }>;
  const localAreas = (store.localAreas ?? []) as unknown as LocalAreaRecord[];

  const result: LocationsExportSchema = {};

  // Sort states deterministically
  const sortedStates = [...states].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""))
  );

  for (const s of sortedStates) {
    const stateName = s.name?.trim();
    if (!stateName) continue;

    if (!result[stateName]) {
      result[stateName] = {};
    }

    // Find cities belonging to this state
    const stateCities = cities
      .filter((c) => c.state?.trim().toLowerCase() === stateName.toLowerCase())
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    for (const c of stateCities) {
      const cityName = c.name?.trim();
      if (!cityName) continue;

      // Find local areas for this city
      const cityAreas = localAreas
        .filter(
          (a) =>
            a.cityName?.trim().toLowerCase() === cityName.toLowerCase() &&
            (!a.stateName || a.stateName.trim().toLowerCase() === stateName.toLowerCase())
        )
        .map((a) => a.name?.trim())
        .filter((name): name is string => Boolean(name))
        .sort((a, b) => a.localeCompare(b));

      // Deduplicate area names
      const uniqueAreas = Array.from(new Set(cityAreas));

      result[stateName][cityName] = {
        "Local areas": uniqueAreas,
      };
    }
  }

  return result;
}

