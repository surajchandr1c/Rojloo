import "server-only";

import { Collection, Document, ObjectId } from "mongodb";
import { randomBytes } from "crypto";
import { getDb } from "../db";
import { readStore, writeStore } from "../persist";

export interface User {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  service?: string;
  coins?: number;
  passwordHash: string;
  sessionToken?: string;
  emailVerified?: boolean;
  otpHash?: string;
  otpExpires?: Date;
  otpAttempts?: number;
  otpLastSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type PublicUser = Omit<User, "passwordHash">;

export function normalizeEmail(email: string | null | undefined): string {
  return String(email ?? "").trim().toLowerCase();
}

// --- File-backed fallback (used when MongoDB is unreachable) ---
async function memoryFindByEmail(email: string): Promise<User | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const store = await readStore();
  return (
    (store.users.find(
      (u) => normalizeEmail(String(u.email)) === normalized
    ) as unknown as User) ?? null
  );
}

async function memoryFindById(id: string): Promise<User | null> {
  const store = await readStore();
  return (store.users.find((u) => u._id === id) as unknown as User) ?? null;
}

async function memoryFindBySessionToken(
  token: string
): Promise<User | null> {
  const store = await readStore();
  return (
    (store.users.find((u) => u.sessionToken === token) as unknown as User) ??
    null
  );
}

async function memoryCreateUser(
  data: Omit<User, "_id" | "createdAt" | "updatedAt">
): Promise<PublicUser> {
  const store = await readStore();
  const now = new Date();
  const user: User = {
    _id: `mem_${store.users.length + 1}_${Date.now()}`,
    ...data,
    email: normalizeEmail(data.email),
    coins: Number((data as User).coins ?? 0),
    createdAt: now,
    updatedAt: now,
  };
  store.users.push(user as unknown as (typeof store.users)[number]);
  await writeStore(store);
  return toPublicUser(user);
}

async function getUsersCollection(): Promise<Collection<Document> | null> {
  const db = await getDb();
  if (!db) return null;

  const collection = db.collection("users");
  try {
    await collection.createIndexes([
      { key: { email: 1 }, name: "email_unique", unique: true },
    ]);
  } catch {
    // Non-fatal: indexes may already exist or be unavailable.
  }
  return collection;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const collection = await getUsersCollection();
  if (!collection) return memoryFindByEmail(normalized);

  const doc = await collection.findOne({ email: normalized });
  return (doc as unknown as User) ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const collection = await getUsersCollection();
  if (!collection) return memoryFindById(id);

  let _id: ObjectId;
  try {
    _id = new ObjectId(id);
  } catch {
    return null;
  }

  const doc = await collection.findOne({ _id });
  return (doc as unknown as User) ?? null;
}

export async function findUserBySessionToken(
  token: string
): Promise<User | null> {
  if (!token) return null;

  const collection = await getUsersCollection();
  if (!collection) return memoryFindBySessionToken(token);

  const doc = await collection.findOne({ sessionToken: token });
  return (doc as unknown as User) ?? null;
}

