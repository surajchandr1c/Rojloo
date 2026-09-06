"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminContext } from "@/components/admin/use-admin-context";
import { formatDisplayDateTime } from "@/lib/date";

type NotFoundItem = {
  _id: string;
  path: string;
  hits: number;
  firstSeen: string;
  lastSeen: string;
  referrers?: string[];
  userAgent?: string;
  ip?: string;
  resolved: boolean;
};

export default function AdminNotFoundPage() {
  const router = useRouter();
  const me = useAdminContext();

  const [logs, setLogs] = useState<NotFoundItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalHits, setTotalHits] = useState(0);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "unresolved" | "resolved">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      const res = await fetch(`/api/admin/not-found?${params.toString()}`, {
        credentials: "include",
      });

      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }

      const data = await res.json();
      setLogs(data.logs || []);
      setTotalCount(data.totalCount || 0);
      setTotalHits(data.totalHits || 0);
      setUnresolvedCount(data.unresolvedCount || 0);
      setResolvedCount(data.resolvedCount || 0);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load 404 error logs.");
    } finally {
      setLoading(false);
    }
  }, [filter, router, searchTerm]);

  useEffect(() => {
    if (me === null) return;
    if (!me.authenticated) {
      router.replace("/admin/login");
      return;
    }
    loadData();
  }, [loadData, me, router]);

  async function handleToggleResolved(item: NotFoundItem) {
    try {
      setProcessingId(item._id);
      const res = await fetch("/api/admin/not-found", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item._id, resolved: !item.resolved }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this 404 log entry?")) return;
    try {
      setProcessingId(id);
      const res = await fetch("/api/admin/not-found", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Failed to delete log:", err);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleClearAll() {
    if (!window.confirm("Are you sure you want to clear ALL 404 error logs? This cannot be undone.")) return;
    try {
      setClearing(true);
      const res = await fetch("/api/admin/not-found", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Failed to clear logs:", err);
    } finally {
      setClearing(false);
    }
  }

  function handleCopy(path: string, id: string) {
    navigator.clipboard.writeText(path);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-red-950 sm:text-3xl">
            404 Pages Monitor
          </h1>
          <p className="mt-1 text-sm text-red-800/80">
            View broken links and non-existent URLs visited by users so you can fix or redirect them.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-950 shadow-sm transition hover:bg-red-50 disabled:opacity-50"
          >
            <svg
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
          {logs.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={clearing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
            >
              {clearing ? "Clearing..." : "Clear All Logs"}
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-red-800/60">
            Broken URLs
          </div>
          <div className="mt-1 text-2xl font-black text-red-950">{totalCount}</div>
        </div>
        <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-red-800/60">
            Total 404 Hits
          </div>
          <div className="mt-1 text-2xl font-black text-rose-600">{totalHits}</div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">
            Needs Fix
          </div>
          <div className="mt-1 text-2xl font-black text-amber-900">{unresolvedCount}</div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
            Resolved / Fixed
          </div>
          <div className="mt-1 text-2xl font-black text-emerald-900">{resolvedCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-red-100 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              filter === "all"
                ? "bg-[#7f1d1d] text-white shadow-sm"
                : "text-red-950 hover:bg-red-50"
            }`}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unresolved")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              filter === "unresolved"
                ? "bg-rose-700 text-white shadow-sm"
                : "text-red-950 hover:bg-red-50"
            }`}
          >
            Needs Fix ({unresolvedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("resolved")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              filter === "resolved"
                ? "bg-emerald-700 text-white shadow-sm"
                : "text-red-950 hover:bg-red-50"
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search broken URL path..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 rounded-xl border border-red-200 bg-red-50/40 px-3.5 py-1.5 text-xs text-red-950 placeholder-red-400 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-2 text-xs text-red-400 hover:text-red-700"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Logs Table */}
      <div className="rounded-2xl border border-red-100 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm font-semibold text-red-800/60">
            Loading 404 logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-red-950">No 404 Errors Found</h3>
            <p className="mt-1 text-xs text-red-800/70">
              {searchTerm || filter !== "all"
                ? "No 404 records match your current filter."
                : "No visitors have encountered broken links yet! All site pages are working properly."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-red-100 bg-red-50/50 text-[11px] font-bold uppercase tracking-wider text-red-900/70">
                <tr>
                  <th className="px-4 py-3.5">Broken URL / Path</th>
                  <th className="px-3 py-3.5 text-center">Hits</th>
                  <th className="px-3 py-3.5">Last Seen</th>
                  <th className="px-4 py-3.5">Referrer</th>
                  <th className="px-3 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-50">
                {logs.map((item) => (
                  <tr
                    key={item._id}
                    className={`transition-colors hover:bg-red-50/30 ${
                      item.resolved ? "bg-emerald-50/20" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium text-red-950 max-w-xs sm:max-w-sm truncate">
                      <div className="flex items-center gap-2">
                        <span className="truncate" title={item.path}>
                          {item.path}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.path, item._id)}
                          title="Copy path"
                          className="flex-shrink-0 text-red-400 hover:text-red-700 transition"
                        >
                          {copiedId === item._id ? (
                            <span className="text-[10px] font-bold text-emerald-600">Copied!</span>
                          ) : (
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          )}
                        </button>
                        <a
                          href={item.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Test URL in new tab"
                          className="flex-shrink-0 text-red-400 hover:text-red-700 transition"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-extrabold text-rose-800">
                        {item.hits}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-red-800/80 whitespace-nowrap">
                      {formatDisplayDateTime(item.lastSeen)}
                    </td>
                    <td className="px-4 py-3 text-red-800/70 max-w-xs truncate">
                      {item.referrers && item.referrers.length > 0 ? (
                        <span title={item.referrers.join(", ")}>
                          {item.referrers[item.referrers.length - 1]}
                        </span>
                      ) : (
                        <span className="italic text-gray-400">Direct / Bookmark</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      {item.resolved ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                          Fixed
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                          Needs Fix
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={processingId === item._id}
                          onClick={() => handleToggleResolved(item)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                            item.resolved
                              ? "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                              : "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          }`}
                        >
                          {item.resolved ? "Reopen" : "Mark as Fixed"}
                        </button>
                        <button
                          type="button"
                          disabled={processingId === item._id}
                          onClick={() => handleDelete(item._id)}
                          className="rounded-lg border border-red-200 p-1 text-red-600 hover:bg-red-50 hover:text-red-800 transition"
                          title="Delete log"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}