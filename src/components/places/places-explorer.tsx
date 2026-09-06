"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export type PlaceCityItem = {
  name: string;
  slug: string;
  state?: string;
  adCount: number;
};

type FilterMode = "all" | "city" | "state";

// Common aliases for Indian cities and states
const LOCATION_ALIASES: Record<string, { type: "city" | "state"; name: string }> = {
  bangalore: { type: "city", name: "Bengaluru" },
  bombay: { type: "city", name: "Mumbai" },
  calcutta: { type: "city", name: "Kolkata" },
  madras: { type: "city", name: "Chennai" },
  poona: { type: "city", name: "Pune" },
  trivandrum: { type: "city", name: "Thiruvananthapuram" },
  cochin: { type: "city", name: "Kochi" },
  benaras: { type: "city", name: "Varanasi" },
  banaras: { type: "city", name: "Varanasi" },
  kashi: { type: "city", name: "Varanasi" },
  baroda: { type: "city", name: "Vadodara" },
  gurgaon: { type: "city", name: "Gurugram" },
  orissa: { type: "state", name: "Odisha" },
  pondicherry: { type: "city", name: "Puducherry" },
};

const SUGGESTED_SEARCHES = [
  "Maharashtra",
  "Gujarat",
  "Delhi",
  "Mumbai",
  "Rajasthan",
  "Bengaluru",
  "Kerala",
  "Uttar Pradesh",
];

// Damerau-Levenshtein distance calculation (handles insertions, deletions, substitutions, and transpositions)
function damerauLevenshtein(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const matrix: number[][] = [];

  for (let i = 0; i <= al; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bl; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let min = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );

      // transposition
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        min = Math.min(min, matrix[i - 2][j - 2] + 1);
      }

      matrix[i][j] = min;
    }
  }

  return matrix[al][bl];
}

// Calculate fuzzy similarity score between query and candidate string (0 to 1)
function getFuzzyScore(query: string, target: string): number {
  const q = query.trim().toLowerCase();
  const t = target.trim().toLowerCase();

  if (!q || !t) return 0;
  if (q === t) return 1.0;

  // Direct prefix match (e.g. "Mum" -> "Mumbai")
  if (t.startsWith(q)) {
    return 0.92 + Math.min(0.07, (q.length / t.length) * 0.07);
  }

  // Substring match
  const idx = t.indexOf(q);
  if (idx !== -1) {
    return Math.max(0.75, 0.85 - idx * 0.02 + (q.length / t.length) * 0.05);
  }

  // Word-level prefix or match for multi-word locations (e.g. "Pradesh", "Tamil")
  const words = t.split(/[\s-]+/);
  for (const word of words) {
    if (word === q) return 0.93;
    if (word.startsWith(q)) return 0.88;
  }

  // Damerau-Levenshtein full string comparison
  const dist = damerauLevenshtein(q, t);
  const maxLen = Math.max(q.length, t.length);

  let maxAllowedDist = 1;
  if (q.length >= 8) maxAllowedDist = 3;
  else if (q.length >= 5) maxAllowedDist = 2;
  else if (q.length <= 2) maxAllowedDist = 0;

  if (dist <= maxAllowedDist) {
    return Math.max(0.6, 0.85 * (1 - dist / maxLen));
  }

  // Word-level fuzzy comparison (e.g. "Utar" vs "Uttar" in "Uttar Pradesh")
  for (const word of words) {
    const wDist = damerauLevenshtein(q, word);
    const wMax = Math.max(q.length, word.length);
    let wAllowed = 1;
    if (q.length >= 7) wAllowed = 2;
    else if (q.length <= 2) wAllowed = 0;

    if (wDist <= wAllowed) {
      return Math.max(0.55, 0.80 * (1 - wDist / wMax));
    }
  }

  return 0;
}

