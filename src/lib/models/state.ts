import "server-only";

import { readStore, writeStore } from "../persist";
import { cityPlaces } from "../places";

export type StateRecord = {
  _id?: string;
  name: string;
  slug: string;
  createdAt: Date | string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const DEFAULT_INDIAN_STATES: string[] = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export async function listStates(): Promise<StateRecord[]> {
  const store = await readStore();
  const customStates = (store.states ?? []) as unknown as StateRecord[];
  const existingNames = new Set(
    customStates.map((s) => s.name.trim().toLowerCase())
  );

  const combined: StateRecord[] = [...customStates];

  for (const name of DEFAULT_INDIAN_STATES) {
    if (!existingNames.has(name.toLowerCase())) {
      existingNames.add(name.toLowerCase());
      combined.push({
        _id: `static_state_${slugify(name)}`,
        name,
        slug: slugify(name),
        createdAt: new Date(0),
      });
    }
  }

  for (const c of cityPlaces) {
    if (c.state && !existingNames.has(c.state.trim().toLowerCase())) {
      existingNames.add(c.state.trim().toLowerCase());
      combined.push({
        _id: `static_state_${slugify(c.state.trim())}`,
        name: c.state.trim(),
        slug: slugify(c.state.trim()),
        createdAt: new Date(0),
      });
    }
  }

  return combined.sort((a, b) =>
    String(a.name).localeCompare(String(b.name))
  );
}

export async function createState(data: {
  name: string;
}): Promise<StateRecord> {
  const store = await readStore();
  const slug = slugify(data.name) || `state-${Date.now()}`;

  const states = store.states as unknown as StateRecord[];
  const existingIndex = states.findIndex((s) => s.slug === slug);
  if (existingIndex >= 0) {
    const existing = states[existingIndex];
    existing.name = data.name.trim();
    existing.createdAt = new Date();
    await writeStore(store);
    return existing;
  }

  const state: StateRecord = {
    _id: `mem_state_${states.length + 1}_${Date.now()}`,
    name: data.name.trim(),
    slug,
    createdAt: new Date(),
  };
  store.states.push(state as unknown as (typeof store.states)[number]);
  await writeStore(store);
  return state;
}

export async function deleteState(id: string): Promise<boolean> {
  const store = await readStore();
  const index = store.states.findIndex((s) => s._id === id);
  if (index < 0) return false;
  const stateName = String(store.states[index].name);
  store.states.splice(index, 1);

  const cities = store.cities as unknown as Array<{
    _id?: string;
    name?: string;
    slug?: string;
    state?: string;
  }>;
  store.cities = cities.filter(
    (c) => c.state !== stateName
  ) as unknown as typeof store.cities;

  await writeStore(store);
  return true;
}

export async function deleteAllLocations(): Promise<{
  deletedStates: number;
  deletedCities: number;
  deletedLocalAreas: number;
}> {
  const store = await readStore();
  const deletedStates = (store.states ?? []).length;
  const deletedCities = (store.cities ?? []).length;
  const deletedLocalAreas = (store.localAreas ?? []).length;

  store.states = [];
  store.cities = [];
  store.localAreas = [];

  await writeStore(store);

  return {
    deletedStates,
    deletedCities,
    deletedLocalAreas,
  };
}

