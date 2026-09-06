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
      const doc = await col.findOne({ _id: mongoId });
      if (doc) existing = { ...(doc as unknown as PaymentRequest), _id: doc._id.toString() };
    }
    if (!existing) {
      const doc = await col.findOne({ _id: id as unknown as ObjectId });
      if (doc) existing = { ...(doc as unknown as PaymentRequest), _id: String(doc._id) };
    }
    if (!existing) {
      const doc = await col.findOne({ transactionId: id });
      if (doc) existing = { ...(doc as unknown as PaymentRequest), _id: String(doc._id) };
    }
  }

  if (!existing) {
    const store = await readStore();
    const requests = (store.paymentRequests ?? []) as unknown as PaymentRequest[];
    existing = requests.find((r) => r._id === id || r.transactionId === id) ?? null;
  }

  if (!existing) return null;

  // If already confirmed or credited, return existing immediately to prevent duplicate credit
  if (existing.status === "confirmed" || existing.credited) {
    return existing;
  }

  const alreadyCredited = Boolean(existing.credited);
  const coinsToCredit = Number(existing.coins || 0);
  const userIdToCredit = String(existing.userId || "");
  const userEmailToCredit = String(existing.userEmail || "");

  let credited = alreadyCredited;
  if (!alreadyCredited && coinsToCredit > 0) {
    try {
      const ok = await updateUserCoins(userIdToCredit, coinsToCredit, userEmailToCredit);
      credited = ok;
    } catch (error) {
      console.error("[payment-request] Failed to credit user coins:", error);
      credited = false;
    }
  }

  const updated: PaymentRequest = {
    ...existing,
    status: "confirmed",
    credited,
    confirmedAt: now.toISOString(),
  };

  if (col) {
    try {
      const query = mongoId
        ? { _id: mongoId }
        : { $or: [{ _id: id as unknown as ObjectId }, { transactionId: existing.transactionId }] };
      await col.updateOne(
        query,
        {
          $set: {
            status: "confirmed",
            credited,
            confirmedAt: now,
            updatedAt: now,
          },
        }
      );
    } catch (err) {
      console.error("[payment-request] MongoDB confirm update failed:", err);
    }
  }

  // Also sync to store
  try {
    const store = await readStore();
    const requests = (store.paymentRequests ?? []) as unknown as PaymentRequest[];
    const idx = requests.findIndex((r) => r._id === id || r.transactionId === existing?.transactionId);
    if (idx !== -1) {
      requests[idx] = updated;
      store.paymentRequests = requests;
      await writeStore(store);
    }
  } catch (err) {
    console.error("[payment-request] writeStore confirm sync failed:", err);
  }

  return updated;
}

export async function declinePaymentRequest(
  id: string,
  reason?: string
): Promise<PaymentRequest | null> {
  const col = await getPaymentRequestsCollection();
  const now = new Date();

  let existing: PaymentRequest | null = null;
  let mongoId: ObjectId | null = null;

  if (col) {
    if (ObjectId.isValid(id)) {
      mongoId = new ObjectId(id);
      const doc = await col.findOne({ _id: mongoId });
      if (doc) existing = { ...(doc as unknown as PaymentRequest), _id: doc._id.toString() };
    }
    if (!existing) {
      const doc = await col.findOne({ _id: id as unknown as ObjectId });
      if (doc) existing = { ...(doc as unknown as PaymentRequest), _id: String(doc._id) };
    }
    if (!existing) {
      const doc = await col.findOne({ transactionId: id });
      if (doc) existing = { ...(doc as unknown as PaymentRequest), _id: String(doc._id) };
    }
  }

  if (!existing) {
    const store = await readStore();
    const requests = (store.paymentRequests ?? []) as unknown as PaymentRequest[];
    existing = requests.find((r) => r._id === id || r.transactionId === id) ?? null;
  }

  if (!existing) return null;

  // If already declined or confirmed, return existing
  if (existing.status === "declined" || existing.status === "confirmed") {
    return existing;
  }

  const finalReason = reason && reason.trim() ? reason.trim() : "Wrong Transaction ID";

  const updated: PaymentRequest = {
    ...existing,
    status: "declined",
    declinedReason: finalReason,
  };

  if (col) {
    try {
      const query = mongoId
        ? { _id: mongoId }
        : { $or: [{ _id: id as unknown as ObjectId }, { transactionId: existing.transactionId }] };
      await col.updateOne(
        query,
        {
          $set: {
            status: "declined",
            declinedReason: finalReason,
            updatedAt: now,
          },
        }
      );
    } catch (err) {
      console.error("[payment-request] MongoDB decline update failed:", err);
    }
  }

  // Also sync to store
  try {
    const store = await readStore();
    const requests = (store.paymentRequests ?? []) as unknown as PaymentRequest[];
    const idx = requests.findIndex((r) => r._id === id || r.transactionId === existing?.transactionId);
    if (idx !== -1) {
      requests[idx] = updated;
      store.paymentRequests = requests;
      await writeStore(store);
    }
  } catch (err) {
    console.error("[payment-request] writeStore decline sync failed:", err);
  }

  return updated;
}

export async function getPaymentRequestById(id: string): Promise<PaymentRequest | null> {
  const requests = await listPaymentRequests();
  return requests.find((r) => r._id === id || r.transactionId === id) ?? null;
}
