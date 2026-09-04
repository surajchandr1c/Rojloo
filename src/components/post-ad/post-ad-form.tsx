"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import { SectionPanel } from "@/components/ui/card";
import PostAdSection from "./post-ad-section";
import { useAuthGuard } from "./use-auth-guard";
import { SERVICES, MAX_IMAGES, DEFAULT_SERVICE_RATES, type AdForm, type Ad } from "./types";
import { uploadImage } from "@/lib/compress";

const emptyForm: AdForm = {
  name: "",
  title: "",
  age: "",
  category: SERVICES[0],
  toServe: [],
  placeOfService: [],
  state: "",
  city: "",
  pincode: "",
  phone: "",
  whatsapp: "",
  telegram: "",
  about: "",
  images: [],
  serviceRates: DEFAULT_SERVICE_RATES,
  termsAccepted: false,
};

export default function PostAdForm({ adId }: { adId?: string }) {
  const router = useRouter();
  const ready = useAuthGuard();
  const [form, setForm] = useState<AdForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(adId ?? null);

  useEffect(() => {
    if (!adId) return;
    fetch("/api/ads")
      .then((r) => r.json())
      .then((data) => {
        const ad = (data.ads ?? []).find((a: Ad) => a._id === adId);
        if (ad) {
          setForm({
            name: ad.name,
            title: ad.title ?? "",
            age: ad.age ?? "",
            category: ad.category,
            toServe: ad.toServe ?? [],
            placeOfService: ad.placeOfService ?? [],
            state: ad.state ?? "",
            city: ad.city,
            pincode: ad.pincode ?? "",
            phone: ad.phone,
            whatsapp: ad.whatsapp ?? "",
            telegram: ad.telegram ?? "",
            about: ad.about ?? "",
            images: ad.images ?? [],
            serviceRates: ad.serviceRates ?? DEFAULT_SERVICE_RATES,
            termsAccepted: false,
          });
          setEditingId(ad._id ?? null);
        }
      })
      .catch(() => {});
  }, [adId]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(
      0,
      MAX_IMAGES - form.images.length
    );
    if (files.length === 0) {
      e.target.value = "";
      return;
    }

    setFormLoading(true);
    try {
      const urls = await Promise.all(
        files.map((file) => uploadImage(file).catch(() => null))
      );
      setForm((prev) => ({
        ...prev,
        images: [
          ...prev.images,
          ...urls.filter((u): u is string => typeof u === "string"),
        ].slice(0, MAX_IMAGES),
      }));
    } catch {
      setFormError("Failed to upload one or more images.");
    } finally {
      setFormLoading(false);
    }
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    
    if (!form.termsAccepted) {
      setFormError("You must agree to the Terms and Conditions to continue.");
      return;
    }

    setFormLoading(true);

    const payload = { ...form, id: editingId ?? undefined };

    try {
      const res = await fetch("/api/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Something went wrong.");
        setFormLoading(false);
        return;
      }

      router.push("/post-ad/your-ads");
    } catch {
      setFormError("Network error. Please try again.");
      setFormLoading(false);
    }
  };

  if (!ready) return null;

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <SectionPanel>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-black text-red-950 sm:text-4xl">
            {editingId ? "Edit Ad" : "Post Ad"}
          </h1>
          <Button
            variant="soft"
            onClick={() => router.push("/post-ad")}
            className="!text-black"
          >
            Back
          </Button>
        </div>

        <div className="mt-8">
          <PostAdSection
            form={form}
            setForm={setForm}
            formError={formError}
            formLoading={formLoading}
            editingId={editingId}
            onImageChange={handleImageChange}
            onRemoveImage={removeImage}
            onSubmit={handleSubmit}
          />
        </div>
      </SectionPanel>
    </main>
  );
}
