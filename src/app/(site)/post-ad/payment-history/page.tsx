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

export default function Page() {
  const router = useRouter();
  const ready = useAuthGuard();
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

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
          if (!cancelled) setHistory([]);
          return;
        }

        const data = await res.json();
        const requests = Array.isArray(data.requests) ? data.requests : [];
        if (!cancelled) {
          setHistory(requests);
          if (requests.some((r: PaymentHistoryItem) => r.status === "confirmed")) {
            window.dispatchEvent(new CustomEvent("coins:updated"));
          }
        }
      } catch {
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    // Auto-refresh every 5 seconds so status changes (Pending -> Confirmed/Declined) reflect live
    const interval = setInterval(load, 5000);
    const onFocus = () => void load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "rojlo_coin_update") void load();
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
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
                    {item.status === "declined" && (
                      <div className="mt-2 rounded-xl border border-red-200 bg-red-100/70 px-3 py-2 text-xs text-red-900">
                        <span className="font-bold text-red-950">Message: </span>
                        {item.declinedReason || "Wrong Transaction ID"}
                      </div>
                    )}
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
