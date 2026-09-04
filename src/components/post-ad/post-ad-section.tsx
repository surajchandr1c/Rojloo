"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Button from "@/components/ui/button";
import { TextInput, TextArea, Select, FileInput } from "@/components/ui/field";
import { cityPlaces } from "@/lib/places";
import { SERVICES, TO_SERVE, PLACE_OF_SERVICE, DEFAULT_SERVICE_RATES, type AdForm } from "./types";

type CityOption = { name: string; slug: string };

type StateOption = { name: string; slug: string };
type LocalAreaOption = { name: string; slug: string };

export default function PostAdSection({
  form,
  setForm,
  formError,
  formLoading,
  editingId,
  onImageChange,
  onRemoveImage,
  onSubmit,
}: {
  form: AdForm;
  setForm: React.Dispatch<React.SetStateAction<AdForm>>;
  formError: string;
  formLoading: boolean;
  editingId: string | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const [stateOptions, setStateOptions] = useState<StateOption[]>([]);
  const [cityOptions, setCityOptions] = useState<CityOption[]>(cityPlaces);
  const [localAreaOptions, setLocalAreaOptions] = useState<LocalAreaOption[]>([]);

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
          setCityOptions(
            data.cities.map((c: { name: string; slug: string }) => ({
              name: c.name,
              slug: c.slug,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

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

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="space-y-4 rounded-2xl border-2 border-red-300 p-5">
        <h3 className="text-lg font-bold text-red-950">Personal Information</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-red-900">
              Name <span className="text-red-600">*</span>
            </label>
            <TextInput
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Your name"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-red-900">
              Age
            </label>
            <TextInput
              type="number"
              value={form.age ?? ""}
              onChange={(e) => update("age", e.target.value)}
              placeholder="Your age"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-red-900">
            Title <span className="text-red-600">*</span>
          </label>
          <TextInput
            value={form.title ?? ""}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Give title"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-red-900">
            About <span className="text-red-600">*</span>
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

      <section className="space-y-4 rounded-2xl border-2 border-red-300 p-5">
        <h3 className="text-lg font-bold text-red-950">Location</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-red-900">
              State
            </label>
            {stateOptions.length > 0 ? (
              <Select
                value={form.state ?? ""}
                onChange={(e) => update("state", e.target.value)}
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
                onChange={(e) => update("state", e.target.value)}
                placeholder="State"
              />
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-red-900">
              City <span className="text-red-600">*</span>
            </label>
            <Select
              value={form.city}
              onChange={(e) => {
                update("city", e.target.value);
                update("localArea", "");
                setLocalAreaOptions([]);
              }}
            >
              <option value="">Select a city</option>
              {cityOptions.map((c) => (
                <option key={c.slug} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-red-900">
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
            <label className="mb-1 block text-sm font-medium text-red-900">
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

      <section className="space-y-4 rounded-2xl border-2 border-red-300 p-5">
        <h3 className="text-lg font-bold text-red-950">Services</h3>
        <div>
          <label className="mb-1 block text-sm font-medium text-red-900">
            Service <span className="text-red-600">*</span>
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
          <label className="mb-1 block text-sm font-medium text-red-900">
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
          <label className="mb-1 block text-sm font-medium text-red-900">
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

      <section className="space-y-4 rounded-2xl border-2 border-red-300 p-5">
        <h3 className="text-lg font-bold text-red-950">Service Rates</h3>
        <p className="text-sm text-red-900">
          Enter rates in INR. These values are saved with the profile and shown
          on the public profile page.
        </p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-red-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-pink-50 text-red-950">
              <tr>
                <th className="px-4 py-3 font-semibold">Duration</th>
                <th className="px-4 py-3 font-semibold">Incall Rate</th>
                <th className="px-4 py-3 font-semibold">Outcall Rate</th>
              </tr>
            </thead>
            <tbody>
              {(form.serviceRates ?? DEFAULT_SERVICE_RATES).map((rate, i) => (
                <tr key={rate.duration} className="border-t border-red-50">
                  <td className="px-4 py-3 font-medium text-red-950">
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

      <section className="space-y-4 rounded-2xl border-2 border-red-300 p-5">
        <h3 className="text-lg font-bold text-red-950">Contact</h3>
        <div>
          <label className="mb-1 block text-sm font-medium text-red-900">
            Phone <span className="text-red-600">*</span>
          </label>
          <TextInput
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="Contact number"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-red-900">
            WhatsApp <span className="text-red-600">*</span>
          </label>
          <TextInput
            value={form.whatsapp}
            onChange={(e) => update("whatsapp", e.target.value)}
            placeholder="WhatsApp number"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-red-900">
            Telegram
          </label>
          <TextInput
            value={form.telegram}
            onChange={(e) => update("telegram", e.target.value)}
            placeholder="Telegram username (optional)"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border-2 border-red-300 p-5">
        <h3 className="text-lg font-bold text-red-950">Images</h3>
        <FileInput
          type="file"
          accept="image/*"
          multiple
          onChange={onImageChange}
          className="file:!text-white"
        />
        {form.images.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {form.images.map((src, i) => (
              <div
                key={i}
                className="relative h-40 overflow-hidden rounded-[1rem] bg-pink-50 sm:h-48"
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
                  className="absolute right-1 top-1 rounded-full bg-red-950/70 px-2 py-1 text-xs font-semibold !text-black"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {formError && (
        <p className="text-sm font-medium text-red-700" role="alert">
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
          className="mt-1 h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
        />
        <label htmlFor="terms-accepted" className="text-sm text-red-900">
          I agree to the{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-red-700">
            Terms and Conditions
          </a>{" "}
          <span className="text-red-600">*</span>
        </label>
      </div>

      <Button type="submit" variant="solid" fullWidth disabled={formLoading} className="!text-white">
        {formLoading ? "Saving..." : editingId ? "Update Ad" : "Post Ad"}
      </Button>
    </form>
  );
}
