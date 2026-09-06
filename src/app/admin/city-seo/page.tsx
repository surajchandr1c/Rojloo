"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { uploadImage } from "@/lib/compress";
import { AdminCitySeoSkeleton } from "@/components/skeletons/admin-skeletons";

type BlockType = "h1" | "h2" | "h3" | "p";

type ContentBlock = {
  id: string;
  type: BlockType;
  text: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function uid(): string {
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function Counter({ value, min, max }: { value: number; min: number; max: number }) {
  const ok = value >= min && value <= max;
  const over = value > max;
  return (
    <span
      className={`text-xs font-medium ${
        ok ? "text-green-700" : over ? "text-red-700" : "text-amber-600"
      }`}
    >
      {value} / {min}-{max} chars
    </span>
  );
}

function TagInput({
  label,
  placeholder,
  tags,
  onChange,
  hint,
}: {
  label: string;
  placeholder: string;
  tags: string[];
  onChange: (next: string[]) => void;
  hint?: string;
}) {
  const [val, setVal] = useState("");

  function add() {
    const v = val.trim();
    if (!v) return;
    if (!tags.some((t) => t.toLowerCase() === v.toLowerCase())) {
      onChange([...tags, v]);
    }
    setVal("");
  }

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-red-900">{label}</span>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-pink-200 bg-pink-50 px-2 py-2">
        {tags.map((t, i) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white"
          >
            {t}
            <button
              type="button"
              aria-label={`Remove ${t}`}
              onClick={() => onChange(tags.filter((_, idx) => idx !== i))}
              className="text-white/80 hover:text-white"
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-red-950 outline-none"
          value={val}
          placeholder={placeholder}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
        />
      </div>
      {hint && <span className="mt-1 block text-xs text-red-700">{hint}</span>}
    </label>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-red-900">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-red-700">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-pink-200 bg-pink-50 px-3 py-2.5 text-red-950 outline-none focus:border-red-500";

function CitySeoContent() {
  const params = useSearchParams();
  const editSlug = params.get("city");
  const isEdit = Boolean(editSlug);

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urlSlug, setUrlSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [primaryKeyword, setPrimaryKeyword] = useState("");
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>([]);
  const [longTailKeywords, setLongTailKeywords] = useState<string[]>([]);
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [content, setContent] = useState<ContentBlock[]>([]);
  const [status, setStatus] = useState<"draft" | "published">("draft");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!editSlug) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [citiesRes, seoRes] = await Promise.all([
          fetch("/api/admin/cities").then((r) => r.json()),
          fetch("/api/admin/city-seo").then((r) => r.json()),
        ]);
        if (cancelled) return;

        const city = (citiesRes.cities ?? []).find(
          (c: { slug: string; name: string }) => c.slug === editSlug
        );
        if (city) setName(city.name);

        const seo = (seoRes.seo ?? []).find(
          (s: { slug: string }) => s.slug === editSlug
        );
        if (seo) {
          setTitle(seo.title ?? "");
          setDescription(seo.description ?? "");
          setUrlSlug(seo.urlSlug ?? editSlug);
          setPrimaryKeyword(seo.primaryKeyword ?? "");
          setSecondaryKeywords(seo.secondaryKeywords ?? []);
          setLongTailKeywords(seo.longTailKeywords ?? []);
          setCanonicalUrl(seo.canonicalUrl ?? "");
          setFeaturedImage(seo.featuredImage ?? "");
          setImageAlt(seo.imageAlt ?? "");
          setContent(
            Array.isArray(seo.content) && seo.content.length
              ? seo.content
              : [
                  { id: uid(), type: "h1", text: "" },
                  { id: uid(), type: "p", text: "" },
                ]
          );
          setStatus(seo.status === "published" ? "published" : "draft");
        } else {
          setUrlSlug(editSlug);
          setContent([
            { id: uid(), type: "h1", text: "" },
            { id: uid(), type: "p", text: "" },
          ]);
        }
      } catch {
        setError("Failed to load city details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editSlug]);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugManual) setUrlSlug(slugify(value));
  }

  function addBlock(type: BlockType) {
    setContent((prev) => [...prev, { id: uid(), type, text: "" }]);
  }

  function updateBlock(id: string, patch: Partial<ContentBlock>) {
    setContent((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...patch } : b))
    );
  }

  function removeBlock(id: string) {
    setContent((prev) => prev.filter((b) => b.id !== id));
  }

  function reorder(from: number, to: number) {
    setContent((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  async function handleImage(file: File) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadImage(file);
      setFeaturedImage(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function save(publish: boolean) {
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      let slug = editSlug ?? "";

      if (!isEdit) {
        if (!name.trim()) {
          setError("City name is required to create a new city.");
          setSaving(false);
          return;
        }
        const cRes = await fetch("/api/admin/cities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
        });
        const cData = await cRes.json();
        if (!cRes.ok) {
          setError(cData.error || "Failed to add city.");
          setSaving(false);
          return;
        }
        slug = cData.city?.slug || slugify(name);
      }

      const sRes = await fetch("/api/admin/city-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name: name || slug,
          title,
          description,
          keywords: primaryKeyword,
          urlSlug,
          primaryKeyword,
          secondaryKeywords,
          longTailKeywords,
          canonicalUrl,
          featuredImage,
          imageAlt,
          content,
          status: publish ? "published" : "draft",
        }),
      });
      const sData = await sRes.json();
      if (!sRes.ok) {
        setError(sData.error || "Failed to save SEO.");
        setSaving(false);
        return;
      }

      setStatus(publish ? "published" : "draft");
      setSuccess(publish ? "Published successfully." : "Draft saved.");
      setTimeout(() => setSuccess(""), 2500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function preview() {
    const slug = editSlug || urlSlug || name;
    if (slug) window.open(`/places/${slug}`, "_blank");
  }

  const titleLen = title.length;
  const descLen = description.length;
  const contentText = content.map((b) => b.text).join(" ");
  const wordCount = contentText.trim() ? contentText.trim().split(/\s+/).length : 0;
  const h1Count = content.filter((b) => b.type === "h1").length;
  const h2Count = content.filter((b) => b.type === "h2").length;
  const h3Count = content.filter((b) => b.type === "h3").length;

  const keyword = primaryKeyword.trim().toLowerCase();
  const keywordUsage = keyword
    ? (
        (contentText.toLowerCase().match(new RegExp(keyword, "g")) || [])
          .length +
        (title.toLowerCase().match(new RegExp(keyword, "g")) || []).length +
        (description.toLowerCase().match(new RegExp(keyword, "g")) || []).length
      )
    : 0;

  const checks = [
    { label: "SEO title exists", ok: titleLen > 0 },
    { label: "Meta description exists", ok: descLen > 0 },
    { label: "Primary keyword exists", ok: primaryKeyword.trim().length > 0 },
    { label: "URL slug exists", ok: urlSlug.trim().length > 0 },
    { label: "Exactly one H1 exists", ok: h1Count === 1, warn: h1Count > 1 },
    { label: "At least one H2 exists", ok: h2Count >= 1 },
    { label: "Content has sufficient length", ok: wordCount >= 300 },
    { label: "Image has alt text", ok: Boolean(featuredImage && imageAlt.trim()) },
    { label: "Canonical URL exists", ok: canonicalUrl.trim().length > 0 },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const score = Math.round((passed / checks.length) * 100);

  if (loading) {
    return <AdminCitySeoSkeleton />;
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-red-950">
            {isEdit ? `SEO Editor — ${name || editSlug}` : "Add New City & SEO"}
          </h1>
          <p className="mt-2 text-red-900">
            Write and optimise SEO content for the city page.
          </p>
          <span
            className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              status === "published"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {status === "published" ? "Published" : "Draft"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => save(false)}
            disabled={saving}
            className="rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={preview}
            disabled={!editSlug && !urlSlug && !name}
            className="rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => save(true)}
            disabled={saving}
            className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            Publish
          </button>
        </div>
      </div>

      {isEdit && (
        <Link
          href="/admin/city"
          className="mt-3 inline-block text-sm font-semibold text-red-700 underline-offset-2 hover:underline"
        >
          ← Back to Cities
        </Link>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-4 rounded-xl bg-green-50 px-4 py-2 text-sm font-medium text-green-700" role="status">
          {success}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {!isEdit && (
            <section className="rounded-2xl border border-red-100 bg-white p-4 sm:p-6">
              <h2 className="mb-3 text-lg font-bold text-red-950">City</h2>
              <Field label="City Name">
                <input
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mumbai"
                />
              </Field>
            </section>
          )}

          <section className="rounded-2xl border border-red-100 bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-bold text-red-950">SEO Settings</h2>
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-red-900">SEO Title</span>
                  <Counter value={titleLen} min={50} max={60} />
                </div>
                <input
                  className={inputClass}
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Best Places & Services in City | Rojlo"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-red-900">Meta Description</span>
                  <Counter value={descLen} min={140} max={160} />
                </div>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A short, compelling summary shown in search results."
                />
              </div>

              <Field label="URL Slug" hint="Auto-generated from the title. Editable.">
                <input
                  className={inputClass}
                  value={urlSlug}
                  onChange={(e) => {
                    setSlugManual(true);
                    setUrlSlug(e.target.value);
                  }}
                  placeholder="city-name"
                />
              </Field>

              <Field label="Primary Keyword">
                <input
                  className={inputClass}
                  value={primaryKeyword}
                  onChange={(e) => setPrimaryKeyword(e.target.value)}
                  placeholder="city services"
                />
              </Field>

              <TagInput
                label="Secondary Keywords"
                placeholder="Type and press Enter"
                tags={secondaryKeywords}
                onChange={setSecondaryKeywords}
              />

              <TagInput
                label="Long-Tail Keywords"
                placeholder="Type and press Enter"
                tags={longTailKeywords}
                onChange={setLongTailKeywords}
              />

              <Field label="Canonical URL">
                <input
                  className={inputClass}
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                  placeholder="https://example.com/places/city"
                />
              </Field>

              <div>
                <span className="mb-1 block text-sm font-medium text-red-900">Featured Image</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImage(file);
                  }}
                  className="block w-full text-sm text-red-900"
                />
                {uploading && <span className="text-xs text-red-700">Uploading...</span>}
                {featuredImage && (
                  <div className="mt-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={featuredImage}
                      alt={imageAlt || "Featured preview"}
                      className="h-32 w-auto rounded-xl border border-red-100 object-cover"
                    />
                  </div>
                )}
              </div>

              <Field label="Image Alt Text">
                <input
                  className={inputClass}
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="Describe the image for SEO and accessibility"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-red-100 bg-white p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-red-950">Content Editor</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addBlock("h2")}
                  className="rounded-full border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                >
                  + Add Heading
                </button>
                <button
                  type="button"
                  onClick={() => addBlock("p")}
                  className="rounded-full border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                >
                  + Add Paragraph
                </button>
              </div>
            </div>

            {h1Count > 1 && (
              <p className="mb-3 rounded-xl bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
                You already have an H1. SEO best practice is to use one primary H1 per page.
              </p>
            )}

            <div className="space-y-3">
              {content.map((block, i) => (
                <div
                  key={block.id}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null && dragIndex !== i) reorder(dragIndex, i);
                    setDragIndex(null);
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  className={`flex gap-2 rounded-xl border border-pink-200 bg-pink-50 p-2 ${
                    dragIndex === i ? "opacity-50" : ""
                  }`}
                >
                  <span className="flex cursor-grab items-center px-1 text-red-400" title="Drag to reorder">
                    ⠿
                  </span>
                  <select
                    value={block.type}
                    onChange={(e) =>
                      updateBlock(block.id, { type: e.target.value as BlockType })
                    }
                    className="rounded-lg border border-pink-200 bg-white px-2 py-2 text-sm text-red-950 outline-none"
                  >
                    <option value="h1">H1 — Heading 1</option>
                    <option value="h2">H2 — Heading 2</option>
                    <option value="h3">H3 — Heading 3</option>
                    <option value="p">Paragraph</option>
                  </select>
                  <textarea
                    value={block.text}
                    onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                    placeholder="Write your content here..."
                    rows={block.type === "p" ? 3 : 1}
                    className={`flex-1 rounded-lg border border-pink-200 bg-white px-3 py-2 text-red-950 outline-none focus:border-red-500 ${
                      block.type === "h1"
                        ? "text-2xl font-black"
                        : block.type === "h2"
                        ? "text-xl font-bold"
                        : block.type === "h3"
                        ? "text-lg font-semibold"
                        : "text-base"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => removeBlock(block.id)}
                    aria-label="Delete block"
                    className="rounded-lg bg-[#450a0a] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7f1d1d]"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {content.length === 0 && (
                <p className="text-sm text-red-700">
                  No content blocks yet. Use “Add Heading” or “Add Paragraph”.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-red-100 bg-white p-4 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20">
                <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#fecdd3" strokeWidth="3.5" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="3.5"
                    strokeDasharray={`${(score / 100) * 100} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-red-950">
                  {score}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-red-900">SEO Score</p>
                <p className="text-xs text-red-700">
                  {passed} of {checks.length} checks passed
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-red-100 bg-white p-4 sm:p-6">
            <h2 className="mb-3 text-lg font-bold text-red-950">Google Preview</h2>
            <div className="rounded-xl border border-red-100 bg-white p-4">
              <p className="text-xs text-green-700">{`example.com/${urlSlug || "url-slug"}`}</p>
              <p className="mt-1 text-lg font-medium text-blue-800">
                {title || "Your SEO title will appear here"}
              </p>
              <p className="mt-1 text-sm text-red-900">
                {description || "Your meta description will appear here as a snippet in search results."}
              </p>
            </div>
            <div className="mt-3 space-y-1 text-xs text-red-700">
              <p>Title: {titleLen} chars</p>
              <p>Meta description: {descLen} chars</p>
              <p>Primary keyword usage: {keywordUsage} times</p>
              <p>Content word count: {wordCount}</p>
              <p>H1: {h1Count} · H2: {h2Count} · H3: {h3Count}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-red-100 bg-white p-4 sm:p-6">
            <h2 className="mb-3 text-lg font-bold text-red-950">SEO Checklist</h2>
            <ul className="space-y-2">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2 text-sm">
                  <span
                    className={`mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full text-xs font-bold ${
                      c.ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {c.ok ? "✓" : "!"}
                  </span>
                  <span className={c.ok ? "text-red-900" : "text-red-700"}>{c.label}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function AdminCitySeo() {
  return (
    <Suspense fallback={<AdminCitySeoSkeleton />}>
      <CitySeoContent />
    </Suspense>
  );
}
