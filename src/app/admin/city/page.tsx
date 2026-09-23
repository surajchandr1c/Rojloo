"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDisplayDate } from "@/lib/date";
import { AdminTableSkeleton } from "@/components/skeletons/admin-skeletons";

type DynamicCity = {
  _id?: string;
  name: string;
  slug: string;
  state?: string;
  region: string;
  country?: string;
  famousFood: string;
  seoDescription: string;
  source: "Custom" | "Static";
};

type SeoInfo = {
  hasSeo: boolean;
  updatedAt?: string;
};

/**
 * Dependency-free fuzzy matching:
 * Supports direct substring, multi-token match, character-order subsequence,
 * and edit-distance typo tolerance.
 */
function fuzzyMatch(target: string, query: string): boolean {
  if (!query) return true;
  if (!target) return false;
  const t = target.toLowerCase().trim();
  const q = query.toLowerCase().trim();

  // 1. Direct substring
  if (t.includes(q)) return true;

  // 2. Token / word-level match (all words in query must be in target)
  const tokens = q.split(/[\s\-_,]+/).filter(Boolean);
  if (tokens.length > 0 && tokens.every((token) => t.includes(token))) {
    return true;
  }

  // 3. Subsequence matching (letters in query appear in order in target)
  let tIdx = 0;
  let qIdx = 0;
  while (tIdx < t.length && qIdx < q.length) {
    if (t[tIdx] === q[qIdx]) {
      qIdx++;
    }
    tIdx++;
  }
  if (qIdx === q.length) return true;

  // 4. Levenshtein edit distance for typo tolerance
  function lev(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
        else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  const maxDistance = q.length <= 3 ? 0 : q.length <= 5 ? 1 : 2;
  if (lev(t.slice(0, q.length), q) <= maxDistance) return true;

  const targetWords = t.split(/[\s\-_,]+/).filter(Boolean);
  for (const word of targetWords) {
    if (lev(word.slice(0, q.length), q) <= maxDistance) return true;
    if (lev(word, q) <= maxDistance) return true;
  }

  return false;
}

export default function AdminCities() {
  const [allCities, setAllCities] = useState<DynamicCity[]>([]);
  const [seoMap, setSeoMap] = useState<Record<string, SeoInfo>>({});
  const [individualCities, setIndividualCities] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const loadRef = useRef(0);
  const router = useRouter();

  // 300ms Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Debounced Fuzzy Filtered Cities (checks name, state, slug, region, country)
  const filteredCities = useMemo(() => {
    const q = debouncedSearch.trim();
    if (!q) return allCities;
    return allCities.filter(
      (c) =>
        fuzzyMatch(c.name, q) ||
        (c.state && fuzzyMatch(c.state, q)) ||
        fuzzyMatch(c.slug, q) ||
        fuzzyMatch(c.region, q) ||
        (c.country && fuzzyMatch(c.country, q))
    );
  }, [allCities, debouncedSearch]);

  const selectableIds = useMemo(
    () =>
      filteredCities
        .map((city) => city._id || city.slug)
        .filter((id): id is string => Boolean(id)),
    [filteredCities]
  );

  const allFilteredSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));

  const load = useCallback(async () => {
    const loadId = ++loadRef.current;
    setLoading(true);
    try {
      const [citiesRes, seoRes, dynamicSeoRes] = await Promise.all([
        fetch("/api/admin/cities", { credentials: "include" }),
        fetch("/api/admin/city-seo", { credentials: "include" }),
        fetch("/api/admin/dynamic-seo", { credentials: "include" }),
      ]);

      if (loadId !== loadRef.current) return;

      if (!citiesRes.ok) {
        if (citiesRes.status === 401) {
          return;
        }
      } else {
        const citiesData = await citiesRes.json();
        const cities = citiesData.cities ?? [];
        const seen = new Set<string>();
        const deduped = cities.filter((c: DynamicCity) => {
          const key = `${c.source}-${c._id || c.slug}-${c.state || ""}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setAllCities(deduped);
        setSelectedIds(new Set());
      }

      if (seoRes.ok) {
        const seoData = await seoRes.json();
        const map: Record<string, SeoInfo> = {};
        (seoData.seo ?? []).forEach(
          (s: { slug: string; updatedAt?: string }) => {
            map[s.slug] = { hasSeo: true, updatedAt: s.updatedAt };
          }
        );
        setSeoMap(map);
      }

      if (dynamicSeoRes.ok) {
        const dynData = await dynamicSeoRes.json();
        const ind = new Set<string>();
        (dynData.seo ?? []).forEach((s: { citySlug: string; mode: string }) => {
          if (s.mode === "individual") {
            ind.add(s.citySlug.toLowerCase());
          }
        });
        setIndividualCities(ind);
      }
    } finally {
      if (loadRef.current === loadId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function remove(id?: string) {
    if (!id) return;
    if (!confirm("Delete this city?")) return;
    setAllCities((prev) => prev.filter((c) => (c._id || c.slug) !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    try {
      const res = await fetch("/api/admin/cities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        alert("Failed to delete city.");
        await load();
      }
    } catch {
      alert("Failed to delete city.");
      await load();
    }
  }

  function toggleCity(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allFilteredSelected) {
        selectableIds.forEach((id) => next.delete(id));
      } else {
        selectableIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function removeSelected() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} selected ${ids.length === 1 ? "city" : "cities"}?`)) {
      return;
    }
    const idSet = new Set(ids);
    setAllCities((prev) => prev.filter((c) => !idSet.has(c._id || c.slug)));
    setSelectedIds(new Set());
    try {
      const res = await fetch("/api/admin/cities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        alert("Failed to delete selected cities.");
        await load();
      }
    } catch {
      alert("Failed to delete selected cities.");
      await load();
    }
  }

  async function deleteAll() {
    const ids = allCities
      .map((c) => c._id || c.slug)
      .filter((id): id is string => Boolean(id));
    if (ids.length === 0) return;
    if (!confirm(`Delete ALL ${ids.length} cities? This cannot be undone.`)) {
      return;
    }
    setAllCities([]);
    setSelectedIds(new Set());
    try {
      const res = await fetch("/api/admin/cities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        alert("Failed to delete all cities.");
        await load();
      }
    } catch {
      alert("Failed to delete all cities.");
      await load();
    }
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0">
      {/* Top Navigation Tabs */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-3xl font-black text-gray-950">Cities</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage cities available on the platform and monitor local area SEO status.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/city"
            className="rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold !text-white text-white transition shadow-sm"
            style={{ color: "#ffffff" }}
          >
            City List
          </Link>
          <Link
            href="/admin/city-seo"
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            City SEO
          </Link>
          <Link
            href="/admin/dynamic-seo"
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Dynamic SEO
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500">
            Cities with a <span className="inline-flex items-center gap-1 font-semibold text-green-700"><span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>green dot</span> contain local areas with individual SEO content.
          </p>
        </div>
        <span className="rounded-full bg-gray-600 px-4 py-2 text-sm font-semibold text-white">
          Total Cities: {allCities.length}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-950 outline-none focus:border-gray-500 sm:w-72"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by city name"
          />
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={removeSelected}
              className="rounded-full bg-red-600 !text-white px-4 py-2.5 text-sm font-semibold hover:bg-red-700 transition"
            >
              Delete selected ({selectedIds.size})
            </button>
          )}
          {allCities.length > 0 && (
            <button
              type="button"
              onClick={deleteAll}
              className="rounded-full bg-red-600 !text-white px-4 py-2.5 text-sm font-semibold hover:bg-red-700 transition"
            >
              Delete All ({allCities.length})
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <AdminTableSkeleton
          headers={[
            "Select",
            "Name",
            "State",
            "Country",
            "Last updated",
            "Actions",
          ]}
          minWidth="min-w-[640px]"
        />
      ) : filteredCities.length === 0 ? (
        <p className="mt-6 text-gray-900">No cities found.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-100 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-950">
              <tr>
                <th className="w-12 px-4 py-3 font-semibold">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAllFiltered}
                    aria-label="Select all visible cities"
                  />
                </th>
                 <th className="px-4 py-3 font-semibold">Name</th>
                 <th className="px-4 py-3 font-semibold">State</th>
                 <th className="px-4 py-3 font-semibold">Country</th>
                 <th className="px-4 py-3 font-semibold">Last updated</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCities.map((city) => {
                const cityIdentifier = city._id || city.slug;
                const seo = seoMap[city.slug];
                return (
                  <tr
                    key={`${city.source}-${cityIdentifier}`}
                    className="border-t border-gray-50"
                  >
                    <td className="px-4 py-3">
                      {cityIdentifier && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(cityIdentifier)}
                          onChange={() => toggleCity(cityIdentifier)}
                          aria-label={`Select ${city.name}`}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        {individualCities.has(city.slug.toLowerCase()) ? (
                          <span
                            className="h-2.5 w-2.5 flex-none rounded-full bg-green-500 ring-4 ring-green-100 shadow-xs"
                            title="This city contains local areas with custom individual SEO content"
                          />
                        ) : (
                          <span
                            className="h-2.5 w-2.5 flex-none rounded-full bg-gray-200"
                            title="All local areas inherit from city"
                          />
                        )}
                        <Link
                          href={`/admin/city-seo?city=${encodeURIComponent(
                            city.slug
                          )}`}
                          className="text-gray-950 underline-offset-2 hover:underline"
                        >
                          {city.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {city.state || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {city.country || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {seo?.hasSeo ? (
                        <span className="text-xs text-gray-400">
                          {seo.updatedAt ? formatDisplayDate(seo.updatedAt) : "—"}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {city.source === "Custom" && (
                          <button
                            type="button"
                            onClick={() => router.push(`/places/${city.slug}`)}
                            className="rounded-full bg-gray-600 px-3 py-1.5 text-xs font-semibold !text-white hover:bg-gray-700"
                          >
                            View
                          </button>
                        )}
                        <Link
                          href={`/admin/city-seo?city=${encodeURIComponent(
                            city.slug
                          )}`}
                          className="rounded-full bg-gray-600 px-3 py-1.5 text-xs font-semibold !text-white hover:bg-gray-700"
                        >
                          Edit SEO
                        </Link>
                        <Link
                          href={`/admin/dynamic-seo?city=${encodeURIComponent(
                            city.slug
                          )}`}
                          className="rounded-full bg-green-700 px-3 py-1.5 text-xs font-semibold !text-white hover:bg-green-800 transition shadow-xs"
                        >
                          Dynamic SEO
                        </Link>
                        <button
                          type="button"
                          onClick={() => remove(cityIdentifier)}
                          className="rounded-full bg-red-600 !text-white px-3 py-1.5 text-xs font-semibold hover:bg-red-700 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
