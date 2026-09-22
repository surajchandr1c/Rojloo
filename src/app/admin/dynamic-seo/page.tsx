"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type City = { name: string; slug: string; state?: string };
type Area = {
  _id?: string;
  name: string;
  slug: string;
  cityName: string;
  citySlug: string;
  stateName?: string;
};
type ContentBlock = {
  id: string;
  type: "h1" | "h2" | "h3" | "p";
  text: string;
};
type FaqItem = {
  id: string;
  question: string;
  answer: string;
};
type SeoRecord = {
  citySlug: string;
  areaSlug: string;
  mode: "inherit" | "individual";
  title?: string;
  description?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  canonicalUrl?: string;
  content?: ContentBlock[];
  faqs?: FaqItem[];
  status?: "draft" | "published";
  updatedAt?: string;
};
type CitySeoRecord = {
  slug: string;
  name?: string;
  title?: string;
  description?: string;
  primaryKeyword?: string;
  canonicalUrl?: string;
  content?: ContentBlock[];
  faqs?: FaqItem[];
  status?: string;
};

function uid(): string {
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function DynamicSeoContent() {
  const searchParams = useSearchParams();
  const initialCity = (searchParams.get("city") || "").trim().toLowerCase();
  const initialArea = (searchParams.get("area") || "").trim().toLowerCase();

  const [cities, setCities] = useState<City[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [seoList, setSeoList] = useState<SeoRecord[]>([]);
  const [citySeoList, setCitySeoList] = useState<CitySeoRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters & Search
  const [activeTab, setActiveTab] = useState<"all" | "custom" | "pure_inherit">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCities, setExpandedCities] = useState<Record<string, boolean>>({});

  // Modal Editing State
  const [editingArea, setEditingArea] = useState<{ city: City; area: Area } | null>(null);
  const [editMode, setEditMode] = useState<"inherit" | "individual">("inherit");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrimaryKeyword, setEditPrimaryKeyword] = useState("");
  const [editSecondaryKeywords, setEditSecondaryKeywords] = useState("");
  const [editCanonicalUrl, setEditCanonicalUrl] = useState("");
  const [editContentBlocks, setEditContentBlocks] = useState<ContentBlock[]>([]);
  const [editFaqs, setEditFaqs] = useState<FaqItem[]>([]);
  const [editStatus, setEditStatus] = useState<"draft" | "published">("draft");
  const [savingModal, setSavingModal] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  // Load Data
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const [citiesRes, areasRes, seoRes, citySeoRes] = await Promise.all([
          fetch("/api/admin/cities", { credentials: "include" }).then((r) => r.json()),
          fetch("/api/admin/local-areas", { credentials: "include" }).then((r) => r.json()),
          fetch("/api/admin/dynamic-seo", { credentials: "include" }).then((r) => r.json()),
          fetch("/api/admin/city-seo", { credentials: "include" }).then((r) => r.json()),
        ]);

        if (cancelled) return;

        const loadedCities = (citiesRes.cities ?? []) as City[];
        const loadedAreas = (areasRes.localAreas ?? []) as Area[];
        const loadedSeo = (seoRes.seo ?? []) as SeoRecord[];
        const loadedCitySeo = (citySeoRes.seo ?? []) as CitySeoRecord[];

        setCities(loadedCities);
        setAreas(loadedAreas);
        setSeoList(loadedSeo);
        setCitySeoList(loadedCitySeo);

        // Auto-expand all cities by default (or the query city)
        const expMap: Record<string, boolean> = {};
        loadedCities.forEach((c) => {
          expMap[c.slug.toLowerCase()] = true;
        });
        setExpandedCities(expMap);

        // Open modal if query has city and area
        if (initialCity && initialArea) {
          const targetCity = loadedCities.find((c) => c.slug.toLowerCase() === initialCity);
          const targetArea = loadedAreas.find(
            (a) => a.citySlug.toLowerCase() === initialCity && a.slug.toLowerCase() === initialArea
          );
          if (targetCity && targetArea) {
            openEditModal(targetCity, targetArea, loadedSeo, loadedCitySeo);
          }
        }
      } catch {
        if (!cancelled) setError("Failed to load Dynamic SEO data. Please refresh.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadData();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCity, initialArea]);

  // Flash Toast Message
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  }, []);

  // Status Checkers
  const cityHasIndividualSeo = useCallback(
    (citySlug: string): boolean => {
      const slug = citySlug.toLowerCase();
      return seoList.some(
        (item) => item.citySlug.toLowerCase() === slug && item.mode === "individual"
      );
    },
    [seoList]
  );

  const areaHasIndividualSeo = useCallback(
    (citySlug: string, areaSlug: string): boolean => {
      const cSlug = citySlug.toLowerCase();
      const aSlug = areaSlug.toLowerCase();
      return seoList.some(
        (item) =>
          item.citySlug.toLowerCase() === cSlug &&
          item.areaSlug.toLowerCase() === aSlug &&
          item.mode === "individual"
      );
    },
    [seoList]
  );

  const getAreaSeoRecord = useCallback(
    (citySlug: string, areaSlug: string): SeoRecord | undefined => {
      const cSlug = citySlug.toLowerCase();
      const aSlug = areaSlug.toLowerCase();
      return seoList.find(
        (item) => item.citySlug.toLowerCase() === cSlug && item.areaSlug.toLowerCase() === aSlug
      );
    },
    [seoList]
  );

  // Statistics Counts
  const totalCitiesCount = cities.length;
  const totalAreasCount = areas.length;
  const customCitiesCount = useMemo(() => {
    return cities.filter((c) => cityHasIndividualSeo(c.slug)).length;
  }, [cities, cityHasIndividualSeo]);
  const individualAreasCount = useMemo(() => {
    return seoList.filter((s) => s.mode === "individual").length;
  }, [seoList]);
  const pureInheritedCitiesCount = totalCitiesCount - customCitiesCount;

  // Filtered Cities list
  const filteredCities = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return cities.filter((city) => {
      const hasCustom = cityHasIndividualSeo(city.slug);

      if (activeTab === "custom" && !hasCustom) return false;
      if (activeTab === "pure_inherit" && hasCustom) return false;

      if (!q) return true;
      if (city.name.toLowerCase().includes(q) || city.slug.toLowerCase().includes(q)) return true;

      const cityAreas = areas.filter((a) => a.citySlug.toLowerCase() === city.slug.toLowerCase());
      return cityAreas.some((a) => a.name.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q));
    });
  }, [cities, areas, activeTab, searchQuery, cityHasIndividualSeo]);

  // Toggle Single Area Mode Immediately
  async function toggleAreaMode(area: Area, targetMode: "inherit" | "individual") {
    const existing = getAreaSeoRecord(area.citySlug, area.slug);
    const parentCitySeo = citySeoList.find(
      (c) => c.slug.toLowerCase() === area.citySlug.toLowerCase()
    );

    const payload: Record<string, unknown> = {
      citySlug: area.citySlug,
      areaSlug: area.slug,
      name: area.name,
      mode: targetMode,
    };

    if (targetMode === "individual") {
      payload.title = existing?.title || `Services in ${area.name}, ${area.cityName} | Rojlo`;
      payload.description =
        existing?.description || `Explore local services and places in ${area.name}, ${area.cityName} on Rojlo.`;
      payload.primaryKeyword = existing?.primaryKeyword || `services in ${area.name.toLowerCase()}`;
      payload.secondaryKeywords = existing?.secondaryKeywords || [];
      payload.canonicalUrl = existing?.canonicalUrl || `/places/${area.citySlug}/${area.slug}`;
      payload.content = existing?.content || [];
      payload.faqs = existing?.faqs || [];
      payload.status = existing?.status || "published";
    } else {
      payload.title = parentCitySeo?.title || "";
      payload.description = parentCitySeo?.description || "";
      payload.primaryKeyword = parentCitySeo?.primaryKeyword || "";
      payload.canonicalUrl = parentCitySeo?.canonicalUrl || "";
      payload.status = "published";
    }

    try {
      const res = await fetch("/api/admin/dynamic-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.seo) {
        setSeoList((prev) => [
          ...prev.filter(
            (s) =>
              !(
                s.citySlug.toLowerCase() === area.citySlug.toLowerCase() &&
                s.areaSlug.toLowerCase() === area.slug.toLowerCase()
              )
          ),
          data.seo,
        ]);
        showToast(
          targetMode === "inherit"
            ? `✓ ${area.name} now dynamically inherits ${area.cityName} SEO.`
            : `🟢 ${area.name} set to Individual SEO mode.`
        );
      } else {
        alert(data.error || "Failed to update inheritance mode.");
      }
    } catch {
      alert("Failed to update inheritance mode.");
    }
  }

  // Batch Operation: Set All in City
  async function batchSetCityMode(city: City, targetMode: "inherit" | "individual") {
    const cityAreas = areas.filter((a) => a.citySlug.toLowerCase() === city.slug.toLowerCase());
    if (cityAreas.length === 0) {
      alert("No local areas found for this city.");
      return;
    }

    const confirmMsg =
      targetMode === "inherit"
        ? `Set all ${cityAreas.length} local areas in ${city.name} to inherit from city?`
        : `Set all ${cityAreas.length} local areas in ${city.name} to Individual SEO?`;

    if (!confirm(confirmMsg)) return;

    try {
      const parentCitySeo = citySeoList.find((c) => c.slug.toLowerCase() === city.slug.toLowerCase());

      const promises = cityAreas.map((area) => {
        const existing = getAreaSeoRecord(area.citySlug, area.slug);
        const payload: Record<string, unknown> = {
          citySlug: area.citySlug,
          areaSlug: area.slug,
          name: area.name,
          mode: targetMode,
          status: "published",
        };
        if (targetMode === "individual") {
          payload.title = existing?.title || `Services in ${area.name}, ${city.name} | Rojlo`;
          payload.description =
            existing?.description || `Explore local services and places in ${area.name}, ${city.name} on Rojlo.`;
          payload.primaryKeyword = existing?.primaryKeyword || `services in ${area.name.toLowerCase()}`;
          payload.canonicalUrl = existing?.canonicalUrl || `/places/${area.citySlug}/${area.slug}`;
        } else {
          payload.title = parentCitySeo?.title || "";
          payload.description = parentCitySeo?.description || "";
          payload.primaryKeyword = parentCitySeo?.primaryKeyword || "";
          payload.canonicalUrl = parentCitySeo?.canonicalUrl || "";
        }
        return fetch("/api/admin/dynamic-seo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        }).then((r) => r.json());
      });

      const results = await Promise.all(promises);
      const updatedRecords: SeoRecord[] = results.map((r) => r.seo).filter(Boolean);

      setSeoList((prev) => {
        const areaSlugs = new Set(cityAreas.map((a) => a.slug.toLowerCase()));
        const remaining = prev.filter(
          (s) => !(s.citySlug.toLowerCase() === city.slug.toLowerCase() && areaSlugs.has(s.areaSlug.toLowerCase()))
        );
        return [...remaining, ...updatedRecords];
      });

      showToast(`✓ Updated all ${cityAreas.length} local areas in ${city.name} to ${targetMode}.`);
    } catch {
      alert("Failed to perform batch update.");
    }
  }

  // Open Edit SEO Modal
  function openEditModal(
    city: City,
    area: Area,
    currentSeoList: SeoRecord[] = seoList,
    currentCitySeoList: CitySeoRecord[] = citySeoList
  ) {
    const existing = currentSeoList.find(
      (s) =>
        s.citySlug.toLowerCase() === city.slug.toLowerCase() &&
        s.areaSlug.toLowerCase() === area.slug.toLowerCase()
    );
    const parentCitySeo = currentCitySeoList.find(
      (c) => c.slug.toLowerCase() === city.slug.toLowerCase()
    );

    setEditingArea({ city, area });
    setModalMessage(null);

    if (existing && existing.mode === "individual") {
      setEditMode("individual");
      setEditTitle(existing.title || "");
      setEditDescription(existing.description || "");
      setEditPrimaryKeyword(existing.primaryKeyword || "");
      setEditSecondaryKeywords((existing.secondaryKeywords || []).join(", "));
      setEditCanonicalUrl(existing.canonicalUrl || "");
      setEditContentBlocks(
        existing.content && existing.content.length > 0
          ? existing.content
          : [{ id: uid(), type: "p", text: "" }]
      );
      setEditFaqs(existing.faqs || []);
      setEditStatus(existing.status === "published" ? "published" : "draft");
    } else {
      setEditMode("inherit");
      setEditTitle(parentCitySeo?.title || "");
      setEditDescription(parentCitySeo?.description || "");
      setEditPrimaryKeyword(parentCitySeo?.primaryKeyword || "");
      setEditSecondaryKeywords("");
      setEditCanonicalUrl(parentCitySeo?.canonicalUrl || `/places/${city.slug}/${area.slug}`);
      setEditContentBlocks(
        parentCitySeo?.content && parentCitySeo.content.length > 0
          ? parentCitySeo.content
          : [{ id: uid(), type: "p", text: "" }]
      );
      setEditFaqs(parentCitySeo?.faqs || []);
      setEditStatus("published");
    }
  }

  // Copy from parent city in modal
  function copyFromParentCityInModal() {
    if (!editingArea) return;
    const parentCitySeo = citySeoList.find(
      (c) => c.slug.toLowerCase() === editingArea.city.slug.toLowerCase()
    );
    if (!parentCitySeo) {
      alert("No parent city SEO content found.");
      return;
    }
    setEditTitle(parentCitySeo.title || `Services in ${editingArea.area.name}, ${editingArea.city.name} | Rojlo`);
    setEditDescription(
      parentCitySeo.description ||
        `Explore top local services in ${editingArea.area.name}, ${editingArea.city.name} on Rojlo.`
    );
    setEditPrimaryKeyword(parentCitySeo.primaryKeyword || `services in ${editingArea.area.name.toLowerCase()}`);
    setEditCanonicalUrl(`/places/${editingArea.city.slug}/${editingArea.area.slug}`);
    if (parentCitySeo.content && parentCitySeo.content.length > 0) {
      setEditContentBlocks(parentCitySeo.content.map((b) => ({ ...b, id: uid() })));
    }
    if (parentCitySeo.faqs && parentCitySeo.faqs.length > 0) {
      setEditFaqs(parentCitySeo.faqs.map((f) => ({ ...f, id: uid() })));
    }
    setModalMessage("✓ Copied parent city SEO. You can now tweak and save.");
  }

  // Save Modal Changes
  async function handleModalSave() {
    if (!editingArea) return;
    setSavingModal(true);
    setModalMessage(null);

    const { city, area } = editingArea;
    const parentCitySeo = citySeoList.find(
      (c) => c.slug.toLowerCase() === city.slug.toLowerCase()
    );

    const payload: Record<string, unknown> = {
      citySlug: area.citySlug,
      areaSlug: area.slug,
      name: area.name,
      mode: editMode,
    };

    if (editMode === "individual") {
      payload.title = editTitle.trim();
      payload.description = editDescription.trim();
      payload.primaryKeyword = editPrimaryKeyword.trim();
      payload.secondaryKeywords = editSecondaryKeywords
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      payload.canonicalUrl = editCanonicalUrl.trim();
      payload.status = editStatus;
      payload.content = editContentBlocks.filter((b) => b.text.trim());
      payload.faqs = editFaqs.filter((f) => f.question.trim() || f.answer.trim());
    } else {
      payload.title = parentCitySeo?.title || "";
      payload.description = parentCitySeo?.description || "";
      payload.primaryKeyword = parentCitySeo?.primaryKeyword || "";
      payload.canonicalUrl = parentCitySeo?.canonicalUrl || "";
      payload.status = "published";
    }

    try {
      const res = await fetch("/api/admin/dynamic-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.seo) {
        setSeoList((prev) => [
          ...prev.filter(
            (s) =>
              !(
                s.citySlug.toLowerCase() === area.citySlug.toLowerCase() &&
                s.areaSlug.toLowerCase() === area.slug.toLowerCase()
              )
          ),
          data.seo,
        ]);
        showToast(
          editMode === "inherit"
            ? `✓ Saved! ${area.name} now dynamically inherits ${city.name} SEO.`
            : `🟢 Saved! Custom SEO active for ${area.name}, ${city.name}.`
        );
        setEditingArea(null);
      } else {
        setModalMessage(data.error || "Failed to save changes.");
      }
    } catch {
      setModalMessage("An unexpected error occurred while saving.");
    } finally {
      setSavingModal(false);
    }
  }

  function toggleCityAccordion(citySlug: string) {
    setExpandedCities((prev) => ({
      ...prev,
      [citySlug.toLowerCase()]: !prev[citySlug.toLowerCase()],
    }));
  }

  return (
    <main className="min-w-0 p-4 sm:p-6 lg:p-8 bg-[#fbfcfd] min-h-screen">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 flex items-center gap-3">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-gray-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-950">
            Dynamic SEO
          </h1>
          <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-0.5 text-xs font-semibold text-gray-700">
            Parent-Child Architecture
          </span>
        </div>
        <p className="mt-2 text-sm text-gray-600 max-w-4xl leading-relaxed">
          Manage whether Local Areas inherit their parent city&apos;s SEO content or have custom individual SEO. Cities with local areas having individual SEO are marked with a <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">🟢 green dot</span>.
        </p>

        {/* STATS PILLS ROW */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <span className="rounded-full bg-black px-4 py-1.5 text-xs font-bold text-white shadow-xs">
            {totalCitiesCount} Cities • {totalAreasCount} Local Areas
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/90 px-4 py-1.5 text-xs font-bold text-emerald-800 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {customCitiesCount} Cities with Custom SEO
          </span>
          <span className="rounded-full border border-purple-200 bg-purple-50 px-4 py-1.5 text-xs font-bold text-purple-800 shadow-xs">
            {individualAreasCount} Individual Local Areas
          </span>
        </div>
      </div>

      {/* 3 EXPLANATION CARDS */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1 */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[11px] font-black text-sky-700">
              1
            </span>
            <h3 className="text-sm font-bold text-gray-950">Same Content as City (Inherit)</h3>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            The local area automatically inherits the parent city&apos;s SEO title, description, content blocks, and FAQs contextualized with its name.
          </p>
        </div>

        {/* Card 2 */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-[11px] font-black text-purple-700">
              2
            </span>
            <h3 className="text-sm font-bold text-gray-950">Individual SEO Content</h3>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            The local area has its own custom-crafted meta tags, custom content blocks, and FAQs written by the admin.
          </p>
        </div>

        {/* Card 3 */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-700">
              3
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <h3 className="text-sm font-bold text-gray-950">Green Dot Indicator</h3>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Instantly shows which cities have local areas configured with custom/individual SEO content.
          </p>
        </div>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-full px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeTab === "all"
                ? "bg-black text-white shadow-xs"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            All Cities ({totalCitiesCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("custom")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeTab === "custom"
                ? "bg-emerald-700 text-white shadow-xs"
                : "border border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Cities with Custom SEO ({customCitiesCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pure_inherit")}
            className={`rounded-full px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeTab === "pure_inherit"
                ? "bg-black text-white shadow-xs"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Pure Inherited Cities ({pureInheritedCitiesCount})
          </button>
        </div>

        {/* Search Bar */}
        <div className="w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by city or local area name..."
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs text-gray-950 placeholder-gray-400 outline-none focus:border-gray-400 shadow-xs"
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
          {error}
        </div>
      )}

      {/* CITY ACCORDION LIST */}
      {loading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center text-sm font-medium text-gray-500">
          Loading cities and local area SEO data...
        </div>
      ) : filteredCities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
          No cities found matching your search or filter.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCities.map((city) => {
            const cityAreas = areas.filter(
              (a) => a.citySlug.toLowerCase() === city.slug.toLowerCase()
            );
            const hasCustom = cityHasIndividualSeo(city.slug);
            const isExpanded = Boolean(expandedCities[city.slug.toLowerCase()]);
            const individualCount = cityAreas.filter((a) =>
              areaHasIndividualSeo(city.slug, a.slug)
            ).length;
            const inheritedCount = cityAreas.length - individualCount;

            return (
              <div
                key={city.slug}
                className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-xs transition-shadow hover:shadow-sm"
              >
                {/* CITY HEADER ROW */}
                <div
                  onClick={() => toggleCityAccordion(city.slug)}
                  className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 cursor-pointer select-none hover:bg-gray-50/60 transition"
                >
                  {/* Left: Indicator + City Name + Subtext */}
                  <div className="flex items-center gap-3">
                    {hasCustom ? (
                      <span
                        className="h-3 w-3 shrink-0 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shadow-xs"
                        title="City has local areas with individual custom SEO"
                      />
                    ) : (
                      <span
                        className="h-3 w-3 shrink-0 rounded-full bg-gray-300"
                        title="All local areas inherit from city"
                      />
                    )}
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-gray-950 flex items-center gap-1.5">
                        <span>{city.name}</span>
                        {city.state && (
                          <span className="text-xs sm:text-sm font-normal text-gray-500">
                            ({city.state})
                          </span>
                        )}
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {cityAreas.length} Local Areas ({individualCount} Individual • {inheritedCount} Inherited)
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions (Set All Inherit, Set All Individual, City SEO, Expand Toggle) */}
                  <div
                    className="flex items-center gap-2 flex-wrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => batchSetCityMode(city, "inherit")}
                      className="rounded-full border border-sky-300 bg-white px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 transition cursor-pointer"
                    >
                      Set All Inherit
                    </button>
                    <button
                      type="button"
                      onClick={() => batchSetCityMode(city, "individual")}
                      className="rounded-full border border-purple-300 bg-white px-3 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-50 transition cursor-pointer"
                    >
                      Set All Individual
                    </button>
                    <Link
                      href={`/admin/city-seo?city=${encodeURIComponent(city.slug)}`}
                      className="rounded-full bg-black px-4 py-1.5 text-xs font-bold !text-white hover:bg-gray-800 transition shadow-xs"
                      style={{ color: "#ffffff" }}
                    >
                      City SEO
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleCityAccordion(city.slug)}
                      className="rounded-lg border border-gray-200 bg-white p-1 text-xs text-gray-500 hover:bg-gray-100 cursor-pointer"
                      aria-label="Toggle accordion"
                    >
                      {isExpanded ? "▲" : "▼"}
                    </button>
                  </div>
                </div>

                {/* EXPANDED TABLE OF LOCAL AREAS */}
                {isExpanded && (
                  <div className="border-t border-gray-100 overflow-x-auto">
                    {cityAreas.length === 0 ? (
                      <p className="px-6 py-6 text-xs text-gray-500 text-center">
                        No local areas registered for this city yet.
                      </p>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-gray-50/70 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                            <th className="px-6 py-3">LOCAL AREA &amp; CITY</th>
                            <th className="px-6 py-3">INHERITANCE MODE</th>
                            <th className="px-6 py-3">SEO DETAILS</th>
                            <th className="px-6 py-3 text-right">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {cityAreas.map((area) => {
                            const isIndividual = areaHasIndividualSeo(area.citySlug, area.slug);
                            const record = getAreaSeoRecord(area.citySlug, area.slug);

                            return (
                              <tr
                                key={`${area.citySlug}-${area.slug}`}
                                className="hover:bg-gray-50/50 transition"
                              >
                                {/* Column 1: Local Area & City */}
                                <td className="px-6 py-3.5 whitespace-nowrap">
                                  <div className="flex items-center gap-2.5">
                                    {isIndividual ? (
                                      <span
                                        className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-xs"
                                        title="Individual SEO active"
                                      />
                                    ) : (
                                      <span
                                        className="h-2 w-2 shrink-0 rounded-full bg-sky-400"
                                        title="Inheriting from city"
                                      />
                                    )}
                                    <div>
                                      <p className="font-bold text-sm text-gray-950">
                                        {area.name}, {city.name}
                                      </p>
                                      <p className="text-[11px] text-gray-400 mt-0.5">
                                        /places/{city.slug}/{area.slug}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                {/* Column 2: Inheritance Mode Toggle */}
                                <td className="px-6 py-3.5 whitespace-nowrap">
                                  <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-0.5 text-xs font-medium">
                                    <button
                                      type="button"
                                      onClick={() => toggleAreaMode(area, "inherit")}
                                      className={`rounded-full px-3 py-1 transition cursor-pointer ${
                                        !isIndividual
                                          ? "bg-[#0070f3] text-white font-bold shadow-xs"
                                          : "text-gray-600 hover:text-gray-900"
                                      }`}
                                    >
                                      Same as City (Inherit)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => toggleAreaMode(area, "individual")}
                                      className={`rounded-full px-3 py-1 transition cursor-pointer ${
                                        isIndividual
                                          ? "bg-purple-700 text-white font-bold shadow-xs"
                                          : "text-gray-600 hover:text-gray-900"
                                      }`}
                                    >
                                      Individual SEO
                                    </button>
                                  </div>
                                </td>

                                {/* Column 3: SEO Details */}
                                <td className="px-6 py-3.5 text-xs">
                                  {isIndividual ? (
                                    <span className="text-emerald-700 font-semibold">
                                      Custom SEO: {record?.title ? `"${record.title.slice(0, 45)}..."` : "Active"}
                                      {record?.status === "draft" && (
                                        <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 font-normal">
                                          Draft
                                        </span>
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-gray-500">
                                      Dynamically inherits {city.name} SEO content
                                    </span>
                                  )}
                                </td>

                                {/* Column 4: Actions */}
                                <td className="px-6 py-3.5 text-right whitespace-nowrap">
                                  <div className="inline-flex items-center gap-2">
                                    <Link
                                      href={`/places/${city.slug}/${area.slug}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded-full bg-[#0f8b4d] hover:bg-[#0d7842] px-3.5 py-1.5 text-xs font-bold !text-white transition shadow-xs inline-flex items-center"
                                      style={{ color: "#ffffff" }}
                                    >
                                      View
                                    </Link>
                                    <button
                                      type="button"
                                      onClick={() => openEditModal(city, area)}
                                      className="rounded-full bg-black hover:bg-gray-800 px-3.5 py-1.5 text-xs font-bold !text-white transition shadow-xs inline-flex items-center cursor-pointer"
                                      style={{ color: "#ffffff" }}
                                    >
                                      Edit SEO
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SEO EDITOR MODAL / DIALOG */}
      {editingArea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {editingArea.city.name}
                </span>
                <h2 className="text-2xl font-black text-gray-950 mt-0.5">
                  Edit SEO — {editingArea.area.name}, {editingArea.city.name}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Configure custom title, meta description, keywords, structured content, and FAQs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingArea(null)}
                className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {modalMessage && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                {modalMessage}
              </div>
            )}

            {/* Mode Selector & Copy Button */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-700">Mode:</span>
                <div className="inline-flex rounded-full border border-gray-200 bg-white p-0.5 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setEditMode("inherit")}
                    className={`rounded-full px-3 py-1 transition cursor-pointer ${
                      editMode === "inherit"
                        ? "bg-[#0070f3] text-white font-bold"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Same as City (Inherit)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode("individual")}
                    className={`rounded-full px-3 py-1 transition cursor-pointer ${
                      editMode === "individual"
                        ? "bg-purple-700 text-white font-bold"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Individual SEO
                  </button>
                </div>
              </div>

              {editMode === "individual" && (
                <button
                  type="button"
                  onClick={copyFromParentCityInModal}
                  className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-bold text-gray-800 hover:bg-gray-50 transition shadow-xs"
                >
                  📋 Copy from {editingArea.city.name} SEO
                </button>
              )}
            </div>

            {/* Form Fields */}
            {editMode === "inherit" ? (
              <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50/70 p-5">
                <h4 className="text-sm font-bold text-sky-950 mb-1">
                  Inherit Mode Active
                </h4>
                <p className="text-xs text-sky-800 leading-relaxed">
                  <strong>{editingArea.area.name}</strong> will dynamically inherit all SEO content from <strong>{editingArea.city.name}</strong>. Any custom overrides will be reset to city defaults upon saving.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-900">SEO Title</label>
                    <span className="text-[11px] text-gray-500">{editTitle.length} chars</span>
                  </div>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder={`e.g. Services in ${editingArea.area.name}, ${editingArea.city.name}`}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-950 outline-none focus:border-gray-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-900">Meta Description</label>
                    <span className="text-[11px] text-gray-500">{editDescription.length} chars</span>
                  </div>
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder={`e.g. Find verified local services in ${editingArea.area.name}, ${editingArea.city.name} on Rojlo.`}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs text-gray-950 outline-none focus:border-gray-500 leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-1">Primary Keyword</label>
                    <input
                      type="text"
                      value={editPrimaryKeyword}
                      onChange={(e) => setEditPrimaryKeyword(e.target.value)}
                      placeholder="e.g. services in dwarka"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-950 outline-none focus:border-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-1">Secondary Keywords (comma separated)</label>
                    <input
                      type="text"
                      value={editSecondaryKeywords}
                      onChange={(e) => setEditSecondaryKeywords(e.target.value)}
                      placeholder="e.g. dwarka ads, delhi local area"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-950 outline-none focus:border-gray-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1">Canonical URL</label>
                  <input
                    type="text"
                    value={editCanonicalUrl}
                    onChange={(e) => setEditCanonicalUrl(e.target.value)}
                    placeholder={`/places/${editingArea.city.slug}/${editingArea.area.slug}`}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-950 outline-none focus:border-gray-500"
                  />
                </div>

                {/* Structured Content Blocks */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Content Blocks
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setEditContentBlocks((prev) => [...prev, { id: uid(), type: "h2", text: "" }])
                        }
                        className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        + H2
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEditContentBlocks((prev) => [...prev, { id: uid(), type: "p", text: "" }])
                        }
                        className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        + Paragraph
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {editContentBlocks.map((b, i) => (
                      <div key={b.id} className="rounded-xl border border-gray-200 bg-gray-50 p-2 relative">
                        <div className="flex justify-between items-center mb-1 text-[10px] text-gray-500 font-bold uppercase">
                          <span>Block #{i + 1} ({b.type})</span>
                          <button
                            type="button"
                            onClick={() => setEditContentBlocks((prev) => prev.filter((item) => item.id !== b.id))}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                        <textarea
                          rows={b.type === "p" ? 2 : 1}
                          value={b.text}
                          onChange={(e) =>
                            setEditContentBlocks((prev) =>
                              prev.map((item) => (item.id === b.id ? { ...item, text: e.target.value } : item))
                            )
                          }
                          placeholder={`Enter ${b.type} text...`}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-950 outline-none focus:border-gray-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* FAQs */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Local Area FAQs
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setEditFaqs((prev) => [...prev, { id: uid(), question: "", answer: "" }])
                      }
                      className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      + Add FAQ
                    </button>
                  </div>

                  <div className="space-y-2">
                    {editFaqs.map((f, i) => (
                      <div key={f.id} className="rounded-xl border border-gray-200 bg-gray-50 p-2 space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase">
                          <span>FAQ #{i + 1}</span>
                          <button
                            type="button"
                            onClick={() => setEditFaqs((prev) => prev.filter((item) => item.id !== f.id))}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                        <input
                          type="text"
                          value={f.question}
                          onChange={(e) =>
                            setEditFaqs((prev) =>
                              prev.map((item) => (item.id === f.id ? { ...item, question: e.target.value } : item))
                            )
                          }
                          placeholder="Question..."
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs text-gray-950 outline-none"
                        />
                        <textarea
                          rows={2}
                          value={f.answer}
                          onChange={(e) =>
                            setEditFaqs((prev) =>
                              prev.map((item) => (item.id === f.id ? { ...item, answer: e.target.value } : item))
                            )
                          }
                          placeholder="Answer..."
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs text-gray-950 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-900">
                    Status:
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as "draft" | "published")}
                      className="ml-2 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-semibold"
                    >
                      <option value="draft">Draft (Inactive)</option>
                      <option value="published">Published (Active)</option>
                    </select>
                  </label>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setEditingArea(null)}
                className="rounded-full border border-gray-300 bg-white px-5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleModalSave}
                disabled={savingModal}
                className="rounded-full bg-black px-6 py-2 text-xs font-bold text-white hover:bg-gray-800 transition disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {savingModal ? "Saving..." : "Save SEO"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function DynamicSeoPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-gray-500">
          Loading Dynamic SEO...
        </div>
      }
    >
      <DynamicSeoContent />
    </Suspense>
  );
}
