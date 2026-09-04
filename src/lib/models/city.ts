import { readStore, writeStore } from "../persist";
import { cityPlaces } from "../places";

export type CityRecord = {
  _id?: string;
  name: string;
  slug: string;
  state?: string;
  region: string;
  country?: string;
  famousFood: string;
  seoDescription: string;
  createdAt: Date | string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function listCities(): Promise<CityRecord[]> {
  const store = await readStore();
  const deleted = new Set(store.deletedCities ?? []);
  const cities = (store.cities ?? []) as unknown as CityRecord[];

  const bySlug = new Map<string, CityRecord>();
  for (const c of cities) {
    if (!c.slug || deleted.has(c.slug)) continue;
    const prev = bySlug.get(c.slug);
    if (
      !prev ||
      new Date(c.createdAt).getTime() > new Date(prev.createdAt).getTime()
    ) {
      bySlug.set(c.slug, c);
    }
  }

  return Array.from(bySlug.values()).sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return tb - ta;
  });
}

export async function isCityDeleted(slug: string): Promise<boolean> {
  const store = await readStore();
  return (store.deletedCities ?? []).includes(slug);
}

export async function getCityBySlug(slug: string): Promise<CityRecord | null> {
  const staticCity = cityPlaces.find((c) => c.slug === slug);
  if (staticCity) {
    if (await isCityDeleted(slug)) return null;
    return {
      _id: staticCity.slug,
      name: staticCity.name,
      slug: staticCity.slug,
      state: staticCity.state,
      region: staticCity.region,
      famousFood: staticCity.famousFood,
      seoDescription: staticCity.seoDescription,
      createdAt: new Date(0),
    };
  }

  const custom = (await listCities()).find((c) => c.slug === slug);
  return custom ?? null;
}

export async function getCustomCityBySlug(
  slug: string
): Promise<CityRecord | null> {
  return (await listCities()).find((c) => c.slug === slug) ?? null;
}

export type CombinedCity = CityRecord & { source: "Static" | "Custom" };

export async function listAllCities(): Promise<CombinedCity[]> {
  const store = await readStore();
  const deleted = new Set(store.deletedCities ?? []);

  const customCities: CombinedCity[] = (await listCities()).map((c) => ({
    ...c,
    source: "Custom" as const,
  }));
  const customSlugs = new Set(customCities.map((c) => c.slug));

  const staticCities: CombinedCity[] = cityPlaces
    .filter((c) => !deleted.has(c.slug) && !customSlugs.has(c.slug))
    .map((c) => ({
      _id: c.slug,
      name: c.name,
      slug: c.slug,
      state: c.state,
      region: c.region,
      famousFood: c.famousFood,
      seoDescription: c.seoDescription,
      createdAt: new Date(0),
      source: "Static" as const,
    }));

  return [...customCities, ...staticCities];
}

export async function createCity(data: {
  name: string;
  state?: string;
  region: string;
  country?: string;
  famousFood: string;
  seoDescription: string;
}): Promise<CityRecord> {
  const store = await readStore();
  const trimmedName = data.name.trim();
  const trimmedState = data.state?.trim() ?? "";
  const baseSlug = slugify(trimmedName) || `city-${Date.now()}`;

  const cities = store.cities as unknown as CityRecord[];
  
  // Check if same city already exists under the same state
  const existingSameStateIndex = cities.findIndex(
    (c) =>
      c.state?.trim().toLowerCase() === trimmedState.toLowerCase() &&
      (c.slug === baseSlug || c.name.trim().toLowerCase() === trimmedName.toLowerCase())
  );

  if (existingSameStateIndex >= 0) {
    const existing = cities[existingSameStateIndex];
    existing.name = trimmedName;
    existing.state = trimmedState;
    existing.region = data.region.trim() || trimmedState || "India";
    existing.country = data.country?.trim() ?? "India";
    existing.famousFood = data.famousFood.trim();
    existing.seoDescription = data.seoDescription.trim();
    existing.createdAt = new Date();
    await writeStore(store);
    return existing;
  }

  // If a city in another state has the same baseSlug, make slug unique with state suffix
  const slugTakenByOtherState = cities.some((c) => c.slug === baseSlug);
  const slug = slugTakenByOtherState && trimmedState
    ? `${baseSlug}-${slugify(trimmedState)}`
    : baseSlug;

  const city: CityRecord = {
    _id: `mem_city_${store.cities.length + 1}_${Date.now()}`,
    name: trimmedName,
    slug,
    state: trimmedState,
    region: data.region.trim() || trimmedState || "India",
    country: data.country?.trim() || "India",
    famousFood: data.famousFood.trim(),
    seoDescription: data.seoDescription.trim(),
    createdAt: new Date(),
  };
  store.cities.push(city as unknown as (typeof store.cities)[number]);
  store.deletedCities = (store.deletedCities ?? []).filter(
    (s) => s !== city.slug
  );
  await writeStore(store);

  const storeAfterWrite = await readStore();
  const persisted = storeAfterWrite.cities.find(
    (c) => String(c.slug) === city.slug
  );
  if (!persisted) {
    throw new Error("City was not persisted to the store.");
  }
  return city;
}

export async function deleteCity(id: string): Promise<boolean> {
  const store = await readStore();
  const index = store.cities.findIndex((c) => c._id === id);
  if (index >= 0) {
    store.cities.splice(index, 1);
    await writeStore(store);
    return true;
  }

  const slug = id;
  const staticCity = (await import("../places")).cityPlaces.find(
    (c) => c.slug === slug
  );
  if (!staticCity) return false;
  store.deletedCities = store.deletedCities ?? [];
  if (!store.deletedCities.includes(slug)) {
    store.deletedCities.push(slug);
    await writeStore(store);
  }
  return true;
}

export async function deleteCities(ids: string[]): Promise<number> {
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) return 0;

  const store = await readStore();
  const customIds = new Set(
    store.cities
      .filter((city) => uniqueIds.includes(String(city._id)))
      .map((city) => String(city._id))
  );
  const remainingCities = store.cities.filter(
    (city) => !customIds.has(String(city._id))
  );
  const deletedCustomCount = store.cities.length - remainingCities.length;

  const staticSlugs = new Set(
    cityPlaces
      .filter((city) => uniqueIds.includes(city.slug))
      .map((city) => city.slug)
  );
  const deletedCities = new Set(store.deletedCities ?? []);
  staticSlugs.forEach((slug) => deletedCities.add(slug));

  if (deletedCustomCount === 0 && staticSlugs.size === 0) return 0;

  store.cities = remainingCities;
  store.deletedCities = [...deletedCities];
  await writeStore(store);
  return deletedCustomCount + staticSlugs.size;
}
