"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDisplayDate } from "@/lib/date";
import { AdminTableSkeleton } from "@/components/skeletons/admin-skeletons";
import CityNavTabs from "@/components/admin/city-nav-tabs";
import { useDebounce } from "@/hooks/use-debounce";

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
  createdAt?: string;
  updatedAt?: string;
};

type SeoInfo = {
  hasSeo: boolean;
  updatedAt?: string;
};

/**
 * High-performance city and state filter:
 * Matches city name, slug (with hyphen normalization), and state.
 * Supports multi-token search and word prefixes without noisy Levenshtein false positives.
 */
function matchesCity(city: DynamicCity, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  const name = (city.name || "").toLowerCase().trim();
  const slug = (city.slug || "").toLowerCase().trim();
  const state = (city.state || "").toLowerCase().trim();

  // 1. Direct match on name, slug, or state
  if (name.includes(q) || slug.includes(q) || state.includes(q)) {
    return true;
  }

  // 2. Normalized slug / phrase match (e.g. query "navi mumbai" vs slug "navi-mumbai")
  const normQ = q.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (normQ && (slug.includes(normQ) || slug.replace(/-/g, " ").includes(q))) {
    return true;
  }

  // 3. Multi-word search: all words in query must appear in name, slug, or state
  const tokens = q.split(/[\s\-_,]+/).filter(Boolean);
  if (tokens.length > 1) {
    const combined = `${name} ${slug} ${state}`;
    if (tokens.every((token) => combined.includes(token))) {
      return true;
    }
  }

  // 4. Word-prefix match on name or state (e.g. "mum" matches "Mumbai")
  const words = `${name} ${state}`.split(/[\s\-_,]+/).filter(Boolean);
  if (words.some((w) => w.startsWith(q))) {
    return true;
  }

  return false;
}

function getCityUpdateTime(
  c: DynamicCity,
  seoMap: Record<string, SeoInfo>,
  dynUpdateMap?: Record<string, number>
): number {
  const slugKey = (c.slug || "").trim().toLowerCase();
  const seo = seoMap[c.slug] || seoMap[slugKey];
  const seoTime = seo?.updatedAt ? new Date(seo.updatedAt).getTime() : 0;
  const cityTime = c.updatedAt ? new Date(c.updatedAt).getTime() : 0;
  const dynTime = dynUpdateMap ? (dynUpdateMap[slugKey] || 0) : 0;
  const validSeoTime = isNaN(seoTime) ? 0 : seoTime;
  const validCityTime = isNaN(cityTime) ? 0 : cityTime;
  return Math.max(validSeoTime, validCityTime, dynTime);
}

