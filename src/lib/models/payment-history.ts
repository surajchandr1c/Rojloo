import { Collection, Document } from "mongodb";
import { getDb } from "../db";
import { readStore, writeStore } from "../persist";

export type PaymentHistory = {
  _id?: string;
  userEmail: string;
  userName?: string;
  userId: string;
  transactionId: string;
  upiId: string;
  upiName?: string;
  coins: number;
  amount: number;
  discount?: number;
  finalAmount: number;
  couponCode?: string;
  paymentRequestId: string;
  createdAt: Date | string;
};

async function getPaymentHistoryCollection(): Promise<Collection<Document> | null> {
  const db = await getDb();
  if (!db) return null;
  const col = db.collection("payment_history");
  try {
    await col.createIndex({ createdAt: -1 });
    await col.createIndex({ userId: 1 });
    await col.createIndex({ userEmail: 1 });
  } catch {
    // Non-fatal
  }
  return col;
}

export async function listPaymentHistory(): Promise<PaymentHistory[]> {
  const col = await getPaymentHistoryCollection();
  if (col) {
    try {
      const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
      return docs.map((doc) => ({
        _id: doc._id.toString(),
        userEmail: String(doc.userEmail || ""),
        userName: doc.userName ? String(doc.userName) : undefined,
        userId: String(doc.userId || ""),
        transactionId: String(doc.transactionId || ""),
        upiId: String(doc.upiId || ""),
        upiName: doc.upiName ? String(doc.upiName) : undefined,
        coins: Number(doc.coins || 0),
        amount: Number(doc.amount || 0),
        discount: doc.discount ? Number(doc.discount) : undefined,
        finalAmount: Number(doc.finalAmount ?? doc.amount ?? 0),
        couponCode: doc.couponCode ? String(doc.couponCode) : undefined,
        paymentRequestId: String(doc.paymentRequestId || ""),
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt || new Date().toISOString()),
      }));
    } catch (err) {
      console.error("[payment-history] MongoDB list failed:", err);
    }
  }

  const store = await readStore();
  const history = (store.paymentHistory ?? []) as unknown as PaymentHistory[];

  return history.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return tb - ta;
  });
}

export async function createPaymentHistory(payment: {
  userEmail: string;
  userName?: string;
  userId: string;
  transactionId: string;
  upiId: string;
  upiName?: string;
  coins: number;
  amount: number;
  discount?: number;
  finalAmount: number;
  couponCode?: string;
  paymentRequestId: string;
}): Promise<PaymentHistory> {
  const now = new Date();
  const newPayment: PaymentHistory = {
    userEmail: payment.userEmail.trim().toLowerCase(),
    userName: payment.userName,
    userId: String(payment.userId),
    transactionId: payment.transactionId.trim(),
    upiId: payment.upiId,
    upiName: payment.upiName,
    coins: Number(payment.coins),
    amount: Number(payment.amount),
    discount: payment.discount ? Number(payment.discount) : undefined,
    finalAmount: Number(payment.finalAmount),
    couponCode: payment.couponCode ? payment.couponCode.trim() : undefined,
    paymentRequestId: String(payment.paymentRequestId),
    createdAt: now.toISOString(),
  };

  const col = await getPaymentHistoryCollection();
  if (col) {
    try {
      const { _id, ...docToInsert } = newPayment;
      void _id;
      const res = await col.insertOne({
        ...docToInsert,
        createdAt: now,
      } as Document);
      newPayment._id = res.insertedId.toString();
    } catch (err) {
      console.error("[payment-history] MongoDB insert failed:", err);
    }
  }

  if (!newPayment._id) {
    newPayment._id = Date.now().toString();
  }

  try {
    const store = await readStore();
    const history = (store.paymentHistory ?? []) as unknown as PaymentHistory[];
    history.push(newPayment);
    store.paymentHistory = history;
    await writeStore(store);
  } catch (err) {
    console.error("[payment-history] writeStore sync failed:", err);
  }

  return newPayment;
}

export async function getPaymentHistoryByUserId(userId: string): Promise<PaymentHistory[]> {
  const history = await listPaymentHistory();
  return history.filter((p) => String(p.userId) === String(userId));
}

export async function getPaymentHistoryByEmail(email: string): Promise<PaymentHistory[]> {
  const history = await listPaymentHistory();
  return history.filter((p) => p.userEmail.toLowerCase() === email.toLowerCase());
}

export async function getTotalPaymentAmount(): Promise<number> {
  const history = await listPaymentHistory();
  return history.reduce((sum, p) => sum + p.amount, 0);
}

export async function getTotalCoinsIssued(): Promise<number> {
  const history = await listPaymentHistory();
  return history.reduce((sum, p) => sum + p.coins, 0);
}
