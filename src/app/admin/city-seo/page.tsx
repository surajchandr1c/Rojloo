"use client";

import { Suspense, useEffect, useRef, useState } from "react";
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

type FaqItem = {
  id: string;
  question: string;
  answer: string;
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

  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  const [allCities, setAllCities] = useState<
    { name: string; slug: string; state?: string }[]
  >([]);
  const [activeSlug, setActiveSlug] = useState(editSlug || "");
  const [stateName, setStateName] = useState("");

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
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [status, setStatus] = useState<"draft" | "published">("draft");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [faqDragIndex, setFaqDragIndex] = useState<number | null>(null);
  const [jsonPasteText, setJsonPasteText] = useState("");
  const [jsonStatusMsg, setJsonStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [citiesRes, seoRes] = await Promise.all([
          fetch("/api/admin/cities", { credentials: "include" }).then((r) =>
            r.json()
          ),
          fetch("/api/admin/city-seo", { credentials: "include" }).then((r) =>
            r.json()
          ),
        ]);
        if (cancelled) return;

        const fetchedCities = (citiesRes.cities ?? []) as {
          name: string;
          slug: string;
          state?: string;
        }[];
        setAllCities(fetchedCities);

        const targetSlug = editSlug || activeSlug;
        if (targetSlug) {
          const city = fetchedCities.find((c) => c.slug === targetSlug);
          if (city) {
            setName(city.name);
            if (city.state) setStateName(city.state);
          }

          const seo = (seoRes.seo ?? []).find(
            (s: { slug: string; urlSlug?: string }) =>
              s.slug === targetSlug || s.urlSlug === targetSlug
          );
          if (seo) {
            if (!name && seo.name) setName(seo.name);
            setTitle(seo.title ?? "");
            setDescription(seo.description ?? "");
            setUrlSlug(seo.urlSlug ?? targetSlug);
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
            setFaqs(Array.isArray(seo.faqs) ? seo.faqs : []);
            setStatus(seo.status === "published" ? "published" : "draft");
          } else {
            setUrlSlug(targetSlug);
            setContent([
              { id: uid(), type: "h1", text: "" },
              { id: uid(), type: "p", text: "" },
            ]);
            setFaqs([]);
          }
        } else {
          setContent([
            { id: uid(), type: "h1", text: "" },
            { id: uid(), type: "p", text: "" },
          ]);
          setFaqs([]);
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

  function handleCityNameChange(val: string) {
    setName(val);
    const trimmed = val.trim().toLowerCase();
    const match = allCities.find(
      (c) => c.name.toLowerCase() === trimmed || c.slug.toLowerCase() === trimmed
    );
    if (match) {
      if (match.state) setStateName(match.state);
      setActiveSlug(match.slug);
      if (!slugManual) setUrlSlug(match.slug);
    } else {
      if (!slugManual && val.trim()) setUrlSlug(slugify(val));
    }
  }

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

  function addFaq() {
    setFaqs((prev) => [...prev, { id: uid(), question: "", answer: "" }]);
  }

  function updateFaq(id: string, patch: Partial<FaqItem>) {
    setFaqs((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f))
    );
  }

  function removeFaq(id: string) {
    setFaqs((prev) => prev.filter((f) => f.id !== id));
  }

  function reorderFaq(from: number, to: number) {
    setFaqs((prev) => {
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

  function getSampleJsonString(): string {
    const cityName = name.trim() || "Mumbai";
    const sample = {
      name: cityName,
      state: stateName.trim() || "Maharashtra",
      title:
        title ||
        `Best Escort & Call Girl Services in ${cityName} | Rojlo`,
      description:
        description ||
        `Find top verified escorts and independent call girls in ${cityName}. 100% genuine photos, safe booking, 24/7 service.`,
      urlSlug: urlSlug || slugify(cityName),
      primaryKeyword: primaryKeyword || `call girls in ${cityName.toLowerCase()}`,
      secondaryKeywords: secondaryKeywords.length
        ? secondaryKeywords
        : [
            `escorts in ${cityName.toLowerCase()}`,
            `${cityName.toLowerCase()} call girls`,
            `independent escorts ${cityName.toLowerCase()}`,
          ],
      longTailKeywords: longTailKeywords.length
        ? longTailKeywords
        : [
            `vip escort service in ${cityName.toLowerCase()}`,
            `hotel delivery call girl ${cityName.toLowerCase()}`,
          ],
      canonicalUrl:
        canonicalUrl ||
        `https://rojloo.vercel.app/places/${urlSlug || slugify(cityName)}`,
      featuredImage: featuredImage || "",
      imageAlt: imageAlt || `${cityName} city guide`,
      status: "draft",
      content: content.length
        ? content.map((c) => ({ type: c.type, text: c.text }))
        : [
            {
              type: "h1",
              text: `Top Escort Services in ${cityName}`,
            },
            {
              type: "p",
              text: `${cityName} offers unmatched nightlife and top-tier services across all major localities with verified contacts.`,
            },
            {
              type: "h2",
              text: "Why Choose Verified Services on Rojlo",
            },
            {
              type: "p",
              text: "Safety, genuine photos, and direct WhatsApp contact make booking fast and secure.",
            },
          ],
      faqs: faqs.length
        ? faqs.map((f) => ({ question: f.question, answer: f.answer }))
        : [
            {
              question: `How do I contact service providers in ${cityName}?`,
              answer:
                "You can browse verified advertiser profiles and connect directly via phone call, WhatsApp, or Telegram.",
            },
            {
              question: "Are advertiser photos verified?",
              answer:
                "Yes, our team verifies advertiser profile photos to ensure authentic listings.",
            },
          ],
    };

    return JSON.stringify(sample, null, 2);
  }

  function downloadSampleJson() {
    const cityName = name.trim() || "Mumbai";
    const sampleStr = getSampleJsonString();
    const blob = new Blob([sampleStr], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(cityName)}-seo-sample.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function applyJsonString(rawText: string): boolean {
    const trimmed = rawText.trim();
    if (!trimmed) {
      const msg = "Please enter or paste JSON text first.";
      setJsonStatusMsg({ type: "error", text: msg });
      setError(msg);
      return false;
    }

    setError("");
    setSuccess("");

    try {
      const data = JSON.parse(trimmed);

      if (!data || typeof data !== "object") {
        const msg = "The JSON content is empty or not a valid JSON object.";
        setJsonStatusMsg({ type: "error", text: msg });
        setError(msg);
        return false;
      }

      // 1. City Name & State
      const parsedName = String(
        data.name || data.cityName || data.city || ""
      ).trim();
      if (parsedName) {
        setName(parsedName);
        const match = allCities.find(
          (c) =>
            c.name.toLowerCase() === parsedName.toLowerCase() ||
            c.slug.toLowerCase() === slugify(parsedName)
        );
        if (match) {
          setActiveSlug(match.slug);
          if (match.state) setStateName(match.state);
        }
      }

      const parsedState = String(data.state || data.stateName || "").trim();
      if (parsedState) setStateName(parsedState);

      // 2. Title & Description
      const parsedTitle = String(
        data.title || data.seoTitle || data.metaTitle || ""
      ).trim();
      if (parsedTitle) setTitle(parsedTitle);

      const parsedDesc = String(
        data.description ||
          data.metaDescription ||
          data.meta_description ||
          ""
      ).trim();
      if (parsedDesc) setDescription(parsedDesc);

      // 3. Slug
      const parsedSlug = String(
        data.urlSlug || data.url_slug || data.slug || ""
      ).trim();
      if (parsedSlug) {
        setUrlSlug(slugify(parsedSlug));
        setSlugManual(true);
      } else if (parsedTitle && !urlSlug) {
        setUrlSlug(slugify(parsedTitle));
      } else if (parsedName && !urlSlug) {
        setUrlSlug(slugify(parsedName));
      }

      // 4. Keywords
      const parsedPrimary = String(
        data.primaryKeyword ||
          data.primary_keyword ||
          data.keyword ||
          data.keywords ||
          ""
      ).trim();
      if (parsedPrimary) setPrimaryKeyword(parsedPrimary);

      const rawSec = data.secondaryKeywords || data.secondary_keywords;
      if (Array.isArray(rawSec)) {
        setSecondaryKeywords(
          rawSec.map(String).map((s) => s.trim()).filter(Boolean)
        );
      } else if (typeof rawSec === "string" && rawSec.trim()) {
        setSecondaryKeywords(
          rawSec.split(",").map((s) => s.trim()).filter(Boolean)
        );
      }

      const rawLong = data.longTailKeywords || data.long_tail_keywords;
      if (Array.isArray(rawLong)) {
        setLongTailKeywords(
          rawLong.map(String).map((s) => s.trim()).filter(Boolean)
        );
      } else if (typeof rawLong === "string" && rawLong.trim()) {
        setLongTailKeywords(
          rawLong.split(",").map((s) => s.trim()).filter(Boolean)
        );
      }

      // 5. Canonical & Images
      const parsedCanonical = String(
        data.canonicalUrl || data.canonical_url || data.canonical || ""
      ).trim();
      if (parsedCanonical) setCanonicalUrl(parsedCanonical);

      const parsedImage = String(
        data.featuredImage || data.featured_image || data.image || ""
      ).trim();
      if (parsedImage) setFeaturedImage(parsedImage);

      const parsedAlt = String(
        data.imageAlt || data.image_alt || data.alt || ""
      ).trim();
      if (parsedAlt) setImageAlt(parsedAlt);

      // 6. Content Blocks (support blocks array, strings array, markdown, sections)
      const newBlocks: ContentBlock[] = [];
      const rawContent =
        data.content || data.blocks || data.body || data.sections;

      if (Array.isArray(rawContent)) {
        for (const item of rawContent) {
          if (typeof item === "string") {
            const str = item.trim();
            if (!str) continue;
            if (str.startsWith("### ")) {
              newBlocks.push({ id: uid(), type: "h3", text: str.slice(4).trim() });
            } else if (str.startsWith("## ")) {
              newBlocks.push({ id: uid(), type: "h2", text: str.slice(3).trim() });
            } else if (str.startsWith("# ")) {
              newBlocks.push({ id: uid(), type: "h1", text: str.slice(2).trim() });
            } else {
              newBlocks.push({ id: uid(), type: "p", text: str });
            }
          } else if (typeof item === "object" && item !== null) {
            const bType: BlockType = ["h1", "h2", "h3", "p"].includes(item.type)
              ? item.type
              : item.tag === "h1" || item.heading === 1
              ? "h1"
              : item.tag === "h2" || item.heading === 2
              ? "h2"
              : item.tag === "h3" || item.heading === 3
              ? "h3"
              : "p";
            const bText = String(
              item.text ||
                item.content ||
                item.value ||
                item.body ||
                item.title ||
                ""
            ).trim();
            if (bText) {
              newBlocks.push({
                id: item.id || uid(),
                type: bType,
                text: bText,
              });
            }
          }
        }
      } else if (typeof rawContent === "string" && rawContent.trim()) {
        const paragraphs = rawContent.split(/\r?\n\r?\n/);
        for (const p of paragraphs) {
          const trimmed = p.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith("### ")) {
            newBlocks.push({ id: uid(), type: "h3", text: trimmed.slice(4).trim() });
          } else if (trimmed.startsWith("## ")) {
            newBlocks.push({ id: uid(), type: "h2", text: trimmed.slice(3).trim() });
          } else if (trimmed.startsWith("# ")) {
            newBlocks.push({ id: uid(), type: "h1", text: trimmed.slice(2).trim() });
          } else {
            newBlocks.push({ id: uid(), type: "p", text: trimmed });
          }
        }
      }

      if (newBlocks.length > 0) {
        setContent(newBlocks);
      }

      // 7. FAQs
      const newFaqs: FaqItem[] = [];
      const rawFaqs = data.faqs || data.faq || data.questions;
      if (Array.isArray(rawFaqs)) {
        for (const f of rawFaqs) {
          if (typeof f === "object" && f !== null) {
            const question = String(
              f.question || f.q || f.title || ""
            ).trim();
            const answer = String(
              f.answer ||
                f.a ||
                f.solution ||
                f.description ||
                f.content ||
                ""
            ).trim();
            if (question || answer) {
              newFaqs.push({
                id: f.id || uid(),
                question,
                answer,
              });
            }
          }
        }
      }

      if (newFaqs.length > 0) {
        setFaqs(newFaqs);
      }

      if (data.status === "published" || data.status === "draft") {
        setStatus(data.status);
      }

      const successMsg = `JSON arranged successfully onto the form! Populated City, SEO Title, Description, Keywords, ${newBlocks.length} content block(s), and ${newFaqs.length} FAQ(s).`;
      setJsonStatusMsg({ type: "success", text: successMsg });
      setSuccess(successMsg);
      return true;
    } catch (err) {
      const errMsg = `Failed to parse JSON: ${
        err instanceof Error ? err.message : "Invalid JSON syntax"
      }`;
      setJsonStatusMsg({ type: "error", text: errMsg });
      setError(errMsg);
      return false;
    }
  }

  async function handleJsonFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setJsonPasteText(text);
      applyJsonString(text);
    } catch (err) {
      setError(
        `Failed to read file: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      if (e.target) e.target.value = "";
    }
  }

  function handleApplyPastedJson() {
    applyJsonString(jsonPasteText);
  }

  function handleClearJson() {
    setJsonPasteText("");
    setJsonStatusMsg(null);
  }

  function handleLoadSampleJson() {
    const sample = getSampleJsonString();
    setJsonPasteText(sample);
    setJsonStatusMsg(null);
  }

  async function save(publish: boolean): Promise<string | null> {
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const targetName = name.trim();
      if (!targetName) {
        setError("City name is required.");
        setSaving(false);
        return null;
      }

      // Check if city exists in loaded cities
      let slug = activeSlug || editSlug || "";
      if (!slug) {
        const existing = allCities.find(
          (c) =>
            c.name.toLowerCase() === targetName.toLowerCase() ||
            c.slug.toLowerCase() === slugify(targetName).toLowerCase()
        );
        if (existing) {
          slug = existing.slug;
        }
      }

      // If brand new city, create via /api/admin/cities
      if (!slug) {
        const resolvedState = stateName.trim() || "India";
        const cRes = await fetch("/api/admin/cities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: targetName,
            state: resolvedState,
            region: resolvedState,
            country: "India",
            famousFood: "",
            seoDescription: description.trim(),
          }),
        });
        const cData = await cRes.json();
        if (
          !cRes.ok &&
          !cData.error?.toLowerCase().includes("already exists")
        ) {
          setError(cData.error || "Failed to add city.");
          setSaving(false);
          return null;
        }
        slug = cData.city?.slug || slugify(targetName);
      }

      const finalUrlSlug = (
        urlSlug.trim() ||
        slugify(title) ||
        slugify(targetName) ||
        slug
      ).toLowerCase();

      const sRes = await fetch("/api/admin/city-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          slug,
          name: targetName || slug,
          title,
          description,
          keywords: primaryKeyword,
          urlSlug: finalUrlSlug,
          primaryKeyword,
          secondaryKeywords,
          longTailKeywords,
          canonicalUrl:
            canonicalUrl.trim() ||
            `https://rojloo.vercel.app/places/${finalUrlSlug}`,
          featuredImage,
          imageAlt,
          content,
          faqs,
          status: publish ? "published" : "draft",
        }),
      });

      const sData = await sRes.json();
      if (!sRes.ok) {
        setError(sData.error || "Failed to save SEO.");
        setSaving(false);
        return null;
      }

      setActiveSlug(slug);
      setStatus(publish ? "published" : "draft");
      setSuccess(
        publish ? "Published successfully!" : "Draft saved successfully!"
      );
      if (typeof window !== "undefined") {
        window.history.replaceState(
          null,
          "",
          `/admin/city-seo?city=${encodeURIComponent(slug)}`
        );
      }

      setTimeout(() => setSuccess(""), 4000);
      return slug;
    } catch {
      setError("Something went wrong. Please try again.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function preview() {
    setError("");
    const targetName = name.trim();
    const targetSlug =
      activeSlug || editSlug || urlSlug.trim() || slugify(targetName);
    if (!targetSlug && !targetName) {
      setError("Please enter a city name before previewing.");
      return;
    }

    // Auto-save draft before previewing so latest changes are immediately reflected
    const savedSlug = await save(false);
    const slugToOpen = savedSlug || targetSlug;
    if (slugToOpen) {
      window.open(`/places/${slugToOpen}?preview=true`, "_blank");
    }
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
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleJsonFileSelect}
          />
          <button
            type="button"
            onClick={() => jsonInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full border border-pink-300 bg-pink-50 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-pink-100 transition cursor-pointer"
            title="Upload a .json file to automatically fill all SEO fields, content blocks, and FAQs"
          >
            <span>📁</span> Upload JSON
          </button>
          <button
            type="button"
            onClick={downloadSampleJson}
            className="inline-flex items-center gap-1 rounded-full border border-pink-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-pink-50 transition cursor-pointer"
            title="Download an example JSON format template"
          >
            <span>⬇</span> Sample JSON
          </button>
          <button
            type="button"
            onClick={() => save(false)}
            disabled={saving}
            className="rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 transition cursor-pointer"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            onClick={preview}
            disabled={saving || (!activeSlug && !editSlug && !urlSlug && !name.trim())}
            className="rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 transition cursor-pointer"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => save(true)}
            disabled={saving}
            className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition cursor-pointer"
          >
            {saving ? "Publishing..." : "Publish"}
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
          {/* JSON Paste & Auto-Fill Section */}
          <section className="rounded-2xl border border-red-200 bg-gradient-to-b from-pink-50/70 via-white to-white p-4 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-pink-100 pb-3 mb-3">
              <div>
                <h2 className="text-lg font-bold text-red-950 flex items-center gap-2">
                  <span>Paste SEO JSON Content</span>
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                    Fast Fill
                  </span>
                </h2>
                <p className="text-xs text-red-900 mt-0.5">
                  Paste JSON file text here to automatically arrange and fill the full SEO form below.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleLoadSampleJson}
                  className="rounded-lg border border-pink-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-pink-50 transition cursor-pointer"
                  title="Insert sample JSON format into textarea"
                >
                  Load Sample
                </button>
                {jsonPasteText && (
                  <button
                    type="button"
                    onClick={handleClearJson}
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <textarea
                  rows={6}
                  value={jsonPasteText}
                  onChange={(e) => {
                    setJsonPasteText(e.target.value);
                    if (jsonStatusMsg) setJsonStatusMsg(null);
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData("text");
                    if (pasted && pasted.trim().startsWith("{")) {
                      setTimeout(() => {
                        applyJsonString(pasted);
                      }, 50);
                    }
                  }}
                  placeholder={`Paste your JSON file text here...\nExample:\n{\n  "name": "Mumbai",\n  "state": "Maharashtra",\n  "title": "Best Escort & Call Girl Services in Mumbai | Rojlo",\n  "description": "Find top verified escorts and independent call girls in Mumbai...",\n  "primaryKeyword": "call girls in mumbai",\n  "secondaryKeywords": ["escorts in mumbai", "mumbai call girls"],\n  "content": [\n    { "type": "h1", "text": "Top Escort Services in Mumbai" },\n    { "type": "p", "text": "Mumbai offers unmatched nightlife..." }\n  ],\n  "faqs": [\n    { "question": "How do I contact providers in Mumbai?", "answer": "Browse verified profiles..." }\n  ]\n}`}
                  className="w-full font-mono text-xs sm:text-sm rounded-xl border border-pink-200 bg-pink-50/60 p-3 text-red-950 placeholder-red-300 focus:border-red-500 focus:bg-white focus:outline-none transition resize-y leading-relaxed"
                  spellCheck={false}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleApplyPastedJson}
                  disabled={!jsonPasteText.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white shadow-xs hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <span>Apply JSON to Form</span>
                </button>

                <p className="text-[11px] text-red-700">
                  Tip: Pasting valid JSON will auto-arrange and fill all fields on the page.
                </p>
              </div>

              {jsonStatusMsg && (
                <div
                  className={`rounded-xl px-4 py-2.5 text-xs sm:text-sm font-medium animate-in fade-in ${
                    jsonStatusMsg.type === "success"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {jsonStatusMsg.text}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-red-100 bg-white p-4 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-red-950">City Information</h2>
              {allCities.some((c) => c.name.toLowerCase() === name.trim().toLowerCase()) && (
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                  ✓ Existing City Linked
                </span>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City Name" hint="Select or type city name">
                <input
                  list="city-suggestions-list"
                  className={inputClass}
                  value={name}
                  onChange={(e) => handleCityNameChange(e.target.value)}
                  placeholder="e.g. Mumbai"
                />
                <datalist id="city-suggestions-list">
                  {allCities.map((c) => (
                    <option key={c.slug} value={c.name}>
                      {c.state ? `${c.name} (${c.state})` : c.name}
                    </option>
                  ))}
                </datalist>
              </Field>

              <Field label="State / Region" hint="State for this city">
                <input
                  className={inputClass}
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="e.g. Maharashtra"
                />
              </Field>
            </div>
          </section>

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

          {/* FAQ Editor Section */}
          <section className="rounded-2xl border border-red-100 bg-white p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-red-950">
                  FAQ Editor (Frequently Asked Questions)
                </h2>
                <p className="text-xs text-red-800">
                  Add questions &amp; solutions for this city page. Users can click questions to expand solutions in an accordion.
                </p>
              </div>
              <button
                type="button"
                onClick={addFaq}
                className="rounded-full bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition cursor-pointer"
              >
                + Add FAQ
              </button>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div
                  key={faq.id}
                  draggable
                  onDragStart={() => setFaqDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (faqDragIndex !== null && faqDragIndex !== i) {
                      reorderFaq(faqDragIndex, i);
                    }
                    setFaqDragIndex(null);
                  }}
                  onDragEnd={() => setFaqDragIndex(null)}
                  className={`flex flex-col gap-2.5 rounded-xl border border-pink-200 bg-pink-50/70 p-3 sm:p-4 ${
                    faqDragIndex === i ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-pink-200/70 pb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex cursor-grab items-center px-1 text-red-400 font-mono text-sm"
                        title="Drag to reorder"
                      >
                        ⠿
                      </span>
                      <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-black text-red-900 border border-red-200">
                        Q#{i + 1}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFaq(faq.id)}
                      aria-label="Delete FAQ"
                      className="rounded-lg bg-[#450a0a] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#7f1d1d] cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-red-900 mb-1">
                      Question:
                    </label>
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) =>
                        updateFaq(faq.id, { question: e.target.value })
                      }
                      placeholder="e.g. How do I contact service providers in this city?"
                      className="w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm font-semibold text-red-950 outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-red-900 mb-1">
                      Solution / Answer:
                    </label>
                    <textarea
                      value={faq.answer}
                      onChange={(e) =>
                        updateFaq(faq.id, { answer: e.target.value })
                      }
                      placeholder="Write the detailed solution or answer here..."
                      rows={3}
                      className="w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm text-red-950 outline-none focus:border-red-500 leading-relaxed"
                    />
                  </div>
                </div>
              ))}

              {faqs.length === 0 && (
                <div className="rounded-xl border border-dashed border-pink-300 bg-pink-50/30 p-6 text-center">
                  <p className="text-sm font-medium text-red-800">
                    No FAQs added yet. Click &ldquo;+ Add FAQ&rdquo; above to add questions and solutions.
                  </p>
                </div>
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