export async function createUser(
  user: Omit<User, "_id" | "createdAt" | "updatedAt">
): Promise<PublicUser> {
  const collection = await getUsersCollection();
  if (!collection) return memoryCreateUser(user);

  const now = new Date();
  const doc = {
    ...user,
    email: normalizeEmail(user.email),
    coins: Number((user as User).coins ?? 0),
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  return {
    _id: result.insertedId.toString(),
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    service: doc.service,
    coins: Number(doc.coins ?? 0),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function issueUserSession(userId: string): Promise<string | null> {
  const token = randomBytes(32).toString("hex");
  const ok = await setUserSession(userId, token);
  return ok ? token : null;
}

export async function setUserSession(
  userId: string,
  token: string
): Promise<boolean> {
  const collection = await getUsersCollection();
  if (!collection) {
    const store = await readStore();
    const user = store.users.find((u) => u._id === userId) as User | undefined;
    if (!user) return false;
    user.sessionToken = token;
    user.updatedAt = new Date();
    await writeStore(store);
    return true;
  }

  let _id: ObjectId;
  try {
    _id = new ObjectId(userId);
  } catch {
    return false;
  }

  const result = await collection.findOneAndUpdate(
    { _id },
    {
      $set: {
        sessionToken: token,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );
  return Boolean(result);
}

export async function clearUserSession(token: string): Promise<void> {
  if (!token) return;

  const collection = await getUsersCollection();
  if (!collection) {
    const store = await readStore();
    const user = store.users.find((u) => u.sessionToken === token) as
      | User
      | undefined;
    if (user) {
      delete user.sessionToken;
      user.updatedAt = new Date();
      await writeStore(store);
    }
    return;
  }

  await collection.updateOne(
    { sessionToken: token },
    {
      $unset: { sessionToken: "" },
      $set: { updatedAt: new Date() },
    }
  );
}

export async function listUsers(): Promise<PublicUser[]> {
  const collection = await getUsersCollection();
  if (!collection) {
    const store = await readStore();
    return store.users.map(
      (u) => toPublicUser(u as unknown as User)
    );
  }

  const docs = await collection.find({}).sort({ createdAt: -1 }).toArray();
  return docs.map((doc) => toPublicUser(doc as unknown as User));
}

export async function updateUserCoins(userId: string, delta: number): Promise<boolean> {
  const numericDelta = Number(delta || 0);
  if (!Number.isFinite(numericDelta)) return false;

  const collection = await getUsersCollection();
  if (collection) {
    let _id: ObjectId;
    try {
      _id = new ObjectId(userId);
    } catch {
      return false;
    }

    // Use atomic $inc to prevent lost updates from concurrent requests.
    const result = await collection.findOneAndUpdate(
      { _id },
      {
        $inc: { coins: numericDelta },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: "after" }
    );
    return Boolean(result);
  }

  const store = await readStore();
  const user = store.users.find((u) => u._id === userId) as User | undefined;
  if (!user) return false;

  const currentCoins = Number(user.coins ?? 0);
  const nextCoins = currentCoins + numericDelta;
  user.coins = nextCoins;
  user.updatedAt = new Date();
  await writeStore(store);
  return true;
}

export async function deleteUser(id: string): Promise<boolean> {
  const collection = await getUsersCollection();
  if (!collection) {
    const store = await readStore();
    const index = store.users.findIndex((u) => u._id === id);
    if (index < 0) return false;
    store.users.splice(index, 1);
    await writeStore(store);
    return true;
  }

  let _id: ObjectId;
  try {
    _id = new ObjectId(id);
  } catch {
    return false;
  }

  const result = await collection.deleteOne({ _id });
  return result.deletedCount > 0;
}

export function updateUserFields(
  userId: string,
  fields: Record<string, unknown>
): Promise<boolean> {
  const collectionPromise = getUsersCollection();

  return collectionPromise.then((collection) => {
    if (!collection) {
      return readStore().then((store) => {
        const user = store.users.find((u) => u._id === userId) as
          | User
          | undefined;
        if (!user) return false;
        Object.assign(user, fields, { updatedAt: new Date() });
        return writeStore(store).then(() => true);
      });
    }

    let _id: ObjectId;
    try {
      _id = new ObjectId(userId);
    } catch {
      return false;
    }

    return collection
      .findOneAndUpdate(
        { _id },
        { $set: { ...fields, updatedAt: new Date() } },
        { returnDocument: "after" }
      )
      .then((result) => Boolean(result));
  });
}

/**
 * Store an OTP hash + expiry for a user, and record the time it was sent so we
 * can enforce the resend cooldown. Generating a new OTP resets the attempt count.
 */
export async function setUserOtp(
  userId: string,
  otpHash: string,
  ttlMs: number
): Promise<boolean> {
  return updateUserFields(userId, {
    otpHash,
    otpExpires: new Date(Date.now() + ttlMs),
    otpAttempts: 0,
    otpLastSentAt: new Date(),
  });
}

/**
 * Remove the stored OTP (after successful verification, expiry, or lockout).
 */
export async function clearUserOtp(userId: string): Promise<boolean> {
  return updateUserFields(userId, {
    otpHash: null,
    otpExpires: null,
    otpAttempts: 0,
  });
}

/**
 * Increment the number of failed verification attempts and return the new count.
 */
export async function incrementUserOtpAttempts(userId: string): Promise<number> {
  const collection = await getUsersCollection();
  if (!collection) {
    const store = await readStore();
    const user = store.users.find((u) => u._id === userId) as
      | User
      | undefined;
    if (!user) return 0;
    const attempts = Number(user.otpAttempts ?? 0) + 1;
    user.otpAttempts = attempts;
    user.updatedAt = new Date();
    await writeStore(store);
    return attempts;
  }

  let _id: ObjectId;
  try {
    _id = new ObjectId(userId);
  } catch {
    return -1;
  }

  const result = await collection.findOneAndUpdate(
    { _id },
    { $inc: { otpAttempts: 1 }, $set: { updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  const doc = result as unknown as { otpAttempts?: number } | null;
  return Number(doc?.otpAttempts ?? 1);
}

/**
 * Mark a user's email as verified.
 */
export async function setUserEmailVerified(
  userId: string,
  verified = true
): Promise<boolean> {
  return updateUserFields(userId, { emailVerified: verified });
}

export function toPublicUser(user: User): PublicUser {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    service: user.service,
    coins: Number(user.coins ?? 0),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
