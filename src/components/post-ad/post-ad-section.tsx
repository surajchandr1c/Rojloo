"use client";

import Image from "next/image";
import { useEffect, useState, useRef, useMemo } from "react";
import Button from "@/components/ui/button";
import { TextInput, TextArea, Select, FileInput } from "@/components/ui/field";
import { cityPlaces } from "@/lib/places";
import { SERVICES, TO_SERVE, PLACE_OF_SERVICE, DEFAULT_SERVICE_RATES, MAX_IMAGES, type AdForm } from "./types";

type CityOption = { name: string; slug: string; state?: string };

type StateOption = { name: string; slug: string };
type LocalAreaOption = { name: string; slug: string };

export default function PostAdSection({
  form,
  setForm,
  formError,
  formLoading,
  imageUploading = false,
  uploadProgress = 0,
  uploadingCount = 0,
  editingId,
  hasExistingFreeAd = false,
  existingFreeAdTitle = "",
  onImageChange,
  onRemoveImage,
  onSubmit,
}: {
  form: AdForm;
  setForm: React.Dispatch<React.SetStateAction<AdForm>>;
  formError: string;
  formLoading: boolean;
  imageUploading?: boolean;
  uploadProgress?: number;
  uploadingCount?: number;
  editingId: string | null;
  hasExistingFreeAd?: boolean;
  existingFreeAdTitle?: string;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const [stateOptions, setStateOptions] = useState<StateOption[]>([]);
  const [allCities, setAllCities] = useState<CityOption[]>(cityPlaces);
  const [serverCities, setServerCities] = useState<CityOption[]>([]);
  const [cityLoading, setCityLoading] = useState<boolean>(false);
  const [localAreaOptions, setLocalAreaOptions] = useState<LocalAreaOption[]>([]);
  const [showStatePrompt, setShowStatePrompt] = useState<boolean>(false);
  const [isStateHighlighted, setIsStateHighlighted] = useState<boolean>(false);
  const stateSelectRef = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    fetch("/api/states")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.states) && data.states.length > 0) {
          setStateOptions(
            data.states.map((s: { name: string; slug: string }) => ({
              name: s.name,
              slug: s.slug,
            }))
          );
        }
      })
      .catch(() => {});

    fetch("/api/cities")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.cities) && data.cities.length > 0) {
          setAllCities(
            data.cities.map((c: { name: string; slug: string; state?: string }) => ({
              name: c.name,
              slug: c.slug,
              state: c.state,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const localMatches = useMemo(() => {
    if (!form.state || !form.state.trim()) return [];
    const targetState = form.state.trim().toLowerCase();
    return allCities.filter(
      (c) => c.state && c.state.trim().toLowerCase() === targetState
    );
  }, [allCities, form.state]);

  useEffect(() => {
    if (!form.state || !form.state.trim()) {
      return;
    }

    let ignore = false;
    queueMicrotask(() => {
      if (!ignore) {
        setCityLoading(true);
      }
    });
    fetch(`/api/cities?state=${encodeURIComponent(form.state.trim())}`)
      .then((r) => r.json())
      .then((data) => {
        if (!ignore && Array.isArray(data.cities)) {
          const fetchedCities: CityOption[] = data.cities.map(
            (c: { name: string; slug: string; state?: string }) => ({
              name: c.name,
              slug: c.slug,
              state: c.state,
            })
          );
          setServerCities(fetchedCities);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setCityLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [form.state]);

  const stateCities = useMemo(() => {
    if (!form.state || !form.state.trim()) return [];
    const seen = new Set<string>();
    const combined: CityOption[] = [];
    for (const c of [...serverCities, ...localMatches]) {
      const key = c.name.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(c);
      }
    }
    return combined.sort((a, b) => a.name.localeCompare(b.name));
  }, [form.state, serverCities, localMatches]);

  useEffect(() => {
    if (!form.city) {
      return;
    }
    let ignore = false;
    const params = new URLSearchParams({ cityName: form.city });
    if (form.state) params.append("stateName", form.state);
    fetch(`/api/local-areas?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!ignore && Array.isArray(data.localAreas)) {
          setLocalAreaOptions(
            data.localAreas.map((a: { name: string; slug: string }) => ({
              name: a.name,
              slug: a.slug,
            }))
          );
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [form.city, form.state]);

  function update<K extends keyof AdForm>(key: K, value: AdForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }) as AdForm);
  }

  function updateRate(
    index: number,
    field: "incall" | "outcall",
    value: string
  ) {
    const rates = form.serviceRates ?? DEFAULT_SERVICE_RATES;
    const next = rates.map((r, i) =>
      i === index ? { ...r, [field]: value } : r
    );
    update("serviceRates", next);
  }

  function handleStateChange(selectedState: string) {
    update("state", selectedState);
    if (selectedState !== form.state) {
      update("city", "");
      update("localArea", "");
      setLocalAreaOptions([]);
    }
    setShowStatePrompt(false);
    setIsStateHighlighted(false);
  }

  function handleCityClickWhenDisabled() {
    setShowStatePrompt(true);
    setIsStateHighlighted(true);
    if (stateSelectRef.current) {
      stateSelectRef.current.focus();
    }
    setTimeout(() => {
      setIsStateHighlighted(false);
    }, 2500);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Free Ad Policy Banner */}
      {!editingId && (
        <div
          className={`rounded-2xl border p-4 sm:p-5 shadow-xs ${
            hasExistingFreeAd
              ? "border-gray-300 bg-gray-50 text-gray-950"
              : "border-gray-300 bg-gray-50 text-gray-950"
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl sm:text-2xl mt-0.5 shrink-0">
              {hasExistingFreeAd ? "⚠️" : "🎁"}
            </span>
            <div className="space-y-1">
              <h4 className="font-bold text-sm sm:text-base text-gray-950">
                {hasExistingFreeAd
                  ? "Free Ad Limit (1/1) Used"
                  : "1 Free Ad Included"}
              </h4>
              <p className="text-xs sm:text-sm leading-relaxed text-gray-900">
                {hasExistingFreeAd
                  ? `You already have an active free ad ${existingFreeAdTitle ? `("${existingFreeAdTitle}")` : ""} visible on the city page. You can post this additional ad, but you will need to promote it with a VIP package for it to be visible on the city page.`
                  : "Every account can post 1 free ad! This ad will be published and immediately visible in city listings without requiring payment."}
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="space-y-4 rounded-2xl border-2 border-gray-300 p-4 sm:p-5">
        <h3 className="text-lg font-bold text-gray-950">Personal Information</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">
              Name <span className="text-gray-600">*</span>
            </label>
            <TextInput
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Your name"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">
              Age
            </label>
            <TextInput
              type="number"
              min={18}
              value={form.age ?? ""}
              onChange={(e) => update("age", e.target.value)}
              placeholder="Your age"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-900">
            Title <span className="text-gray-600">*</span>
          </label>
          <TextInput
            value={form.title ?? ""}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Give title"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-900">
            About <span className="text-gray-600">*</span>
          </label>
          <TextArea
            value={form.about}
            onChange={(e) => update("about", e.target.value)}
            placeholder="write about your self"
            rows={4}
            required
          />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border-2 border-gray-300 p-4 sm:p-5">
        <h3 className="text-lg font-bold text-gray-950">Location</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">
              State <span className="text-gray-600">*</span>
            </label>
            {stateOptions.length > 0 ? (
              <Select
                ref={stateSelectRef}
                value={form.state ?? ""}
                onChange={(e) => handleStateChange(e.target.value)}
                className={
                  isStateHighlighted
                    ? "ring-2 ring-gray-500 border-gray-500 bg-gray-100/90 transition-all"
                    : undefined
                }
                required
              >
                <option value="">Select a state</option>
                {stateOptions.map((s) => (
                  <option key={s.slug} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </Select>
            ) : (
              <TextInput
                value={form.state ?? ""}
                onChange={(e) => handleStateChange(e.target.value)}
                placeholder="State"
                required
              />
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">
              City <span className="text-gray-600">*</span>
            </label>
            <div className="relative">
              {!form.state?.trim() && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleCityClickWhenDisabled}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleCityClickWhenDisabled();
                    }
                  }}
                  className="absolute inset-0 z-10 cursor-not-allowed"
                  title="Please select a state first"
                  aria-label="City list is locked. Please select a state first."
                />
              )}
              <Select
                value={form.city}
                disabled={!form.state?.trim()}
                onChange={(e) => {
                  update("city", e.target.value);
                  update("localArea", "");
                  setLocalAreaOptions([]);
                }}
                className={
                  !form.state?.trim()
                    ? "cursor-not-allowed opacity-60 bg-gray-100/60"
                    : undefined
                }
                required
              >
                {!form.state?.trim() ? (
                  <option value="">Select a state first</option>
                ) : (
                  <>
                    <option value="">Select a city</option>
                    {stateCities.map((c, idx) => (
                      <option key={`${c.slug}-${idx}`} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    {stateCities.length === 0 && (
                      <option value="" disabled>
                        {cityLoading
                          ? "Loading cities..."
                          : "No cities listed for this state"}
                      </option>
                    )}
                  </>
                )}
              </Select>
            </div>
            {showStatePrompt && !form.state?.trim() && (
              <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-gray-600 animate-pulse">
                <span>⚠️</span>
                <span>Please select a state first to view cities.</span>
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">
              Local Area (Optional)
            </label>
            {localAreaOptions.length > 0 ? (
              <Select
                value={form.localArea ?? ""}
                onChange={(e) => update("localArea", e.target.value)}
              >
                <option value="">-- Optional: Select Local Area --</option>
                {localAreaOptions.map((a) => (
                  <option key={a.slug} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </Select>
            ) : (
              <TextInput
                value={form.localArea ?? ""}
                onChange={(e) => update("localArea", e.target.value)}
                placeholder="Local area (optional)"
              />
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">
              Pin Code
            </label>
            <TextInput
              value={form.pincode ?? ""}
              onChange={(e) => update("pincode", e.target.value)}
              placeholder="Pin code"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border-2 border-gray-300 p-4 sm:p-5">
        <h3 className="text-lg font-bold text-gray-950">Services</h3>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-900">
            Service <span className="text-gray-600">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {SERVICES.map((svc) => (
              <Button
                key={svc}
                type="button"
                variant="soft"
                size="sm"
                active={form.category === svc}
                onClick={() => update("category", svc)}
                className={form.category === svc ? "!text-white" : "!text-black"}
              >
                {svc}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-900">
            To Serve
          </label>
          <div className="flex flex-wrap gap-2">
            {TO_SERVE.map((svc) => {
              const selected = form.toServe?.includes(svc) ?? false;
              return (
                <Button
                  key={svc}
                  type="button"
                  variant="soft"
                  size="sm"
                  active={selected}
                  onClick={() =>
                    update(
                      "toServe",
                      selected
                        ? (form.toServe ?? []).filter((s) => s !== svc)
                        : [...(form.toServe ?? []), svc]
                    )
                  }
                  className={selected ? "!text-white" : "!text-black"}
                >
                  {svc}
                </Button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-900">
            Place Of Service
          </label>
          <div className="flex flex-wrap gap-2">
            {PLACE_OF_SERVICE.map((svc) => {
              const selected = form.placeOfService?.includes(svc) ?? false;
              return (
                <Button
                  key={svc}
                  type="button"
                  variant="soft"
                  size="sm"
                  active={selected}
                  onClick={() =>
                    update(
                      "placeOfService",
                      selected
                        ? (form.placeOfService ?? []).filter((s) => s !== svc)
                        : [...(form.placeOfService ?? []), svc]
                    )
                  }
                  className={selected ? "!text-white" : "!text-black"}
                >
                  {svc}
                </Button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border-2 border-gray-300 p-4 sm:p-5">
        <h3 className="text-lg font-bold text-gray-950">Service Rates</h3>
        <p className="text-sm text-gray-900">
          Enter rates in INR. These values are saved with the profile and shown
          on the public profile page.
        </p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-950">
              <tr>
                <th className="px-4 py-3 font-semibold">Duration</th>
                <th className="px-4 py-3 font-semibold">Incall Rate</th>
                <th className="px-4 py-3 font-semibold">Outcall Rate</th>
              </tr>
            </thead>
            <tbody>
              {(form.serviceRates ?? DEFAULT_SERVICE_RATES).map((rate, i) => (
                <tr key={rate.duration} className="border-t border-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-950">
                    {rate.duration}
                  </td>
                  <td className="px-4 py-3">
                    <TextInput
                      type="number"
                      value={rate.incall}
                      onChange={(e) => updateRate(i, "incall", e.target.value)}
                      className="!w-28"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <TextInput
                      type="number"
                      value={rate.outcall}
                      onChange={(e) => updateRate(i, "outcall", e.target.value)}
                      className="!w-28"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border-2 border-gray-300 p-4 sm:p-5">
        <h3 className="text-lg font-bold text-gray-950">Contact</h3>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-900">
            Phone <span className="text-gray-600">*</span>
          </label>
          <TextInput
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="Contact number"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-900">
            WhatsApp <span className="text-gray-600">*</span>
          </label>
          <TextInput
            value={form.whatsapp}
            onChange={(e) => update("whatsapp", e.target.value)}
            placeholder="WhatsApp number"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-900">
            Telegram
          </label>
          <TextInput
            value={form.telegram}
            onChange={(e) => update("telegram", e.target.value)}
            placeholder="Telegram username (optional)"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border-2 border-gray-300 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-950">Images</h3>
          <span className="text-xs font-semibold text-gray-800">
            {form.images.length}/{MAX_IMAGES} uploaded
          </span>
        </div>

        <FileInput
          type="file"
          accept="image/*"
          multiple
          disabled={imageUploading || form.images.length >= MAX_IMAGES}
          onChange={onImageChange}
          className="file:!text-white disabled:cursor-not-allowed disabled:opacity-60"
        />

        {/* Upload Loading Progress Bar */}
        {imageUploading && (
          <div className="mt-3 space-y-2 rounded-2xl border border-gray-200 bg-gray-50/90 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-950">
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin text-gray-700"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                <span>
                  Uploading {uploadingCount > 1 ? `${uploadingCount} images` : "image"}...
                </span>
              </span>
              <span className="font-mono font-bold text-gray-800">
                {Math.round(uploadProgress)}%
              </span>
            </div>

            {/* Visual Progress Bar Track & Indicator */}
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gray-600 to-gray-800 transition-all duration-300 ease-out"
                style={{ width: `${Math.max(6, Math.min(100, uploadProgress))}%` }}
              />
            </div>

            <p className="text-[11px] text-gray-700">
              {uploadProgress < 30
                ? "Compressing image..."
                : uploadProgress < 95
                ? "Uploading to server..."
                : "Finalizing upload..."}
            </p>
          </div>
        )}
        {form.images.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {form.images.map((src, i) => (
              <div
                key={i}
                className="relative h-40 overflow-hidden rounded-[1rem] bg-gray-50 sm:h-48"
              >
                <Image
                  src={src}
                  alt={`Preview ${i + 1}`}
                  fill
                  className="object-contain"
                  sizes="(min-width: 640px) 33vw, 50vw"
                />
                <button
                  type="button"
                  onClick={() => onRemoveImage(i)}
                  aria-label="Remove image"
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 !text-white hover:bg-red-700 font-bold text-xs shadow-md transition cursor-pointer"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {formError && (
        <p className="text-sm font-medium text-gray-700" role="alert">
          {formError}
        </p>
      )}

      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="terms-accepted"
          name="termsAccepted"
          checked={form.termsAccepted ?? false}
          onChange={(e) => update("termsAccepted", e.target.checked)}
          required
          className="mt-1 h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-500"
        />
        <label htmlFor="terms-accepted" className="text-sm text-gray-900">
          I agree to the{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">
            Terms and Conditions
          </a>{" "}
          <span className="text-gray-600">*</span>
        </label>
      </div>

      <Button type="submit" variant="solid" fullWidth disabled={formLoading || imageUploading} className="!text-white">
        {formLoading
          ? "Saving..."
          : imageUploading
          ? "Uploading Images..."
          : editingId
          ? "Update Ad"
          : hasExistingFreeAd
          ? "Create Ad & Choose Promotion →"
          : "Post Free Ad"}
      </Button>
    </form>
  );
}
