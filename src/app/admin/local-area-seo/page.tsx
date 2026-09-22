"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

 type City = { name: string; slug: string; state?: string };
 type Area = { name: string; slug: string; cityName: string; citySlug: string; stateName?: string };
 type Seo = {
  citySlug: string;
  areaSlug: string;
  mode: "inherit" | "individual";
  title?: string;
  description?: string;
  primaryKeyword?: string;
  canonicalUrl?: string;
  content?: Array<{ id: string; type: "h1" | "h2" | "h3" | "p"; text: string }>;
  status?: "draft" | "published";
 };

function LocalAreaSeoContent() {
  const router = useRouter();
  const params = useSearchParams();
  const queryCity = params.get("city") || "";
  const queryArea = params.get("area") || "";
  const [cities, setCities] = useState<City[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [seo, setSeo] = useState<Seo[]>([]);
  const [citySeo, setCitySeo] = useState<Array<{ slug: string; title?: string; description?: string; primaryKeyword?: string; canonicalUrl?: string }>>([]);
  const [mode, setMode] = useState<"inherit" | "individual">("inherit");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [primaryKeyword, setPrimaryKeyword] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [contentText, setContentText] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/cities", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/local-areas", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/local-area-seo", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/city-seo", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([cityData, areaData, areaSeoData, citySeoData]) => {
        setCities(cityData.cities ?? []);
        setAreas(areaData.localAreas ?? []);
        setSeo(areaSeoData.seo ?? []);
        setCitySeo(citySeoData.seo ?? []);
      })
      .catch(() => setError("Failed to load local-area SEO data."))
      .finally(() => setLoading(false));
  }, []);

  const selectedArea = useMemo(
    () => areas.find((area) => area.citySlug === queryCity && area.slug === queryArea),
    [areas, queryArea, queryCity]
  );
  const selectedCity = useMemo(
    () => cities.find((city) => city.slug === queryCity),
    [cities, queryCity]
  );
  const selectedLocalSeo = useMemo(
    () => seo.find((item) => item.citySlug === queryCity && item.areaSlug === queryArea),
    [queryArea, queryCity, seo]
  );
  const parentSeo = useMemo(
    () => citySeo.find((item) => item.slug === queryCity),
    [citySeo, queryCity]
  );

  useEffect(() => {
    if (!selectedArea) return;
    const timer = window.setTimeout(() => {
      const source = selectedLocalSeo?.mode === "individual" ? selectedLocalSeo : parentSeo;
      setMode(selectedLocalSeo?.mode === "individual" ? "individual" : "inherit");
      setTitle(source?.title ?? "");
      setDescription(source?.description ?? "");
      setPrimaryKeyword(source?.primaryKeyword ?? "");
      setCanonicalUrl(source?.canonicalUrl ?? "");
      setContentText(selectedLocalSeo?.mode === "individual" ? selectedLocalSeo.content?.map((block) => block.text).join("\n\n") ?? "" : "");
      setStatus(selectedLocalSeo?.status === "published" ? "published" : "draft");
      setMessage("");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [parentSeo, selectedArea, selectedLocalSeo]);

  function selectArea(area: Area) {
    router.push(`/admin/local-area-seo?city=${encodeURIComponent(area.citySlug)}&area=${encodeURIComponent(area.slug)}`);
  }

  function handleModeChange(nextMode: "inherit" | "individual") {
    setMode(nextMode);
    if (nextMode === "inherit") {
      setTitle(parentSeo?.title ?? "");
      setDescription(parentSeo?.description ?? "");
      setPrimaryKeyword(parentSeo?.primaryKeyword ?? "");
      setCanonicalUrl(parentSeo?.canonicalUrl ?? "");
      setContentText("");
    }
  }

  async function save() {
    if (!selectedArea) return;
    setSaving(true);
    setMessage("");
    setError("");
    const response = await fetch("/api/admin/local-area-seo", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        citySlug: selectedArea.citySlug,
        areaSlug: selectedArea.slug,
        name: selectedArea.name,
        mode,
        title,
        description,
        primaryKeyword,
        canonicalUrl,
        status,
        content: mode === "individual" && contentText.trim()
          ? [{ id: "area-content", type: "p", text: contentText.trim() }]
          : [],
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error || "Failed to save local-area SEO.");
    else {
      setSeo((current) => [
        ...current.filter((item) => !(item.citySlug === selectedArea.citySlug && item.areaSlug === selectedArea.slug)),
        data.seo,
      ]);
      setMessage(mode === "individual" ? "Individual local-area SEO saved." : "Local area now inherits the city SEO.");
    }
    setSaving(false);
  }

  if (loading) return <main className="p-6 text-gray-900">Loading local-area SEO...</main>;

  return (
    <main className="min-w-0 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-950">Local Area SEO</h1>
          <p className="mt-2 text-gray-900">Manage parent city SEO and individual local-area SEO content.</p>
        </div>
        <Link href="/admin/city-seo" className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50">
          City SEO
        </Link>
      </div>

      {error && <p className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-800">{error}</p>}
      {message && <p className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-800">{message}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.4fr)]">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
          <h2 className="text-lg font-bold text-gray-950">Cities and Local Areas</h2>
          <div className="mt-4 max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            {cities.map((city) => {
              const cityAreas = areas.filter((area) => area.citySlug === city.slug);
              if (cityAreas.length === 0) return null;
              return (
                <div key={city.slug}>
                  <h3 className="mb-2 text-sm font-bold text-gray-900">{city.name}</h3>
                  <div className="space-y-1">
                    {cityAreas.map((area) => {
                      const hasIndividualSeo = seo.some((item) => item.citySlug === area.citySlug && item.areaSlug === area.slug && item.mode === "individual");
                      const active = area.citySlug === queryCity && area.slug === queryArea;
                      return (
                        <button
                          key={`${area.citySlug}-${area.slug}`}
                          type="button"
                          onClick={() => selectArea(area)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${active ? "bg-gray-900 text-white" : "text-gray-800 hover:bg-gray-100"}`}
                        >
                          <span>{area.name}</span>
                          <span className="flex items-center gap-2">
                            {hasIndividualSeo && <span className="h-2.5 w-2.5 rounded-full bg-green-500" title="Individual SEO saved" />}
                            <span className={active ? "text-gray-300" : "text-gray-500"}>Edit SEO</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
          {!selectedArea ? (
            <div className="flex min-h-64 items-center justify-center text-center text-gray-700">Select a local area to edit its SEO.</div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">{selectedCity?.name || selectedArea.cityName}</p>
                  <h2 className="mt-1 text-2xl font-black text-gray-950">{selectedArea.name}</h2>
                </div>
                <label className="text-sm font-semibold text-gray-800">
                  SEO mode
                  <select value={mode} onChange={(event) => handleModeChange(event.target.value as "inherit" | "individual")} className="ml-2 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm">
                    <option value="inherit">Use parent city SEO</option>
                    <option value="individual">Individual local-area SEO</option>
                  </select>
                </label>
              </div>

              {mode === "inherit" && <p className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-800">This local area will use the SEO title, description, keywords, content, and FAQs from {selectedCity?.name || selectedArea.cityName}.</p>}

              <div className="mt-5 space-y-4">
                <label className="block text-sm font-semibold text-gray-900">SEO Title<input value={title} onChange={(event) => setTitle(event.target.value)} disabled={mode === "inherit"} className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 font-normal text-gray-950 disabled:cursor-not-allowed disabled:opacity-70" /></label>
                <label className="block text-sm font-semibold text-gray-900">Meta Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} disabled={mode === "inherit"} rows={3} className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 font-normal text-gray-950 disabled:cursor-not-allowed disabled:opacity-70" /></label>
                <label className="block text-sm font-semibold text-gray-900">Primary Keyword<input value={primaryKeyword} onChange={(event) => setPrimaryKeyword(event.target.value)} disabled={mode === "inherit"} className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 font-normal text-gray-950 disabled:cursor-not-allowed disabled:opacity-70" /></label>
                <label className="block text-sm font-semibold text-gray-900">Canonical URL<input value={canonicalUrl} onChange={(event) => setCanonicalUrl(event.target.value)} disabled={mode === "inherit"} className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 font-normal text-gray-950 disabled:cursor-not-allowed disabled:opacity-70" /></label>
                <label className="block text-sm font-semibold text-gray-900">Individual Content<textarea value={contentText} onChange={(event) => setContentText(event.target.value)} disabled={mode === "inherit"} rows={8} placeholder="Write local-area content..." className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 font-normal text-gray-950 disabled:cursor-not-allowed disabled:opacity-70" /></label>
                <label className="block text-sm font-semibold text-gray-900">Status<select value={status} onChange={(event) => setStatus(event.target.value as "draft" | "published")} className="ml-2 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"><option value="draft">Draft</option><option value="published">Published</option></select></label>
                <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-gray-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-900 disabled:opacity-60">{saving ? "Saving..." : "Save Local Area SEO"}</button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

export default function LocalAreaSeoPage() {
  return <Suspense fallback={<main className="p-6 text-gray-900">Loading local-area SEO...</main>}><LocalAreaSeoContent /></Suspense>;
}