export default function AdminCities() {
  const [allCities, setAllCities] = useState<DynamicCity[]>([]);
  const [seoMap, setSeoMap] = useState<Record<string, SeoInfo>>({});
  const [dynUpdateMap, setDynUpdateMap] = useState<Record<string, number>>({});
  const [individualCities, setIndividualCities] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 300);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const loadRef = useRef(0);
  const router = useRouter();

  // City update statistics
  const stats = useMemo(() => {
    let updated = 0;
    for (const c of allCities) {
      if (getCityUpdateTime(c, seoMap, dynUpdateMap) > 0) updated++;
    }
    return {
      total: allCities.length,
      updated,
      notUpdated: allCities.length - updated,
    };
  }, [allCities, seoMap, dynUpdateMap]);

  // Filtered and Sorted Cities:
  // 1. Not updated cities stay at the TOP.
  // 2. Updated cities move towards the BOTTOM.
  // 3. Every time an admin updates any city, it receives the latest timestamp and automatically moves to the bottom / last.
  const filteredCities = useMemo(() => {
    const q = debouncedSearch.trim();
    const list = !q
      ? [...allCities]
      : allCities.filter((c) => matchesCity(c, q));

    return list.sort((a, b) => {
      const timeA = getCityUpdateTime(a, seoMap, dynUpdateMap);
      const timeB = getCityUpdateTime(b, seoMap, dynUpdateMap);

      // 1. Un-updated cities (time === 0) stay at the TOP
      if (timeA === 0 && timeB > 0) return -1;
      if (timeA > 0 && timeB === 0) return 1;

      // 2. Both updated: older updates first, most recently updated city at the VERY LAST (bottom)
      if (timeA !== timeB) {
        return timeA - timeB;
      }

      // 3. Alphabetical sort among un-updated or same timestamp
      return a.name.localeCompare(b.name);
    });
  }, [allCities, debouncedSearch, seoMap, dynUpdateMap]);

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
        fetch("/api/admin/cities", { credentials: "include", cache: "no-store" }),
        fetch("/api/admin/city-seo", { credentials: "include", cache: "no-store" }),
        fetch("/api/admin/dynamic-seo", { credentials: "include", cache: "no-store" }),
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
            if (s.slug) {
              const info = { hasSeo: true, updatedAt: s.updatedAt };
              map[s.slug] = info;
              map[s.slug.toLowerCase()] = info;
            }
          }
        );
        setSeoMap(map);
      }

      if (dynamicSeoRes.ok) {
        const dynData = await dynamicSeoRes.json();
        const ind = new Set<string>();
        const dynMap: Record<string, number> = {};
        (dynData.seo ?? []).forEach(
          (s: { citySlug: string; mode: string; updatedAt?: string }) => {
            const cSlug = (s.citySlug || "").toLowerCase().trim();
            if (s.mode === "individual") {
              ind.add(cSlug);
            }
            if (s.updatedAt) {
              const t = new Date(s.updatedAt).getTime();
              if (!isNaN(t) && t > 0) {
                dynMap[cSlug] = Math.max(dynMap[cSlug] || 0, t);
              }
            }
          }
        );
        setIndividualCities(ind);
        setDynUpdateMap(dynMap);
      }
    } finally {
      if (loadRef.current === loadId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });

    const onFocus = () => {
      void load();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
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
        <CityNavTabs activeTab="city-list" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500">
            Cities with a{" "}
            <span className="inline-flex items-center gap-1 font-semibold text-green-700">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              green dot
            </span>{" "}
            contain local areas with individual SEO content.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-gray-900 px-3.5 py-1.5 text-xs font-semibold text-white">
            Total: {stats.total}
          </span>
          <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 text-xs font-semibold">
            Not Updated: {stats.notUpdated} (Top)
          </span>
          <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 text-xs font-semibold">
            Updated: {stats.updated} (Bottom)
          </span>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-3.5 pr-8 py-2.5 text-sm text-gray-950 placeholder-gray-400 outline-none transition focus:border-gray-500 focus:bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by city name or state..."
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xs p-1 rounded-full cursor-pointer"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={removeSelected}
                className="rounded-full bg-red-600 !text-white px-4 py-2.5 text-sm font-semibold hover:bg-red-700 transition shadow-xs cursor-pointer"
                style={{ color: "#ffffff" }}
              >
                Delete selected ({selectedIds.size})
              </button>
            )}
            {allCities.length > 0 && (
              <button
                type="button"
                onClick={deleteAll}
                className="rounded-full bg-red-600 !text-white px-4 py-2.5 text-sm font-semibold hover:bg-red-700 transition shadow-xs cursor-pointer"
                style={{ color: "#ffffff" }}
              >
                Delete All ({allCities.length})
              </button>
            )}
          </div>
        </div>
        {debouncedSearch && (
          <p className="mt-2 text-xs text-gray-500">
            Showing <span className="font-semibold text-gray-800">{filteredCities.length}</span> of{" "}
            <span className="font-semibold text-gray-800">{allCities.length}</span> cities matching &ldquo;{debouncedSearch}&rdquo;
          </p>
        )}
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
                const seo = seoMap[city.slug] || seoMap[(city.slug || "").toLowerCase()];
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
                      {(() => {
                        const updateTime = getCityUpdateTime(city, seoMap, dynUpdateMap);
                        if (updateTime > 0) {
                          const updateDate =
                            seo?.updatedAt ||
                            city.updatedAt ||
                            dynUpdateMap[city.slug.toLowerCase()];
                          return (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {updateDate ? formatDisplayDate(updateDate) : "Updated"}
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                            Not updated
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {city.source === "Custom" && (
                          <button
                            type="button"
                            onClick={() => router.push(`/places/${city.slug}`)}
                            className="rounded-full bg-gray-600 px-3 py-1.5 text-xs font-semibold !text-white hover:bg-gray-700 cursor-pointer"
                          >
                            View
                          </button>
                        )}
                        <Link
                          href={`/admin/city-seo?city=${encodeURIComponent(
                            city.slug
                          )}`}
                          className="rounded-full bg-gray-600 px-3 py-1.5 text-xs font-semibold !text-white hover:bg-gray-700 cursor-pointer"
                        >
                          Edit SEO
                        </Link>
                        <Link
                          href={`/admin/dynamic-seo?city=${encodeURIComponent(
                            city.slug
                          )}`}
                          className="rounded-full bg-green-700 px-3 py-1.5 text-xs font-semibold !text-white hover:bg-green-800 transition shadow-xs cursor-pointer"
                        >
                          Dynamic SEO
                        </Link>
                        <button
                          type="button"
                          onClick={() => remove(cityIdentifier)}
                          className="rounded-full bg-red-600 !text-white px-3 py-1.5 text-xs font-semibold hover:bg-red-700 transition cursor-pointer"
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
