"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import { SectionPanel } from "@/components/ui/card";
import { useAuthGuard } from "@/components/post-ad/use-auth-guard";

type PaymentHistoryItem = {
  _id?: string;
  userEmail: string;
  userId: string;
  transactionId: string;
  upiId?: string;
  upiName?: string;
  coins: number;
  amount: number;
  discount?: number;
  finalAmount?: number;
  couponCode?: string;
  status?: "pending" | "confirmed" | "declined";
  createdAt?: string;
  confirmedAt?: string;
  declinedReason?: string;
};

function isSameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function shouldKeepPaymentEntry(item: { createdAt?: string; coins?: number }) {
  const createdAt = item.createdAt ? new Date(item.createdAt) : null;
  if (!createdAt || Number.isNaN(createdAt.getTime())) return true;

  const today = new Date();
  const isToday = isSameCalendarDay(createdAt, today);
  if (!isToday) return true;

  return Number(item.coins ?? 0) === 50;
}

export default function Page() {
  const router = useRouter();
  const ready = useAuthGuard();
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;

    async function load() {
      try {
        const res = await fetch("/api/payment-confirmation", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          if (res.status === 401) {
            router.replace("/login");
            return;
          }
          setHistory([]);
          return;
        }

        const data = await res.json();
        const requests = Array.isArray(data.requests) ? data.requests : [];
        setHistory(requests.filter(shouldKeepPaymentEntry));
      } catch {
        setHistory([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [ready, router]);

  if (!ready) return null;

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <SectionPanel>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-black text-red-950 sm:text-4xl">
            Payment History
          </h1>
          <Button
            variant="soft"
            onClick={() => router.push("/post-ad")}
            className="!text-black"
          >
            Back
          </Button>
        </div>

        {loading ? (
          <p className="mt-6 rounded-[1.5rem] bg-pink-50 p-5 text-red-900">
            Loading payment history...
          </p>
        ) : history.length === 0 ? (
          <p className="mt-6 rounded-[1.5rem] bg-pink-50 p-5 text-red-900">
            You have no payments yet.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {history.map((item) => (
              <div
                key={item._id || item.transactionId}
                className="rounded-[1.5rem] border border-red-200 bg-pink-50 p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2 text-sm text-red-900">
                    <p>
                      <span className="font-semibold">Transaction ID:</span> {item.transactionId}
                    </p>
                    <p>
                      <span className="font-semibold">Money Paid:</span> ₹{Number(item.amount || 0).toFixed(2)}
                    </p>
                    <p>
                      <span className="font-semibold">Coins:</span> {item.coins}
                    </p>
                    <p>
                      <span className="font-semibold">Status:</span>{" "}
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                          item.status === "confirmed"
                            ? "bg-green-200 text-green-950 ring-1 ring-green-300"
                            : item.status === "declined"
                              ? "bg-red-200 text-red-950 ring-1 ring-red-300"
                              : "bg-amber-200 text-amber-950 ring-1 ring-amber-300"
                        }`}
                      >
                        {item.status === "confirmed"
                          ? "Confirmed"
                          : item.status === "declined"
                            ? "Declined"
                            : "Pending"}
                      </span>
                    </p>
                  </div>

                  <div className="text-sm text-red-700">
                    <p>
                      <span className="font-semibold">Date:</span>{" "}
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB") : "—"}
                    </p>
                    <p>
                      <span className="font-semibold">Time:</span>{" "}
                      {item.createdAt ? new Date(item.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionPanel>
    </main>
  );
}
