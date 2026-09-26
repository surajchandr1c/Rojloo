"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { uploadImage } from "@/lib/compress";
import {
  StaticPageKey,
  StaticSeoImage,
  StaticContentBlock,
  StaticSeoStatus,
  STATIC_PAGES,
} from "@/lib/types/static-seo";

function uid(): string {
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function StaticSeoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialKey = (searchParams.get("tab") || "home").toLowerCase().trim() as StaticPageKey;
  const validKey = STATIC_PAGES.some((p) => p.key === initialKey) ? initialKey : "home";

  const [activeTab, setActiveTab] = useState<StaticPageKey>(validKey);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Per-tab cache of SEO records
  const [seoMap, setSeoMap] = useState<
    Record<
      StaticPageKey,
      {
        title: string;
        description: string;
        keywords: string;
        images: StaticSeoImage[];
        content: StaticContentBlock[];
        status: StaticSeoStatus;
        updatedAt?: string;
      }
    >
  >({
    home: { title: "", description: "", keywords: "", images: [], content: [], status: "draft" },
    terms: { title: "", description: "", keywords: "", images: [], content: [], status: "draft" },
    "return-policy": { title: "", description: "", keywords: "", images: [], content: [], status: "draft" },
    "refund-policy": { title: "", description: "", keywords: "", images: [], content: [], status: "draft" },
    "privacy-policy": { title: "", description: "", keywords: "", images: [], content: [], status: "draft" },
    disclaimer: { title: "", description: "", keywords: "", images: [], content: [], status: "draft" },
    contact: { title: "", description: "", keywords: "", images: [], content: [], status: "draft" },
  });

  // Current tab active form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [images, setImages] = useState<StaticSeoImage[]>([]);
  const [content, setContent] = useState<StaticContentBlock[]>([]);
  const [status, setStatus] = useState<StaticSeoStatus>("draft");

  // Upload states
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const fileInputRef1 = useRef<HTMLInputElement | null>(null);
  const fileInputRef2 = useRef<HTMLInputElement | null>(null);

  // Fetch all static SEO records on mount
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/admin/static-seo", { credentials: "include" });
        if (!res.ok) {
          throw new Error(`Failed to load SEO data (${res.status})`);
        }
        const data = await res.json();
        if (!cancelled && data?.seo) {
          setSeoMap((prev) => ({
            ...prev,
            ...data.seo,
          }));

          const cur = data.seo[activeTab];
          if (cur) {
            setTitle(cur.title || "");
            setDescription(cur.description || "");
            setKeywords(cur.keywords || "");
            setImages(cur.images || []);
            setContent(cur.content || []);
            setStatus(cur.status || "draft");
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : "Error loading SEO records");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  // When activeTab changes, populate current form from seoMap
  const handleTabChange = (key: StaticPageKey) => {
    // Save current form state to seoMap first
    setSeoMap((prev) => ({
      ...prev,
      [activeTab]: {
        title,
        description,
        keywords,
        images,
        content,
        status,
      },
    }));

    setActiveTab(key);
    const target = seoMap[key];
    if (target) {
      setTitle(target.title || "");
      setDescription(target.description || "");
      setKeywords(target.keywords || "");
      setImages(target.images || []);
      setContent(target.content || []);
      setStatus(target.status || "draft");
    } else {
      setTitle("");
      setDescription("");
      setKeywords("");
      setImages([]);
      setContent([]);
      setStatus("draft");
    }
    setSuccessMsg(null);
    setErrorMsg(null);
    router.replace(`/admin/static-seo?tab=${key}`, { scroll: false });
  };

  // Add content block
  const addBlock = (type: "h2" | "h3" | "p") => {
    const newBlock: StaticContentBlock = {
      id: uid(),
      type,
      text: "",
    };
    setContent((prev) => [...prev, newBlock]);
  };

  // Update block text or type
  const updateBlock = (id: string, updates: Partial<StaticContentBlock>) => {
    setContent((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
  };

  // Move block up or down
  const moveBlock = (index: number, direction: "up" | "down") => {
    setContent((prev) => {
      const copy = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  // Delete block
  const deleteBlock = (id: string) => {
    setContent((prev) => prev.filter((b) => b.id !== id));
  };

  // Image Upload handler
  const handleImageUpload = async (slotIndex: number, file: File) => {
    setUploadingSlot(slotIndex);
    setUploadProgress(10);
    setErrorMsg(null);

    try {
      const url = await uploadImage(file, (p) => setUploadProgress(p));
      setImages((prev) => {
        const copy = [...prev];
        const existing = copy[slotIndex] || { url: "", alt: "" };
        copy[slotIndex] = { ...existing, url };
        return copy;
      });
      setSuccessMsg(`Image ${slotIndex + 1} uploaded successfully!`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadingSlot(null);
      setUploadProgress(0);
    }
  };

  // Update image alt text
  const updateImageAlt = (slotIndex: number, alt: string) => {
    setImages((prev) => {
      const copy = [...prev];
      if (copy[slotIndex]) {
        copy[slotIndex] = { ...copy[slotIndex], alt };
      }
      return copy;
    });
  };

  // Delete image
  const deleteImage = (slotIndex: number) => {
    setImages((prev) => {
      const copy = [...prev];
      if (slotIndex === 0) {
        // Remove slot 0, shift slot 1 or keep
        if (copy.length > 1) {
          return [copy[1]];
        }
        return [];
      } else {
        return copy.slice(0, 1);
      }
    });
    setSuccessMsg(`Image ${slotIndex + 1} removed.`);
  };

  // Save changes to API
  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const payload = {
      pageKey: activeTab,
      title,
      description,
      keywords,
      images: images.filter((img) => Boolean(img.url)).slice(0, 2),
      content,
      status,
    };

    try {
      const res = await fetch("/api/admin/static-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save SEO content");
      }

      setSeoMap((prev) => ({
        ...prev,
        [activeTab]: data.seo,
      }));

      setSuccessMsg(`Saved SEO content for "${activePageMeta?.label}" successfully!`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error saving content");
    } finally {
      setSaving(false);
    }
  };

  const activePageMeta = STATIC_PAGES.find((p) => p.key === activeTab);
  const activeHref = activePageMeta?.href || "/";

  const img1 = images[0];
  const img2 = images[1];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
            Static SEO Management
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Add, update, or remove SEO content, headings, paragraphs, and alternating layout images for static pages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={activeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
          >
            <span>View Live Page</span>
            <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>

          <button
            type="button"
            disabled={saving || loading}
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-black disabled:opacity-50"
          >
            {saving ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-200 gap-1 pb-px no-scrollbar">
        {STATIC_PAGES.map((page) => {
          const isActive = activeTab === page.key;
          const pageRecord = seoMap[page.key];
          const isPublished = pageRecord?.status === "published";
          const blockCount = pageRecord?.content?.length || 0;
          const imgCount = pageRecord?.images?.length || 0;

          return (
            <button
              key={page.key}
              type="button"
              onClick={() => handleTabChange(page.key)}
              className={`flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition ${
                isActive
                  ? "border-gray-950 text-gray-950 bg-gray-100/70 rounded-t-xl"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              <span>{page.label}</span>
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  isPublished ? "bg-emerald-500" : "bg-amber-400"
                }`}
                title={isPublished ? "Published" : "Draft"}
              />
              {(blockCount > 0 || imgCount > 0) && (
                <span className="rounded-full bg-gray-200/80 px-1.5 py-0.5 text-[10px] font-medium text-gray-700">
                  {blockCount}b{imgCount > 0 ? ` • ${imgCount}img` : ""}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-950"
          >
            ×
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-700 hover:text-rose-950"
          >
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-500">
          <svg className="mx-auto h-8 w-8 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="mt-3 text-sm">Loading SEO configuration...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Editing Area (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Page Status & Quick Switch */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-gray-950">
                    Target Page: <span className="text-blue-600">{activePageMeta?.label}</span> ({activeHref})
                  </h2>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Toggle publication status and configure bottom SEO section.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-700">Status:</span>
                  <div className="flex rounded-xl bg-gray-100 p-1 border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setStatus("draft")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        status === "draft"
                          ? "bg-amber-400 text-gray-950 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus("published")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        status === "published"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Published
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Images Management Section (2 slots) */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-950">Section Images (Max 2)</h2>
                  <p className="text-xs text-gray-600">
                    Upload up to 2 alternating images. Image 1 displays on the right; Image 2 displays on the left.
                  </p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  {images.filter((img) => Boolean(img.url)).length} / 2 Added
                </span>
              </div>

              {/* Informational Banner */}
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-blue-900">
                <p className="font-semibold text-blue-950">Frontend Layout Rules:</p>
                <ul className="mt-1 list-disc list-inside space-y-0.5 text-blue-800">
                  <li><strong>Image 1</strong>: Content appears on the <strong>Left</strong>, Image 1 on the <strong>Right</strong>.</li>
                  <li><strong>Image 2</strong>: Image 2 appears on the <strong>Left</strong>, Content on the <strong>Right</strong>.</li>
                  <li>When 2 images are added, content blocks are automatically divided between Section 1 and Section 2.</li>
                </ul>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Image Slot 1 */}
                <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-200">
                    <span className="text-sm font-bold text-gray-900">
                      Image 1 <span className="text-xs font-normal text-gray-600">(Right Side)</span>
                    </span>
                    {img1?.url && (
                      <button
                        type="button"
                        onClick={() => deleteImage(0)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline"
                      >
                        Delete Image
                      </button>
                    )}
                  </div>

                  {img1?.url ? (
                    <div className="space-y-3">
                      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
                        <img
                          src={img1.url}
                          alt={img1.alt || "Image 1"}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">Alt Text</label>
                        <input
                          type="text"
                          value={img1.alt || ""}
                          placeholder="Describe this image for SEO..."
                          onChange={(e) => updateImageAlt(0, e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 outline-none focus:border-gray-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-6 text-center">
                      <input
                        ref={fileInputRef1}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(0, file);
                          e.target.value = "";
                        }}
                      />
                      <svg className="h-10 w-10 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="mt-2 text-xs font-semibold text-gray-700">Image 1</p>
                      <p className="text-[11px] text-gray-500">JPG, PNG, WebP up to 5MB</p>
                      <button
                        type="button"
                        disabled={uploadingSlot === 0}
                        onClick={() => fileInputRef1.current?.click()}
                        className="mt-3 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-black disabled:opacity-50"
                      >
                        {uploadingSlot === 0 ? `Uploading (${uploadProgress}%)` : "Select & Upload"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Image Slot 2 */}
                <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-200">
                    <span className="text-sm font-bold text-gray-900">
                      Image 2 <span className="text-xs font-normal text-gray-600">(Left Side)</span>
                    </span>
                    {img2?.url && (
                      <button
                        type="button"
                        onClick={() => deleteImage(1)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline"
                      >
                        Delete Image
                      </button>
                    )}
                  </div>

                  {img2?.url ? (
                    <div className="space-y-3">
                      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
                        <img
                          src={img2.url}
                          alt={img2.alt || "Image 2"}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">Alt Text</label>
                        <input
                          type="text"
                          value={img2.alt || ""}
                          placeholder="Describe this image for SEO..."
                          onChange={(e) => updateImageAlt(1, e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 outline-none focus:border-gray-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-6 text-center">
                      <input
                        ref={fileInputRef2}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(1, file);
                          e.target.value = "";
                        }}
                      />
                      <svg className="h-10 w-10 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="mt-2 text-xs font-semibold text-gray-700">Image 2</p>
                      <p className="text-[11px] text-gray-500">JPG, PNG, WebP up to 5MB</p>
                      <button
                        type="button"
                        disabled={uploadingSlot === 1}
                        onClick={() => fileInputRef2.current?.click()}
                        className="mt-3 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-black disabled:opacity-50"
                      >
                        {uploadingSlot === 1 ? `Uploading (${uploadProgress}%)` : "Select & Upload"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content Blocks Editor */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-950">Content Blocks</h2>
                  <p className="text-xs text-gray-600">
                    Add H2 headings, H3 subheadings, and paragraphs. Wrap keywords in <code>**keyword**</code> for bold text.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => addBlock("h2")}
                    className="rounded-xl border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-800 transition hover:bg-gray-100"
                  >
                    + H2 Heading
                  </button>
                  <button
                    type="button"
                    onClick={() => addBlock("h3")}
                    className="rounded-xl border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-800 transition hover:bg-gray-100"
                  >
                    + H3 Subheading
                  </button>
                  <button
                    type="button"
                    onClick={() => addBlock("p")}
                    className="rounded-xl border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-800 transition hover:bg-gray-100"
                  >
                    + Paragraph
                  </button>
                </div>
              </div>

              {content.length === 0 ? (
                <div className="my-8 rounded-xl border border-dashed border-gray-300 p-8 text-center">
                  <p className="text-sm font-semibold text-gray-700">No content blocks yet</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Click the buttons above to add H2 headings, H3 subheadings, or paragraphs.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {content.map((block, index) => {
                    return (
                      <div
                        key={block.id}
                        className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 transition focus-within:border-gray-400 focus-within:bg-white"
                      >
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-500">#{index + 1}</span>
                            <select
                              value={block.type}
                              onChange={(e) =>
                                updateBlock(block.id, {
                                  type: e.target.value as "h2" | "h3" | "p",
                                })
                              }
                              className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-bold text-gray-900 outline-none"
                            >
                              <option value="h2">H2 Heading</option>
                              <option value="h3">H3 Subheading</option>
                              <option value="p">Paragraph</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => moveBlock(index, "up")}
                              title="Move Up"
                              className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-30"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              disabled={index === content.length - 1}
                              onClick={() => moveBlock(index, "down")}
                              title="Move Down"
                              className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-30"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteBlock(block.id)}
                              title="Delete Block"
                              className="rounded p-1 text-rose-600 hover:bg-rose-50 hover:text-rose-800"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <textarea
                          rows={block.type === "p" ? 3 : 2}
                          value={block.text}
                          placeholder={
                            block.type === "h2"
                              ? "Enter H2 heading text..."
                              : block.type === "h3"
                              ? "Enter H3 subheading text..."
                              : "Enter paragraph text (tip: **bold keywords**)..."
                          }
                          onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-gray-500"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Meta fields & Live Layout Preview (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Meta tags card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-gray-950 border-b border-gray-100 pb-2">
                Page Metadata
              </h2>

              <div>
                <div className="flex justify-between items-center text-xs font-semibold text-gray-700 mb-1">
                  <span>Meta Title</span>
                  <span className="text-gray-500">{title.length} chars</span>
                </div>
                <input
                  type="text"
                  value={title}
                  placeholder="e.g. Call Girls in Rojloo | Rojloo"
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900 outline-none focus:border-gray-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-semibold text-gray-700 mb-1">
                  <span>Meta Description</span>
                  <span className="text-gray-500">{description.length} chars</span>
                </div>
                <textarea
                  rows={3}
                  value={description}
                  placeholder="Enter meta description for search engines..."
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900 outline-none focus:border-gray-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-semibold text-gray-700 mb-1">
                  <span>Keywords</span>
                </div>
                <input
                  type="text"
                  value={keywords}
                  placeholder="comma, separated, keywords"
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900 outline-none focus:border-gray-500"
                />
              </div>
            </div>

            {/* Layout Visualizer */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
              <h2 className="text-base font-bold text-gray-950 border-b border-gray-100 pb-2">
                Layout Structure
              </h2>

              <p className="text-xs text-gray-600">
                Visual diagram of how content and images will render on the live page:
              </p>

              <div className="space-y-3 text-[11px] font-mono">
                {/* Block 1 */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                  <div className="text-xs font-bold text-gray-800 mb-1.5 flex items-center justify-between">
                    <span>Section 1</span>
                    <span className="text-[10px] text-gray-500">Image 1 Right</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded bg-blue-100/70 p-2 text-blue-900 font-semibold text-center">
                      Content (Left)
                    </div>
                    <div className={`rounded p-2 font-semibold text-center ${
                      img1?.url ? "bg-emerald-100 text-emerald-900" : "bg-gray-200 text-gray-600"
                    }`}>
                      {img1?.url ? "✓ Image 1 (Right)" : "No Image 1"}
                    </div>
                  </div>
                </div>

                {/* Block 2 */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                  <div className="text-xs font-bold text-gray-800 mb-1.5 flex items-center justify-between">
                    <span>Section 2</span>
                    <span className="text-[10px] text-gray-500">Image 2 Left</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`rounded p-2 font-semibold text-center ${
                      img2?.url ? "bg-emerald-100 text-emerald-900" : "bg-gray-200 text-gray-600"
                    }`}>
                      {img2?.url ? "✓ Image 2 (Left)" : "No Image 2"}
                    </div>
                    <div className="rounded bg-blue-100/70 p-2 text-blue-900 font-semibold text-center">
                      Content (Right)
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={saving || loading}
                  onClick={handleSave}
                  className="w-full rounded-xl bg-gray-900 py-2.5 text-xs font-bold text-white transition hover:bg-black disabled:opacity-50"
                >
                  {saving ? "Saving Changes..." : "Save SEO Content"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StaticSeoAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-gray-500">
          Loading Static SEO...
        </div>
      }
    >
      <StaticSeoContent />
    </Suspense>
  );
}
