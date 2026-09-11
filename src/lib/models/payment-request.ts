import { Collection, Document, ObjectId } from "mongodb";
import { getDb } from "../db";
import { readStore, writeStore } from "../persist";
import { updateUserCoins } from "@/lib/models/user";

export type PaymentRequest = {
  _id?: string;
  userEmail: string;
  userId: string;
  transactionId: string;
  coins: number;
  amount: number;
  discount?: number;
  couponCode?: string;
  status: "pending" | "confirmed" | "declined";
  credited?: boolean;
  createdAt: Date | string;
  confirmedAt?: Date | string;
  declinedReason?: string;
  upiId?: string;
  upiName?: string;
};

let paymentIndexesCreated = false;

async function getPaymentRequestsCollection(): Promise<Collection<Document> | null> {
  const db = await getDb();
  if (!db) return null;
  const col = db.collection("payment_requests");
  if (!paymentIndexesCreated) {
    try {
      await col.createIndex({ createdAt: -1 });
      await col.createIndex({ userId: 1 });
      await col.createIndex({ userEmail: 1 });
      await col.createIndex({ transactionId: 1 });
      paymentIndexesCreated = true;
    } catch {
      // Non-fatal
    }
  }
  return col;
}

export async function listPaymentRequests(): Promise<PaymentRequest[]> {
  const col = await getPaymentRequestsCollection();
  if (col) {
    try {
      const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
      return docs.map((doc) => ({
        _id: doc._id.toString(),
        userEmail: String(doc.userEmail || ""),
        userId: String(doc.userId || ""),
        transactionId: String(doc.transactionId || ""),
        coins: Number(doc.coins || 0),
        amount: Number(doc.amount || 0),
        discount: doc.discount ? Number(doc.discount) : undefined,
        couponCode: doc.couponCode ? String(doc.couponCode) : undefined,
        status: (doc.status as "pending" | "confirmed" | "declined") || "pending",
        credited: Boolean(doc.credited),
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt || new Date().toISOString()),
        confirmedAt: doc.confirmedAt instanceof Date ? doc.confirmedAt.toISOString() : (doc.confirmedAt ? String(doc.confirmedAt) : undefined),
        declinedReason: doc.declinedReason ? String(doc.declinedReason) : undefined,
        upiId: doc.upiId ? String(doc.upiId) : undefined,
        upiName: doc.upiName ? String(doc.upiName) : undefined,
      }));
    } catch (err) {
      console.error("[payment-request] MongoDB list failed:", err);
    }
  }

  const store = await readStore();
  const requests = (store.paymentRequests ?? []) as unknown as PaymentRequest[];

  return requests.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return tb - ta;
  });
}

export async function createPaymentRequest(request: {
  userEmail: string;
  userId: string;
  transactionId: string;
  coins: number;
  amount: number;
  discount?: number;
  couponCode?: string;
}): Promise<PaymentRequest> {
  const now = new Date();
  const newRequest: PaymentRequest = {
    userEmail: request.userEmail.trim().toLowerCase(),
    userId: String(request.userId),
    transactionId: request.transactionId.trim(),
    coins: Number(request.coins),
    amount: Number(request.amount),
    discount: request.discount ? Number(request.discount) : undefined,
    couponCode: request.couponCode ? request.couponCode.trim() : undefined,
    status: "pending",
    credited: false,
    createdAt: now.toISOString(),
  };

  const col = await getPaymentRequestsCollection();
  if (col) {
    try {
      const { _id, ...docToInsert } = newRequest;
      void _id;
      const res = await col.insertOne({
        ...docToInsert,
        createdAt: now,
      } as Document);
      newRequest._id = res.insertedId.toString();
    } catch (err) {
      console.error("[payment-request] MongoDB insert failed:", err);
    }
  }

  if (!newRequest._id) {
    newRequest._id = Date.now().toString();
  }

  // Also sync to file/store for offline/dev fallback
  try {
    const store = await readStore();
    const requests = (store.paymentRequests ?? []) as unknown as PaymentRequest[];
    requests.push(newRequest);
    store.paymentRequests = requests;
    await writeStore(store);
  } catch (err) {
    console.error("[payment-request] writeStore sync failed:", err);
  }

  return newRequest;
}

