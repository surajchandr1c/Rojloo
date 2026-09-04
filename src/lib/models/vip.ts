import { readStore, writeStore } from "@/lib/persist";

export type CityVipAssignment = {
  _id?: string;
  cityName: string;
  citySlug?: string;
  email: string;
  status: "pending" | "active" | "inactive" | "expired";
  assignedBy?: string;
  assignedAt: Date | string;
  expiresAt: Date | string;
  lastReminderSentAt?: Date | string;
  createdAt: Date | string;
  updatedAt?: Date | string;
};

function normalizeVipStatus(status?: string): CityVipAssignment["status"] {
  if (status === "pending") return "pending";
  if (status === "expired" || status === "inactive") return "inactive";
  return "active";
}

export async function listVipAssignments(): Promise<CityVipAssignment[]> {
  const store = await readStore();
  const items: CityVipAssignment[] = ((store.cityVipAssignments ?? []) as CityVipAssignment[]).map((item) => {
    const normalizedStatus = normalizeVipStatus(item.status);

    return {
      ...item,
      status: normalizedStatus,
    };
  });

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createVipAssignment(input: {
  cityName: string;
  citySlug?: string;
  email: string;
  assignedBy?: string;
  expiresInDays?: number;
}): Promise<CityVipAssignment> {
  const store = await readStore();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays ?? 7));

  const assignment: CityVipAssignment = {
    _id: `vip_${Date.now()}`,
    cityName: input.cityName,
    citySlug: input.citySlug,
    email: input.email.trim().toLowerCase(),
    status: "pending",
    assignedBy: input.assignedBy,
    assignedAt: new Date(),
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const items = (store.cityVipAssignments ?? []) as CityVipAssignment[];
  items.push(assignment);
  store.cityVipAssignments = items;
  await writeStore(store);

  return assignment;
}

export async function updateVipAssignment(
  id: string,
  updates: Partial<CityVipAssignment>
): Promise<CityVipAssignment | null> {
  const store = await readStore();
  const items = (store.cityVipAssignments ?? []) as CityVipAssignment[];
  const index = items.findIndex((item) => item._id === id);
  if (index === -1) return null;

  const nextStatus = updates.status ? normalizeVipStatus(updates.status) : items[index].status;

  const updated = {
    ...items[index],
    ...updates,
    status: nextStatus,
    updatedAt: new Date(),
  };

  items[index] = updated;
  store.cityVipAssignments = items;
  await writeStore(store);

  return updated;
}

export async function extendVipAssignment(
  id: string,
  days: number
): Promise<CityVipAssignment | null> {
  const store = await readStore();
  const items = (store.cityVipAssignments ?? []) as CityVipAssignment[];
  const index = items.findIndex((item) => item._id === id);
  if (index === -1) return null;

  const current = items[index];
  const nextExpiry = new Date(current.expiresAt);
  const adjustment = Number(days) || 0;
  nextExpiry.setDate(nextExpiry.getDate() + adjustment);

  const updated: CityVipAssignment = {
    ...current,
    expiresAt: nextExpiry,
    status: nextExpiry > new Date() ? "active" : "inactive",
    updatedAt: new Date(),
  };

  items[index] = updated;
  store.cityVipAssignments = items;
  await writeStore(store);

  return updated;
}

export async function deleteVipAssignment(id: string): Promise<boolean> {
  const store = await readStore();
  const items = (store.cityVipAssignments ?? []) as CityVipAssignment[];
  const index = items.findIndex((item) => item._id === id);
  if (index === -1) return false;

  items.splice(index, 1);
  store.cityVipAssignments = items;
  await writeStore(store);
  return true;
}

export async function getVipAssignmentsForCity(citySlug: string): Promise<CityVipAssignment[]> {
  const assignments = await listVipAssignments();
  return assignments.filter((item) => item.citySlug === citySlug);
}

export async function getVipAssignmentsForEmail(email: string): Promise<CityVipAssignment[]> {
  const assignments = await listVipAssignments();
  return assignments.filter((item) => item.email.toLowerCase() === email.trim().toLowerCase());
}

export async function syncVipStatus() {
  const items = await listVipAssignments();
  const now = new Date();

  for (const item of items) {
    const expiresAt = new Date(item.expiresAt);
    if (expiresAt < now && item.status !== "inactive") {
      await updateVipAssignment(String(item._id), { status: "inactive" });
    } else if (expiresAt >= now && item.status === "inactive") {
      await updateVipAssignment(String(item._id), { status: "active" });
    }
  }
}
