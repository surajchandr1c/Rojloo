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

export async function listPaymentHistory(): Promise<PaymentHistory[]> {
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
  const store = await readStore();
  const history = (store.paymentHistory ?? []) as unknown as PaymentHistory[];

  const newPayment: PaymentHistory = {
    _id: Date.now().toString(),
    ...payment,
    createdAt: new Date(),
  };

  history.push(newPayment);
  store.paymentHistory = history;
  await writeStore(store);

  return newPayment;
}

export async function getPaymentHistoryByUserId(userId: string): Promise<PaymentHistory[]> {
  const history = await listPaymentHistory();
  return history.filter((p) => p.userId === userId);
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