export async function findPaymentRequestByTransactionId(
  transactionId: string
): Promise<PaymentRequest | null> {
  const cleanTx = transactionId.trim();
  if (!cleanTx) return null;

  const col = await getPaymentRequestsCollection();
  if (col) {
    try {
      const doc = await col.findOne({ transactionId: cleanTx });
      if (doc) {
        return {
          _id: doc._id.toString(),
          userEmail: String(doc.userEmail || ""),
          userId: String(doc.userId || ""),
          transactionId: String(doc.transactionId || ""),
          coins: Number(doc.coins || 0),
          amount: Number(doc.amount || 0),
          discount: doc.discount ? Number(doc.discount) : undefined,
          couponCode: doc.couponCode ? String(doc.couponCode) : undefined,
          status: (doc.status as "pending" | "confirmed" | "declined") || "pending",
          credited: Boolean(doc.credited),
          createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt || new Date().toISOString()),
          confirmedAt: doc.confirmedAt instanceof Date ? doc.confirmedAt.toISOString() : (doc.confirmedAt ? String(doc.confirmedAt) : undefined),
          declinedReason: doc.declinedReason ? String(doc.declinedReason) : undefined,
          upiId: doc.upiId ? String(doc.upiId) : undefined,
          upiName: doc.upiName ? String(doc.upiName) : undefined,
        };
      }
    } catch (err) {
      console.error("[payment-request] findByTransactionId MongoDB query failed:", err);
    }
  }

  const store = await readStore();
  const requests = (store.paymentRequests ?? []) as unknown as PaymentRequest[];
  const match = requests.find((r) => r.transactionId.trim().toLowerCase() === cleanTx.toLowerCase());
  return match ?? null;
}

