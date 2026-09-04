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

export async function listPaymentRequests(): Promise<PaymentRequest[]> {
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
  const store = await readStore();
  const requests = (store.paymentRequests ?? []) as unknown as PaymentRequest[];

  const newRequest: PaymentRequest = {
    _id: Date.now().toString(),
    ...request,
    status: "pending",
    credited: false,
    createdAt: new Date(),
  };

  requests.push(newRequest);
  store.paymentRequests = requests;
  await writeStore(store);

  return newRequest;
}

export async function confirmPaymentRequest(
  id: string
): Promise<PaymentRequest | null> {
  const store = await readStore();
  const requests = (store.paymentRequests ?? []) as unknown as PaymentRequest[];

  const index = requests.findIndex((r) => r._id === id);
  if (index === -1) return null;

  const existing = requests[index];
  const alreadyCredited = Boolean(existing.credited);

  // Always use the values from the stored record — never trust client input
  const coinsToCredit = Number(existing.coins || 0);
  const userIdToCredit = existing.userId;

  let credited = alreadyCredited;
  try {
    if (!alreadyCredited && coinsToCredit > 0 && userIdToCredit) {
      const ok = await updateUserCoins(userIdToCredit, coinsToCredit);
      credited = ok;
    }
  } catch (error) {
    console.error("Failed to credit user coins:", error);
    credited = false;
  }

  const updated: PaymentRequest = {
    ...existing,
    status: "confirmed",
    credited,
    confirmedAt: new Date(),
  };
  requests[index] = updated;

  store.paymentRequests = requests;
  await writeStore(store);

  return updated;
}

export async function declinePaymentRequest(
  id: string,
  reason?: string
): Promise<PaymentRequest | null> {
  const store = await readStore();
  const requests = (store.paymentRequests ?? []) as unknown as PaymentRequest[];

  const index = requests.findIndex((r) => r._id === id);
  if (index === -1) return null;

  const updated: PaymentRequest = {
    ...requests[index],
    status: "declined",
    declinedReason: reason,
  };
  requests[index] = updated;

  store.paymentRequests = requests;
  await writeStore(store);

  return updated;
}

export async function getPaymentRequestById(id: string): Promise<PaymentRequest | null> {
  const requests = await listPaymentRequests();
  return requests.find((r) => r._id === id) ?? null;
}
