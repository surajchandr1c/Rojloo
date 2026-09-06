"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminContext } from "@/components/admin/use-admin-context";
import { formatDisplayDateTime } from "@/lib/date";

type PaymentHistory = {
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
  createdAt: string;
};

export default function PaymentHistoryPage() {
  const router = useRouter();
  const me = useAdminContext();
  const [history, setHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchEmail, setSearchEmail] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/payment-history", {
        credentials: "include",
      });

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      const data = await response.json();
      setHistory(Array.isArray(data.history) ? data.history : []);
      setError("");
    } catch (err) {
      setError("Failed to load payment history");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (me === null) return;
    if (!me.authenticated) {
      router.replace("/admin/login");
      return;
    }

    queueMicrotask(() => {
      void loadHistory();
    });
  }, [loadHistory, me, router]);

  const filteredHistory = history.filter((payment) => {
    const searchValue = searchEmail.toLowerCase();
    const nameValue = (payment.userName || "").toLowerCase();
    const emailValue = payment.userEmail.toLowerCase();
    return nameValue.includes(searchValue) || emailValue.includes(searchValue);
  });

  const totalAmount = filteredHistory.reduce((sum, p) => sum + p.amount, 0);
  const totalCoins = filteredHistory.reduce((sum, p) => sum + p.coins, 0);
  const totalDiscount = filteredHistory.reduce((sum, p) => sum + (p.discount || 0), 0);

  if (!me?.authenticated) return null;

  return (
    <main className="min-h-screen bg-red-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 min-w-0">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-3xl font-black text-red-950">Payment History</h1>
          <button
            onClick={loadHistory}
            className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-100 p-4 text-red-900">
            {error}
          </div>
        )}

        {/* Statistics */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-green-200 bg-white p-4">
            <p className="text-sm font-semibold text-green-700">Total Amount</p>
            <p className="mt-2 text-2xl font-black text-green-950">
              ₹{totalAmount.toFixed(2)}
            </p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-white p-4">
            <p className="text-sm font-semibold text-blue-700">Total Coins</p>
            <p className="mt-2 text-2xl font-black text-blue-950">
              {totalCoins}
            </p>
          </div>
          <div className="rounded-2xl border border-yellow-200 bg-white p-4">
            <p className="text-sm font-semibold text-yellow-700">Total Discount</p>
            <p className="mt-2 text-2xl font-black text-yellow-950">
              ₹{totalDiscount.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-6">
          <input
            type="text"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-lg border border-red-200 px-4 py-2 text-red-950 placeholder-red-400 focus:border-red-500 focus:outline-none"
          />
        </div>

        {/* Payment History List */}
        <div className="mt-8 space-y-4">
          {loading ? (
            <p className="text-red-900">Loading payment history...</p>
          ) : filteredHistory.length === 0 ? (
            <p className="text-red-900">
              No payment history found{searchEmail ? " for this name/email" : ""}.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((payment) => (
                <div
                  key={payment._id}
                  className="rounded-2xl border border-red-200 bg-white p-4 sm:p-6 shadow-sm"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl bg-red-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                        Email
                      </p>
                      <p className="mt-2 text-sm font-bold text-red-950 break-all">
                        {payment.userEmail}
                      </p>
                    </div>

                    <div className="rounded-xl bg-orange-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                        UPI Account
                      </p>
                      <p className="mt-2 text-base font-bold text-orange-950">
                        {payment.upiName || "Manual / Not provided"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-red-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                        UPI ID
                      </p>
                      <p className="mt-2 text-sm font-bold break-all text-red-950">
                        {payment.upiId || "N/A"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-green-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                        Amount Paid
                      </p>
                      <p className="mt-2 text-xl font-black text-green-950">
                        ₹{Number(payment.amount || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 border-t border-red-200 pt-4 text-sm text-red-800">
                    <div>
                      <span className="font-semibold text-red-900">Coins:</span>{" "}
                      {payment.coins}
                    </div>
                    <div>
                      <span className="font-semibold text-red-900">Final Amount:</span>{" "}
                      ₹{Number(payment.finalAmount || 0).toFixed(2)}
                    </div>
                    <div>
                      <span className="font-semibold text-red-900">Date:</span>{" "}
                      {formatDisplayDateTime(payment.createdAt)}
                    </div>
                  </div>

                  {payment.discount && payment.discount > 0 && (
                    <div className="mt-3 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-900">
                      <span className="font-semibold">Discount:</span> ₹{Number(payment.discount).toFixed(2)}
                      {payment.couponCode ? ` • Coupon: ${payment.couponCode}` : ""}
                    </div>
                  )}

                  <div className="mt-3 text-xs text-red-700">
                    <span className="font-semibold">Transaction ID:</span>{" "}
                    <span className="break-all">{payment.transactionId}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