export async function listPaymentRequestsByUser(
  userId: string,
  email?: string
): Promise<PaymentRequest[]> {
  const cleanId = String(userId || "").trim();
  const cleanEmail = email ? email.trim().toLowerCase() : "";
  const col = await getPaymentRequestsCollection();

  if (col) {
    try {
      const filters: Record<string, unknown>[] = [];
      if (cleanId) filters.push({ userId: cleanId });
      if (cleanEmail) filters.push({ userEmail: cleanEmail });

      const query = filters.length > 1 ? { $or: filters } : (filters[0] ?? {});
      const docs = await col.find(query).sort({ createdAt: -1 }).limit(100).toArray();
      return docs.map((doc) => ({
        _id: doc._id.toString(),
        userEmail: String(doc.userEmail || ""),
        userId: String(doc.userId || ""),
        transactionId: String(doc.transactionId || ""),
        coins: Number(doc.coins || 0),
        amount: Number(doc.amount || 0),
        discount: doc.discount ? Number(doc.discount) : undefined,
        couponCode: doc.couponCode ? String(doc.couponCode) : undefined,
        status: (doc.status as "pending" | "confirmed" | "declined") || "pending",
        credited: Boolean(doc.credited),
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt || new Date().toISOString()),
        confirmedAt: doc.confirmedAt instanceof Date ? doc.confirmedAt.toISOString() : (doc.confirmedAt ? String(doc.confirmedAt) : undefined),
        declinedReason: doc.declinedReason ? String(doc.declinedReason) : undefined,
        upiId: doc.upiId ? String(doc.upiId) : undefined,
        upiName: doc.upiName ? String(doc.upiName) : undefined,
      }));
    } catch (err) {
      console.error("[payment-request] listPaymentRequestsByUser failed:", err);
    }
  }

  const store = await readStore();
  const requests = (store.paymentRequests ?? []) as unknown as PaymentRequest[];
  return requests
    .filter(
      (r) =>
        (cleanId && String(r.userId) === cleanId) ||
        (cleanEmail && String(r.userEmail || "").toLowerCase() === cleanEmail)
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function confirmPaymentRequest(
  id: string
): Promise<PaymentRequest | null> {
  const col = await getPaymentRequestsCollection();
  const now = new Date();

  let existing: PaymentRequest | null = null;
  let mongoId: ObjectId | null = null;

  if (col) {
    if (ObjectId.isValid(id)) {
      mongoId = new ObjectId(id);
    }

    const targetQuery: Record<string, unknown> = mongoId
      ? { _id: mongoId }
      : { $or: [{ _id: id as unknown as ObjectId }, { transactionId: id }] };

    // Atomic findOneAndUpdate ensuring the status is not already confirmed
    const atomicUpdate = await col.findOneAndUpdate(
      { ...targetQuery, status: { $ne: "confirmed" } },
      {
        $set: {
          status: "confirmed",
          confirmedAt: now,
          updatedAt: now,
        },
      },
      { returnDocument: "after" }
    );

    if (atomicUpdate) {
      existing = { ...(atomicUpdate as unknown as PaymentRequest), _id: atomicUpdate._id.toString() };
      const coinsToCredit = Number(existing.coins || 0);
      let credited = Boolean(existing.credited);

      if (!credited && coinsToCredit > 0) {
        try {
          const ok = await updateUserCoins(existing.userId, coinsToCredit, existing.userEmail);
          credited = ok;
          if (ok) {
            await col.updateOne({ _id: atomicUpdate._id }, { $set: { credited: true, updatedAt: new Date() } });
            existing.credited = true;
          }
        } catch (error) {
          console.error("[payment-request] Failed to credit user coins:", error);
        }
      }

      // Sync to local store
      try {
        const store = await readStore();
        const requests = (store.paymentRequests ?? []) as unknown as PaymentRequest[];
        const idx = requests.findIndex((r) => r._id === id || r.transactionId === existing?.transactionId);
        if (idx !== -1) {
          requests[idx] = existing;
          store.paymentRequests = requests;
          await writeStore(store);
        }
      } catch {
        // Non-fatal
      }

      return existing;
    }

    // If atomicUpdate was null, it was either already confirmed or doesn't exist in MongoDB
    const currentDoc = await col.findOne(targetQuery);
    if (currentDoc) {
      return { ...(currentDoc as unknown as PaymentRequest), _id: currentDoc._id.toString() };
    }
  }

  // Fallback to memory store
  const store = await readStore();
  const requests = (store.paymentRequests ?? []) as unknown as PaymentRequest[];
  existing = requests.find((r) => r._id === id || r.transactionId === id) ?? null;

  if (!existing) return null;

  if (existing.status === "confirmed" || existing.credited) {
    return existing;
  }

  const coinsToCredit = Number(existing.coins || 0);
  let credited = Boolean(existing.credited);
  if (!credited && coinsToCredit > 0) {
    try {
      credited = await updateUserCoins(existing.userId, coinsToCredit, existing.userEmail);
    } catch {
      credited = false;
    }
  }

  const updated: PaymentRequest = {
    ...existing,
    status: "confirmed",
    credited,
    confirmedAt: now.toISOString(),
  };

  const idx = requests.findIndex((r) => r._id === id || r.transactionId === existing?.transactionId);
  if (idx !== -1) {
    requests[idx] = updated;
    store.paymentRequests = requests;
    await writeStore(store);
  }

  return updated;
}

export async function declinePaymentRequest(
  id: string,
  reason?: string
): Promise<PaymentRequest | null> {
  const col = await getPaymentRequestsCollection();
  const now = new Date();
  const finalReason = reason && reason.trim() ? reason.trim() : "Wrong Transaction ID";

  let mongoId: ObjectId | null = null;

  if (col) {
    if (ObjectId.isValid(id)) {
      mongoId = new ObjectId(id);
    }

    const targetQuery: Record<string, unknown> = mongoId
      ? { _id: mongoId }
      : { $or: [{ _id: id as unknown as ObjectId }, { transactionId: id }] };

    const atomicUpdate = await col.findOneAndUpdate(
      { ...targetQuery, status: { $nin: ["confirmed", "declined"] } },
      {
        $set: {
          status: "declined",
          declinedReason: finalReason,
          updatedAt: now,
        },
      },
      { returnDocument: "after" }
    );

    if (atomicUpdate) {
      const declinedReq = { ...(atomicUpdate as unknown as PaymentRequest), _id: atomicUpdate._id.toString() };
      try {
        const store = await readStore();
        const requests = (store.paymentRequests ?? []) as unknown as PaymentRequest[];
        const idx = requests.findIndex((r) => r._id === id || r.transactionId === declinedReq.transactionId);
        if (idx !== -1) {
          requests[idx] = declinedReq;
          store.paymentRequests = requests;
          await writeStore(store);
        }
      } catch {
        // Non-fatal
      }
      return declinedReq;
    }

    const currentDoc = await col.findOne(targetQuery);
    if (currentDoc) {
      return { ...(currentDoc as unknown as PaymentRequest), _id: currentDoc._id.toString() };
    }
  }

  const store = await readStore();
  const requests = (store.paymentRequests ?? []) as unknown as PaymentRequest[];
  const existing = requests.find((r) => r._id === id || r.transactionId === id) ?? null;

  if (!existing) return null;
  if (existing.status === "declined" || existing.status === "confirmed") {
    return existing;
  }

  const updated: PaymentRequest = {
    ...existing,
    status: "declined",
    declinedReason: finalReason,
  };

  const idx = requests.findIndex((r) => r._id === id || r.transactionId === id);
  if (idx !== -1) {
    requests[idx] = updated;
    store.paymentRequests = requests;
    await writeStore(store);
  }

  return updated;
}

export async function getPaymentRequestById(id: string): Promise<PaymentRequest | null> {
  const col = await getPaymentRequestsCollection();
  if (col) {
    try {
      const query: Record<string, unknown> = ObjectId.isValid(id)
        ? { _id: new ObjectId(id) }
        : { $or: [{ _id: id as unknown as ObjectId }, { transactionId: id }] };
      const doc = await col.findOne(query);
      if (doc) {
        return {
          _id: doc._id.toString(),
          userEmail: String(doc.userEmail || ""),
          userId: String(doc.userId || ""),
          transactionId: String(doc.transactionId || ""),
          coins: Number(doc.coins || 0),
          amount: Number(doc.amount || 0),
          discount: doc.discount ? Number(doc.discount) : undefined,
          couponCode: doc.couponCode ? String(doc.couponCode) : undefined,
          status: (doc.status as "pending" | "confirmed" | "declined") || "pending",
          credited: Boolean(doc.credited),
          createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt || new Date().toISOString()),
          confirmedAt: doc.confirmedAt instanceof Date ? doc.confirmedAt.toISOString() : (doc.confirmedAt ? String(doc.confirmedAt) : undefined),
          declinedReason: doc.declinedReason ? String(doc.declinedReason) : undefined,
          upiId: doc.upiId ? String(doc.upiId) : undefined,
          upiName: doc.upiName ? String(doc.upiName) : undefined,
        };
      }
    } catch (err) {
      console.error("[payment-request] getPaymentRequestById MongoDB failed:", err);
    }
  }

  const store = await readStore();
  const requests = (store.paymentRequests ?? []) as unknown as PaymentRequest[];
  return requests.find((r) => r._id === id || r.transactionId === id) ?? null;
}

