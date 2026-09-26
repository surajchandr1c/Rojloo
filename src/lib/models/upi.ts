import { readStore, writeStore } from "../persist";

function cleanEnv(val?: string): string {
  return (val ?? "").trim().replace(/^['"]|['"]$/g, "");
}

export const DEFAULT_UPI = {
  upiId: cleanEnv(process.env.DEFAULT_UPI_ID) || "surajkumar40407@ybl",
  name: cleanEnv(process.env.DEFAULT_UPI_NAME) || "suraj",
  qrCode: cleanEnv(process.env.DEFAULT_UPI_QR) || "/surajkumar40407@ybl.jpeg",
} as const;

export type UPIRecord = {
  _id?: string;
  upiId: string;
  name: string;
  qrCode: string;
  active?: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string;
};

export async function ensureDefaultUPI(): Promise<UPIRecord | null> {
  const store = await readStore();
  const upis: UPIRecord[] = ((store.upis ?? []) as unknown as UPIRecord[]).map((upi) => ({
    ...upi,
    active: upi.active !== false,
  }));

  const hasDefault = upis.some(
    (upi) => upi.upiId.toLowerCase() === DEFAULT_UPI.upiId.toLowerCase()
  );

  if (hasDefault) {
    return upis.find(
      (upi) => upi.upiId.toLowerCase() === DEFAULT_UPI.upiId.toLowerCase()
    ) ?? null;
  }

  // If admin has previously managed/cleared UPIs, do not forcefully resurrect
  if ((store as Record<string, unknown>).upiInitialized && upis.length > 0) {
    return null;
  }

  const defaultUPI: UPIRecord = {
    _id: "default-upi",
    ...DEFAULT_UPI,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  upis.unshift(defaultUPI);
  store.upis = upis;
  await writeStore(store);

  return defaultUPI;
}

export async function listUPIs(): Promise<UPIRecord[]> {
  const store = await readStore();
  let upis: UPIRecord[] = ((store.upis ?? []) as unknown as UPIRecord[]).map((upi) => ({
    ...upi,
    active: upi.active !== false,
  }));

  if (upis.length === 0 && !(store as Record<string, unknown>).upiInitialized) {
    const defaultUPI = await ensureDefaultUPI();
    if (defaultUPI) {
      upis = [defaultUPI];
    }
  }

  // Deduplicate by lowercase upiId and ensure unique _id across all records
  const seenUpiIds = new Set<string>();
  const seenIds = new Set<string>();
  const uniqueUpis: UPIRecord[] = [];

  for (const u of upis) {
    const upiIdKey = (u.upiId || "").trim().toLowerCase();
    if (!upiIdKey || seenUpiIds.has(upiIdKey)) {
      continue;
    }
    seenUpiIds.add(upiIdKey);

    let idKey = (u._id || "").trim();
    if (!idKey || seenIds.has(idKey)) {
      idKey = `upi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      u._id = idKey;
    }
    seenIds.add(idKey);
    uniqueUpis.push(u);
  }

  if (uniqueUpis.length !== upis.length) {
    store.upis = uniqueUpis;
    await writeStore(store);
  }

  return uniqueUpis.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return tb - ta;
  });
}

export async function createUPI(upi: {
  upiId: string;
  name: string;
  qrCode: string;
  active?: boolean;
}): Promise<UPIRecord> {
  const store = await readStore();
  const upis = (store.upis ?? []) as unknown as UPIRecord[];

  const newUPI: UPIRecord = {
    _id: `upi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    upiId: upi.upiId.trim(),
    name: upi.name.trim(),
    qrCode: upi.qrCode || DEFAULT_UPI.qrCode,
    active: upi.active !== false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  upis.push(newUPI);
  store.upis = upis;
  (store as Record<string, unknown>).upiInitialized = true;
  await writeStore(store);

  return newUPI;
}

export async function updateUPI(
  id: string,
  updates: Partial<{ upiId: string; name: string; qrCode: string; active: boolean }>
): Promise<UPIRecord | null> {
  const store = await readStore();
  const upis = (store.upis ?? []) as unknown as UPIRecord[];

  let index = upis.findIndex((u) => u._id === id);
  if (index === -1 && (id === "default-upi" || id.includes("@"))) {
    index = upis.findIndex(
      (u) =>
        u.upiId.toLowerCase() === id.toLowerCase() ||
        u.upiId.toLowerCase() === DEFAULT_UPI.upiId.toLowerCase()
    );
  }

  if (index === -1) {
    // If updating a record that wasn't found in store, create and persist it
    const newUPI: UPIRecord = {
      _id: id || `upi_${Date.now()}`,
      upiId: (updates.upiId || DEFAULT_UPI.upiId).trim(),
      name: (updates.name || DEFAULT_UPI.name).trim(),
      qrCode: updates.qrCode || DEFAULT_UPI.qrCode,
      active: updates.active !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    upis.push(newUPI);
    store.upis = upis;
    (store as Record<string, unknown>).upiInitialized = true;
    await writeStore(store);
    return newUPI;
  }

  const upi = upis[index];
  upis[index] = {
    ...upi,
    upiId: updates.upiId !== undefined ? updates.upiId.trim() : upi.upiId,
    name: updates.name !== undefined ? updates.name.trim() : upi.name,
    qrCode: updates.qrCode !== undefined && updates.qrCode ? updates.qrCode : upi.qrCode,
    active: typeof updates.active === "boolean" ? updates.active : upi.active !== false,
    updatedAt: new Date(),
  };

  store.upis = upis;
  (store as Record<string, unknown>).upiInitialized = true;
  await writeStore(store);
  return upis[index];
}

export async function setUPIActive(
  id: string,
  active: boolean
): Promise<UPIRecord | null> {
  return updateUPI(id, { active });
}

export async function deleteUPI(id: string): Promise<boolean> {
  const store = await readStore();
  const upis = (store.upis ?? []) as unknown as UPIRecord[];

  let index = upis.findIndex((u) => u._id === id);
  if (index === -1) {
    index = upis.findIndex(
      (u) =>
        u.upiId.toLowerCase() === id.toLowerCase() ||
        (id === "default-upi" && u.upiId.toLowerCase() === DEFAULT_UPI.upiId.toLowerCase())
    );
  }

  if (index !== -1) {
    upis.splice(index, 1);
  }

  store.upis = upis;
  (store as Record<string, unknown>).upiInitialized = true;
  await writeStore(store);

  return true;
}

export async function listActiveUPIs(): Promise<UPIRecord[]> {
  return (await listUPIs()).filter((upi) => upi.active !== false);
}

export async function getNextUPIForPayment(): Promise<UPIRecord | null> {
  const activeUpis = await listActiveUPIs();
  if (activeUpis.length === 0) {
    const defaultUPI = await ensureDefaultUPI();
    return defaultUPI && defaultUPI.active !== false ? defaultUPI : null;
  }

  const store = await readStore();
  const rotation = (store.upiRotation ?? { index: 0, requestCount: 0 }) as {
    index: number;
    requestCount: number;
  };

  const currentIndex = Math.abs(rotation.index ?? 0) % activeUpis.length;
  const selected = activeUpis[currentIndex];
  const nextRequestCount = (rotation.requestCount ?? 0) + 1;
  const nextIndex = nextRequestCount % 10 === 0 ? (currentIndex + 1) % activeUpis.length : currentIndex;

  store.upiRotation = {
    index: nextIndex,
    requestCount: nextRequestCount,
  };
  await writeStore(store);

  return selected;
}

export async function getUPIById(id: string): Promise<UPIRecord | null> {
  const store = await readStore();
  const upis = (store.upis ?? []) as unknown as UPIRecord[];

  return (
    upis.find(
      (u) =>
        u._id === id ||
        u.upiId.toLowerCase() === id.toLowerCase() ||
        (id === "default-upi" && u.upiId.toLowerCase() === DEFAULT_UPI.upiId.toLowerCase())
    ) || null
  );
}
