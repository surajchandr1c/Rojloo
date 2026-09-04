"use client";

import { useEffect, useState } from "react";

type PaymentRequest = {
  status?: "pending" | "confirmed" | "declined";
};

type PaymentHistory = {
  coins?: number;
  finalAmount?: number;
  amount?: number;
  discount?: number;
  createdAt?: string;
};

function isSameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function shouldKeepPaymentHistory(item: { createdAt?: string; coins?: number }) {
  const createdAt = item.createdAt ? new Date(item.createdAt) : null;
  if (!createdAt || Number.isNaN(createdAt.getTime())) return true;

  const today = new Date();
  const isToday = isSameCalendarDay(createdAt, today);
  if (!isToday) return true;

  return Number(item.coins ?? 0) === 50;
}

type Coupon = {
  active?: boolean;
};

type Stats = {
  users: number;
  ads: number;
  cities: number;
  states: number;
  subAdmins: number;
  upiTotal: number;
  activeCoupons: number;
  pendingPayments: number;
  confirmedPayments: number;
  declinedPayments: number;
  totalAmountAfterDiscount: number;
  totalCoinsSold: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    users: 0,
    ads: 0,
    cities: 0,
    states: 0,
    subAdmins: 0,
    upiTotal: 0,
    activeCoupons: 0,
    pendingPayments: 0,
    confirmedPayments: 0,
    declinedPayments: 0,
    totalAmountAfterDiscount: 0,
    totalCoinsSold: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/ads", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/cities", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/states", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/subadmins", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/upi", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/coupon", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/payment-request", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/payment-history", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([u, a, c, s, sa, upiRes, couponRes, paymentReqRes, paymentHistoryRes]) => {
        const upis = Array.isArray(upiRes.upis) ? upiRes.upis : [];
        const coupons = Array.isArray(couponRes.coupons) ? couponRes.coupons : [];
        const requests = Array.isArray(paymentReqRes.requests) ? paymentReqRes.requests : [];
        const history = (Array.isArray(paymentHistoryRes.history) ? paymentHistoryRes.history : []).filter(
          shouldKeepPaymentHistory
        );

        setStats({
          users: u.users?.length ?? 0,
          ads: a.ads?.length ?? 0,
          cities: c.cities?.length ?? 0,
          states: s.states?.length ?? 0,
          subAdmins: sa.admins?.length ?? 0,
          upiTotal: upis.length,
          activeCoupons: coupons.filter((coupon: Coupon) => coupon.active).length,
          pendingPayments: requests.filter((request: PaymentRequest) => request.status === "pending").length,
          confirmedPayments: requests.filter((request: PaymentRequest) => request.status === "confirmed").length,
          declinedPayments: requests.filter((request: PaymentRequest) => request.status === "declined").length,
          totalAmountAfterDiscount: history.reduce((sum: number, item: PaymentHistory) => {
            const finalAmount =
              typeof item.finalAmount === "number"
                ? item.finalAmount
                : Math.max(0, (item.amount ?? 0) - (item.discount ?? 0));
            return sum + finalAmount;
          }, 0),
          totalCoinsSold: history.reduce((sum: number, item: PaymentHistory) => sum + (item.coins ?? 0), 0),
        });
      })
      .catch(() => {
        setStats({
          users: 0,
          ads: 0,
          cities: 0,
          states: 0,
          subAdmins: 0,
          upiTotal: 0,
          activeCoupons: 0,
          pendingPayments: 0,
          confirmedPayments: 0,
          declinedPayments: 0,
          totalAmountAfterDiscount: 0,
          totalCoinsSold: 0,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const baseCards = [
    { label: "Users", value: stats.users, href: "/admin/users" },
    { label: "Ads", value: stats.ads, href: "/admin/ads" },
    { label: "States", value: stats.states, href: "/admin/state" },
    { label: "Cities", value: stats.cities, href: "/admin/city" },
    { label: "Sub Admins", value: stats.subAdmins, href: "/admin/sub-admins" },
  ];

  const paymentCards = [
    { label: "Total UPI IDs", value: stats.upiTotal },
    { label: "Active Coupons", value: stats.activeCoupons },
    { label: "Payment Pending", value: stats.pendingPayments },
    { label: "Confirmed", value: stats.confirmedPayments },
    { label: "Declined", value: stats.declinedPayments },
    { label: "Total Amount", value: `₹${stats.totalAmountAfterDiscount}` },
    { label: "Total Coins Sold", value: stats.totalCoinsSold },
  ];

  return (
    <main className="p-6 sm:p-10">
      <h1 className="text-3xl font-black text-red-950">Dashboard</h1>
      <p className="mt-2 text-red-900">Overview of your platform and payment activity.</p>

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-bold text-red-950">Platform Summary</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {baseCards.map((card) => (
            <a
              key={card.label}
              href={card.href}
              className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm transition hover:border-red-200"
            >
              <p className="text-sm font-medium text-red-900">{card.label}</p>
              <p className="mt-2 text-4xl font-black text-red-950">
                {loading ? "..." : card.value}
              </p>
            </a>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-red-950">Payment Summary</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {paymentCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm transition hover:border-red-200"
            >
              <p className="text-sm font-medium text-red-900">{card.label}</p>
              <p className="mt-3 text-3xl font-black text-red-950">
                {loading ? "..." : card.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