export interface CoinPurchaseEligibility {
  allowed: boolean;
  remainingMs: number;
  remainingFormatted: string;
  lastPurchaseAt: string | null;
  nextAllowedAt: string | null;
  reason?: string;
}

const COOLDOWN_24H_MS = 24 * 60 * 60 * 1000;

export function formatRemainingTime(ms: number): string {
  if (ms <= 0) return "0s";
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(" ");
}

export async function checkCoinPurchaseEligibility(
  email: string
): Promise<CoinPurchaseEligibility> {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail) {
    return {
      allowed: true,
      remainingMs: 0,
      remainingFormatted: "",
      lastPurchaseAt: null,
      nextAllowedAt: null,
    };
  }

  let latestPurchaseMs = 0;

  // 1. Direct MongoDB Query
  const db = await getDb();
  if (db) {
    try {
      // Look up payment_history (confirmed purchases)
      const historyDoc = await db
        .collection("payment_history")
        .findOne(
          { userEmail: cleanEmail },
          { sort: { createdAt: -1 } }
        );

      if (historyDoc?.createdAt) {
        const d = new Date(historyDoc.createdAt);
        const t = d.getTime();
        if (!isNaN(t) && t > latestPurchaseMs) {
          latestPurchaseMs = t;
        }
      }

      // Look up payment_requests (pending or confirmed)
      const requestDoc = await db
        .collection("payment_requests")
        .findOne(
          {
            userEmail: cleanEmail,
            status: { $in: ["confirmed", "pending"] },
          },
          { sort: { createdAt: -1 } }
        );

      if (requestDoc) {
        const d = new Date(requestDoc.confirmedAt || requestDoc.createdAt);
        const t = d.getTime();
        if (!isNaN(t) && t > latestPurchaseMs) {
          latestPurchaseMs = t;
        }
      }
    } catch (err) {
      console.error("[payment-request] MongoDB checkCoinPurchaseEligibility failed:", err);
    }
  }

  // 2. Store fallback
  try {
    const store = await readStore();

    // Store payment history
    const historyList = (store.paymentHistory ?? []) as unknown as {
      userEmail?: string;
      createdAt?: string | Date;
    }[];
    for (const h of historyList) {
      if (
        String(h.userEmail || "").trim().toLowerCase() === cleanEmail &&
        h.createdAt
      ) {
        const d = new Date(h.createdAt);
        const t = d.getTime();
        if (!isNaN(t) && t > latestPurchaseMs) {
          latestPurchaseMs = t;
        }
      }
    }

    // Store payment requests
    const requestList = (store.paymentRequests ?? []) as unknown as {
      userEmail?: string;
      status?: string;
      createdAt?: string | Date;
      confirmedAt?: string | Date;
    }[];
    for (const r of requestList) {
      if (
        String(r.userEmail || "").trim().toLowerCase() === cleanEmail &&
        (r.status === "confirmed" || r.status === "pending") &&
        (r.confirmedAt || r.createdAt)
      ) {
        const d = new Date(r.confirmedAt || r.createdAt!);
        const t = d.getTime();
        if (!isNaN(t) && t > latestPurchaseMs) {
          latestPurchaseMs = t;
        }
      }
    }
  } catch (err) {
    console.error("[payment-request] store checkCoinPurchaseEligibility failed:", err);
  }

  if (latestPurchaseMs <= 0) {
    return {
      allowed: true,
      remainingMs: 0,
      remainingFormatted: "",
      lastPurchaseAt: null,
      nextAllowedAt: null,
    };
  }

  const latestPurchaseDate = new Date(latestPurchaseMs);
  const now = Date.now();
  const elapsed = now - latestPurchaseMs;

  if (elapsed >= COOLDOWN_24H_MS) {
    return {
      allowed: true,
      remainingMs: 0,
      remainingFormatted: "",
      lastPurchaseAt: latestPurchaseDate.toISOString(),
      nextAllowedAt: null,
    };
  }

  const remainingMs = COOLDOWN_24H_MS - elapsed;
  const nextAllowedAt = new Date(latestPurchaseMs + COOLDOWN_24H_MS).toISOString();
  const remainingFormatted = formatRemainingTime(remainingMs);

  return {
    allowed: false,
    remainingMs,
    remainingFormatted,
    lastPurchaseAt: latestPurchaseDate.toISOString(),
    nextAllowedAt,
    reason: `Each email address can only purchase coins once every 24 hours. Please wait ${remainingFormatted} before purchasing again.`,
  };
}