function filterCities(
  cities: PlaceCityItem[],
  query: string
): {
  filtered: PlaceCityItem[];
  mode: FilterMode;
  matchedTarget?: string;
} {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { filtered: cities, mode: "all" };
  }

  // 1. Alias lookup
  const alias = LOCATION_ALIASES[q];
  if (alias) {
    if (alias.type === "city") {
      const matched = cities.filter(
        (c) => c.name.toLowerCase() === alias.name.toLowerCase()
      );
      if (matched.length > 0) {
        return { filtered: matched, mode: "city", matchedTarget: alias.name };
      }
    } else if (alias.type === "state") {
      const stateCities = cities.filter(
        (c) => c.state && c.state.toLowerCase() === alias.name.toLowerCase()
      );
      if (stateCities.length > 0) {
        return { filtered: stateCities, mode: "state", matchedTarget: alias.name };
      }
    }
  }

  // 2. Exact match check
  const exactCity = cities.filter(
    (c) => c.name.toLowerCase() === q || c.slug.toLowerCase() === q
  );
  if (exactCity.length > 0) {
    return { filtered: exactCity, mode: "city", matchedTarget: exactCity[0].name };
  }

  const exactState = cities.filter(
    (c) => c.state && c.state.trim().toLowerCase() === q
  );
  if (exactState.length > 0) {
    return {
      filtered: exactState,
      mode: "state",
      matchedTarget: exactState[0]?.state,
    };
  }

  // 3. Unique states score calculation
  const uniqueStates = Array.from(
    new Set(cities.map((c) => c.state).filter(Boolean))
  ) as string[];

  let bestState = "";
  let bestStateScore = 0;

  for (const st of uniqueStates) {
    const score = getFuzzyScore(q, st);
    if (score > bestStateScore) {
      bestStateScore = score;
      bestState = st;
    }
  }

  // 4. City scores calculation
  const scoredCities: Array<{ city: PlaceCityItem; score: number }> = [];
  let bestCityScore = 0;

  for (const city of cities) {
    const nameScore = getFuzzyScore(q, city.name);
    const slugScore = getFuzzyScore(q, city.slug);
    const maxScore = Math.max(nameScore, slugScore);
    if (maxScore >= 0.5) {
      scoredCities.push({ city, score: maxScore });
    }
    if (maxScore > bestCityScore) {
      bestCityScore = maxScore;
    }
  }

  scoredCities.sort((a, b) => b.score - a.score);

  // If neither state nor city matches above threshold
  if (bestStateScore < 0.5 && bestCityScore < 0.5) {
    return { filtered: [], mode: "all" };
  }

  // If state fuzzy score is stronger than city (e.g. user typed "Gujrat", "Maharastra", "Rajsthan")
  if (bestStateScore >= 0.6 && bestStateScore > bestCityScore + 0.05) {
    const stateCities = cities.filter(
      (c) => c.state && c.state.toLowerCase() === bestState.toLowerCase()
    );
    return { filtered: stateCities, mode: "state", matchedTarget: bestState };
  }

  // If city fuzzy score is stronger or equal (e.g. user typed "Mumbay", "Surat", "Bngluru")
  if (bestCityScore >= 0.5 && bestCityScore >= bestStateScore) {
    const matchingCities = scoredCities
      .filter((item) => item.score >= 0.55 && item.score >= bestCityScore - 0.2)
      .map((item) => item.city);

    return {
      filtered: matchingCities,
      mode: "city",
      matchedTarget: matchingCities[0]?.name,
    };
  }

  // Fallback to state if state score meets threshold
  if (bestStateScore >= 0.55) {
    const stateCities = cities.filter(
      (c) => c.state && c.state.toLowerCase() === bestState.toLowerCase()
    );
    return { filtered: stateCities, mode: "state", matchedTarget: bestState };
  }

  // Fallback to cities
  const fallbackCities = scoredCities.map((item) => item.city);
  return { filtered: fallbackCities, mode: "city", matchedTarget: fallbackCities[0]?.name };
}

