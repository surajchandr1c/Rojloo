"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminContext } from "@/components/admin/use-admin-context";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/date";

type Assignment = {
  _id?: string;
  cityName: string;
  citySlug?: string;
  email: string;
  status: "pending" | "active" | "inactive" | "expired";
  assignedAt: string;
  expiresAt: string;
  createdAt: string;
};

export default function VipPage() {
  const router = useRouter();
  const me = useAdminContext();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [cities, setCities] = useState("");
  const [citySlug, setCitySlug] = useState("");
  const [email, setEmail] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!me?.authenticated) {
      router.replace("/admin/login");
      return;
    }
    if (me.role !== "main") {
      router.replace("/admin");
      return;
    }
    loadAssignments();
  }, [me, router]);

  async function loadAssignments() {
    try {
      const res = await fetch("/api/admin/vip", { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load VIP assignments");
      }
      const data = await res.json();
      setAssignments(data.assignments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load VIP assignments");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/vip", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cities: cities
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean),
          citySlug: citySlug.trim(),
          email: email.trim(),
          expiresInDays,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to assign VIP control");
      }
      const count = Array.isArray(data.assignments) ? data.assignments.length : 1;
      setSuccess(`VIP access assigned to ${count} city${count > 1 ? "ies" : "y"} and confirmation email sent to ${email.trim()}.`);
      setCities("");
      setCitySlug("");
      setEmail("");
      setExpiresInDays(7);
      await loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign VIP control");
    } finally {
      setLoading(false);
    }
  }

  async function handleExtend(id?: string, days = 7) {
    if (!id) return;
    try {
      const res = await fetch("/api/admin/vip", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, extendDays: days }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to update VIP assignment");
      }
      setSuccess(days > 0 ? `VIP access extended by ${days} days.` : `VIP access reduced by ${Math.abs(days)} days.`);
      await loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update VIP assignment");
    }
  }

  async function handleToggle(id?: string, active?: boolean) {
    if (!id) return;
    try {
      const res = await fetch("/api/admin/vip", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to update VIP assignment");
      }
      setSuccess(active ? "VIP access activated for this city." : "VIP access marked inactive for this city.");
      await loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update VIP assignment");
    }
  }

  async function handleDelete(id?: string) {
    if (!id || !confirm("Delete this VIP assignment?")) return;
    try {
      const res = await fetch("/api/admin/vip", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete VIP assignment");
      }
      await loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete VIP assignment");
    }
  }

  function getAssignedDays(item: Assignment) {
    const start = new Date(item.assignedAt).getTime();
    const end = new Date(item.expiresAt).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) return 0;
    return Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  }

  if (!me || !me.authenticated) return null;

  return (
    <main className="min-h-screen bg-red-50 p-6 sm:p-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-black text-red-950">VIP City Access</h1>
        <p className="mt-2 text-red-900">
          Add a city owner email and send a confirmation notice with a 7-day expiry reminder flow.
        </p>

        {error && <div className="mt-4 rounded-xl bg-red-100 p-3 text-sm text-red-800">{error}</div>}
        {success && <div className="mt-4 rounded-xl bg-green-100 p-3 text-sm text-green-800">{success}</div>}

        <div className="mt-8 rounded-2xl border border-red-200 bg-white p-6">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-red-950">City Names</label>
              <textarea
                value={cities}
                onChange={(e) => setCities(e.target.value)}
                className="min-h-28 w-full rounded-xl border border-red-200 px-4 py-2.5 text-red-950 outline-none focus:border-red-400"
                placeholder="Jaipur, Delhi, Mumbai"
                required
              />
              <p className="mt-1 text-xs text-red-600">Enter multiple city names separated by commas.</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-red-950">City Slug</label>
              <input
                type="text"
                value={citySlug}
                onChange={(e) => setCitySlug(e.target.value)}
                className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-red-950 outline-none focus:border-red-400"
                placeholder="jaipur"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-red-950">Owner Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-red-950 outline-none focus:border-red-400"
                placeholder="owner@example.com"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-red-950">Expire In (Days)</label>
              <input
                type="number"
                min={1}
                max={365}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value || 7))}
                className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-red-950 outline-none focus:border-red-400"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#450a0a] px-5 py-2.5 font-semibold text-white hover:bg-[#7f1d1d] disabled:opacity-60"
              >
                {loading ? "Sending..." : "Assign VIP Access"}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-bold text-red-950">Assigned Cities</h2>
          {assignments.length === 0 ? (
            <div className="rounded-2xl border border-red-200 bg-white p-6 text-red-900">No VIP city assignments yet.</div>
          ) : (
            assignments.map((item) => (
              <div key={item._id} className="relative rounded-2xl border border-red-200 bg-white p-5">
                <div className="absolute right-4 top-4 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-900">
                  {getAssignedDays(item)} days
                </div>

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-red-950">{item.cityName}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.status === "active"
                          ? "bg-green-100 text-green-900"
                          : item.status === "inactive"
                            ? "bg-red-100 text-red-900"
                            : "bg-yellow-100 text-yellow-900"
                      }`}>
                        {item.status === "inactive" ? "Inactive" : item.status === "active" ? "Active" : "Pending"}
                      </span>
                    </div>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-red-600">Member since</p>
                    <p className="text-sm text-red-900">{formatDisplayDate(item.assignedAt)}</p>
                    <p className="mt-2 text-sm text-red-900">Email: {item.email}</p>
                    <p className="text-sm text-red-900">Expires: {formatDisplayDateTime(item.expiresAt)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleExtend(item._id, -7)}
                      className="rounded-lg bg-orange-100 px-3 py-2 text-sm font-semibold text-orange-900 hover:bg-orange-200"
                    >
                      -7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExtend(item._id, 7)}
                      className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-200"
                    >
                      +7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle(item._id, item.status !== "active")}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                        item.status === "active"
                          ? "bg-yellow-100 text-yellow-900 hover:bg-yellow-200"
                          : "bg-green-100 text-green-900 hover:bg-green-200"
                      }`}
                    >
                      {item.status === "active" ? "Mark Expired" : "Mark Active"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item._id)}
                      className="rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-900 hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