export default function PlacesExplorer({
  initialCities,
  initialQuery = "",
}: {
  initialCities: PlaceCityItem[];
  initialQuery?: string;
}) {
  const [search, setSearch] = useState(initialQuery);

  const { filtered, mode, matchedTarget } = useMemo(() => {
    return filterCities(initialCities, search);
  }, [initialCities, search]);

  function handleSearchChange(val: string) {
    setSearch(val);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (val.trim()) {
        url.searchParams.set("q", val.trim());
      } else {
        url.searchParams.delete("q");
      }
      window.history.replaceState({}, "", url.toString());
    }
  }

  return (
    <div className="mt-4 space-y-5">
      {/* Search Bar */}
      <div className="relative max-w-xl">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-red-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by state (e.g. Gujarat) or city (e.g. Mumbai)..."
          className="w-full rounded-2xl border-2 border-red-200 bg-white py-3.5 pl-11 pr-11 text-base text-red-950 shadow-sm placeholder:text-red-300 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-100 sm:text-sm"
        />

        {search && (
          <button
            type="button"
            onClick={() => handleSearchChange("")}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-red-400 hover:text-red-700"
            aria-label="Clear search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Suggested Quick Filters */}
      {!search.trim() && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="font-semibold text-red-900">Popular:</span>
          {SUGGESTED_SEARCHES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => handleSearchChange(item)}
              className="rounded-full border border-red-200 bg-pink-50/70 px-3 py-1 font-medium text-red-950 transition-colors hover:bg-red-800 hover:text-white"
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {/* Filter Status */}
      {search.trim() && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-red-900">
          {mode === "state" && matchedTarget ? (
            <p>
              Showing all {filtered.length}{" "}
              {filtered.length === 1 ? "city" : "cities"} in{" "}
              <span className="font-bold text-red-950">{matchedTarget}</span>
              {matchedTarget.toLowerCase() !== search.trim().toLowerCase() && (
                <span className="ml-1 text-xs text-red-600">
                  (matched &ldquo;{search.trim()}&rdquo;)
                </span>
              )}
            </p>
          ) : mode === "city" && matchedTarget ? (
            <p>
              Showing {filtered.length}{" "}
              {filtered.length === 1 ? "city" : "cities"} matching{" "}
              <span className="font-bold text-red-950">{matchedTarget}</span>
              {matchedTarget.toLowerCase() !== search.trim().toLowerCase() && (
                <span className="ml-1 text-xs text-red-600">
                  (matched &ldquo;{search.trim()}&rdquo;)
                </span>
              )}
            </p>
          ) : (
            <p>
              Found {filtered.length}{" "}
              {filtered.length === 1 ? "result" : "results"}
            </p>
          )}

          <button
            type="button"
            onClick={() => handleSearchChange("")}
            className="font-medium text-red-700 underline hover:text-red-900"
          >
            Reset filter
          </button>
        </div>
      )}

      {/* Cities Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-red-100 bg-pink-50/50 p-8 text-center">
          <p className="text-base font-semibold text-red-950">
            No cities found matching &ldquo;{search.trim()}&rdquo;
          </p>
          <p className="mt-1 text-sm text-red-800">
            Try searching by state name (e.g. &ldquo;Gujarat&rdquo;) or city name
            (e.g. &ldquo;Mumbai&rdquo;).
          </p>
          <button
            type="button"
            onClick={() => handleSearchChange("")}
            className="mt-4 inline-flex items-center rounded-full bg-red-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-900"
          >
            View all cities
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((city) => (
            <Link
              key={city.slug}
              href={`/places/${city.slug}`}
              className="group flex flex-col rounded-2xl border border-red-100 bg-white p-5 transition-all hover:border-red-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3 min-w-0">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-black text-red-950 transition-colors group-hover:text-red-700 break-words">
                    {city.name}
                  </h2>
                  {city.state && (
                    <p className="mt-0.5 text-xs font-medium text-red-700 truncate">
                      {city.state}
                    </p>
                  )}
                </div>
                <span className="inline-flex shrink-0 items-center rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-red-800">
                  {city.adCount} {city.adCount === 1 ? "service" : "services"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
