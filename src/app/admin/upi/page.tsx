"use client";

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { useAdminContext } from "@/components/admin/use-admin-context";
import { Eyebrow } from "@/components/ui/eyebrow";
import { AdminUpiCardsSkeleton } from "@/components/skeletons/admin-skeletons";

type UPI = {
  _id?: string;
  upiId: string;
  name: string;
  qrCode: string;
  active?: boolean;
  createdAt?: string | Date;
};

export default function AdminUPI() {
  const me = useAdminContext();
  const [upis, setUpis] = useState<UPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form State
  const [upiId, setUpiId] = useState("");
  const [name, setName] = useState("");
  const [activeStatus, setActiveStatus] = useState(true);
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [qrCodePreview, setQrCodePreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadRef = useRef(0);

  useEffect(() => {
    loadUPIs();
  }, []);

  async function loadUPIs() {
    const loadId = ++loadRef.current;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/upi", {
        credentials: "include",
        cache: "no-store",
      });

      if (loadId !== loadRef.current) return;

      if (!res.ok) {
        if (res.status === 401) {
          setError("Session expired. Please log in again.");
        } else {
          const errData = await res.json().catch(() => ({}));
          setError(errData.error || "Failed to load UPIs.");
        }
        return;
      }

      const data = await res.json();
      const list: UPI[] = Array.isArray(data.upis) ? data.upis : [];

      // Deduplicate received list by _id and lowercase upiId to ensure 100% unique keys
      const seenIds = new Set<string>();
      const seenUpiIds = new Set<string>();
      const cleanList: UPI[] = [];

      for (const item of list) {
        const uId = (item.upiId || "").trim().toLowerCase();
        const idKey = (item._id || "").trim();

        if (uId && seenUpiIds.has(uId)) continue;
        if (idKey && seenIds.has(idKey)) continue;

        if (uId) seenUpiIds.add(uId);
        if (idKey) seenIds.add(idKey);
        cleanList.push(item);
      }

      setUpis(cleanList);
    } catch (err) {
      if (loadId === loadRef.current) {
        setError("Failed to load UPIs.");
        console.error(err);
      }
    } finally {
      if (loadId === loadRef.current) {
        setLoading(false);
      }
    }
  }

  function handleQrCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setQrCodeFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setQrCodePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleEdit(upi: UPI) {
    setEditingId(upi._id || upi.upiId);
    setUpiId(upi.upiId);
    setName(upi.name);
    setActiveStatus(upi.active !== false);
    setQrCodePreview(upi.qrCode || "");
    setQrCodeFile(null);
    setError("");
    setSuccessMsg("");

    // Reset file input element if any
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Scroll to the edit form smoothly
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancel() {
    setEditingId(null);
    setUpiId("");
    setName("");
    setActiveStatus(true);
    setQrCodeFile(null);
    setQrCodePreview("");
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("upiId", upiId.trim());
      formData.append("name", name.trim());
      formData.append("active", String(activeStatus));

      if (qrCodeFile) {
        formData.append("qrCode", qrCodeFile);
      }
      if (editingId) {
        formData.append("id", editingId);
      }

      const res = await fetch("/api/admin/upi", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Failed to save UPI.");
        return;
      }

      setSuccessMsg(
        editingId ? "UPI account updated successfully!" : "New UPI account added successfully!"
      );
      handleCancel();
      await loadUPIs();
    } catch (err) {
      setError("Failed to save UPI.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string | undefined, nameOrUpi: string) {
    if (!id) return;
    if (!confirm(`Are you sure you want to delete UPI "${nameOrUpi}"?`)) return;

    setError("");
    setSuccessMsg("");

    // Optimistically update list
    setUpis((prev) => prev.filter((u) => u._id !== id && u.upiId !== id));

    try {
      const res = await fetch("/api/admin/upi", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
        credentials: "include",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to delete UPI.");
        await loadUPIs();
        return;
      }

      setSuccessMsg("UPI deleted successfully.");
      await loadUPIs();
    } catch (err) {
      setError("Failed to delete UPI.");
      console.error(err);
      await loadUPIs();
    }
  }

  async function handleToggleActive(upi: UPI) {
    const targetId = upi._id || upi.upiId;
    if (!targetId) return;

    const newActive = !(upi.active !== false);
    setTogglingId(targetId);
    setError("");
    setSuccessMsg("");

    // Optimistic UI toggle
    setUpis((prev) =>
      prev.map((u) =>
        (u._id === targetId || u.upiId === targetId)
          ? { ...u, active: newActive }
          : u
      )
    );

    try {
      const res = await fetch("/api/admin/upi", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: targetId,
          active: newActive,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to change UPI status.");
        await loadUPIs();
        return;
      }

      setSuccessMsg(
        newActive
          ? `"${upi.name || upi.upiId}" marked as Active.`
          : `"${upi.name || upi.upiId}" marked as Inactive.`
      );
    } catch (err) {
      setError("Failed to change UPI status.");
      console.error(err);
      await loadUPIs();
    } finally {
      setTogglingId(null);
    }
  }

  if (!me || !me.authenticated) return null;

  return (
    <main className="flex-1 overflow-auto min-w-0">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <Eyebrow>Management</Eyebrow>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black text-gray-950">
            UPI Management ({upis.length})
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Add, edit, activate/deactivate, and delete UPI payment IDs used for platform transactions.
          </p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800 flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="text-rose-600 hover:text-rose-900 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {successMsg && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 flex items-center justify-between">
            <span>{successMsg}</span>
            <button
              type="button"
              onClick={() => setSuccessMsg("")}
              className="text-emerald-600 hover:text-emerald-900 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        <div className="space-y-8">
          {/* Add / Edit UPI Form */}
          <div className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-7 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-950 flex items-center gap-2">
                  <span>{editingId ? "Edit UPI Account" : "Add New UPI Account"}</span>
                  {editingId && (
                    <span className="rounded-lg bg-blue-100 text-blue-800 px-2 py-0.5 text-xs font-semibold">
                      Editing Mode
                    </span>
                  )}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingId
                    ? "Update account details, QR code, and active state."
                    : "Configure a new UPI ID to accept user payments."}
                </p>
              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    UPI ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. merchant@okhdfcbank"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-950 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    Account Name / Label <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Primary HDFC UPI"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-950 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">
                  QR Code Image {editingId ? "(Optional: upload to replace current image)" : "(Optional)"}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleQrCodeChange}
                  className="block w-full text-xs text-gray-700 file:mr-3 file:rounded-xl file:border-0 file:bg-gray-100 file:px-3.5 file:py-2 file:text-xs file:font-bold file:text-gray-900 hover:file:bg-gray-200 cursor-pointer"
                />

                {qrCodePreview && (
                  <div className="mt-3 flex items-center gap-4 p-3 rounded-2xl bg-gray-50 border border-gray-200 max-w-sm">
                    <div className="relative h-24 w-24 rounded-xl border border-gray-200 bg-white overflow-hidden shrink-0">
                      <Image
                        src={qrCodePreview}
                        alt="QR Preview"
                        width={96}
                        height={96}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">
                        {qrCodeFile ? "New Image Selected" : "Current QR Image"}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {qrCodeFile ? qrCodeFile.name : "Will be displayed to customers"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="activeCheckbox"
                  type="checkbox"
                  checked={activeStatus}
                  onChange={(e) => setActiveStatus(e.target.checked)}
                  className="h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                />
                <label htmlFor="activeCheckbox" className="text-xs font-bold text-gray-800 cursor-pointer select-none">
                  Enable this UPI for customer payments (Active)
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-black disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : editingId ? (
                    "Update UPI Account"
                  ) : (
                    "+ Add UPI Account"
                  )}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Existing UPIs Cards List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-950">
                Existing UPI Accounts ({upis.length})
              </h2>
              <span className="text-xs text-gray-500">
                {upis.filter((u) => u.active !== false).length} active
              </span>
            </div>

            {loading ? (
              <AdminUpiCardsSkeleton />
            ) : upis.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center">
                <p className="text-base font-bold text-gray-900">No UPI accounts found</p>
                <p className="mt-1 text-xs text-gray-500">
                  Use the form above to add your first payment UPI ID.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upis.map((upi, index) => {
                  const isActive = upi.active !== false;
                  // Form a guaranteed unique key for React reconciliation
                  const keyString = upi._id
                    ? `upi-id-${upi._id}-${index}`
                    : `upi-fallback-${index}-${upi.upiId}`;

                  return (
                    <div
                      key={keyString}
                      className={`flex flex-col justify-between gap-4 rounded-3xl border p-5 sm:p-6 transition shadow-sm ${
                        isActive
                          ? "border-gray-200 bg-white hover:border-gray-300"
                          : "border-gray-200 bg-gray-50/70 opacity-80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-gray-950 truncate">
                              {upi.name}
                            </h3>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isActive
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-gray-200 text-gray-700"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isActive ? "bg-emerald-600" : "bg-gray-400"
                                }`}
                              />
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </div>

                          <p className="mt-1 text-xs font-semibold text-blue-700 break-all bg-blue-50/60 p-2 rounded-xl border border-blue-100/60">
                            {upi.upiId}
                          </p>
                        </div>

                        {upi.qrCode && (
                          <div className="relative h-20 w-20 rounded-2xl border border-gray-200 bg-white p-1 overflow-hidden shrink-0">
                            <Image
                              src={upi.qrCode}
                              alt={`QR Code for ${upi.upiId}`}
                              width={80}
                              height={80}
                              className="h-full w-full object-contain"
                            />
                          </div>
                        )}
                      </div>

                      {/* Action Controls */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 mt-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(upi)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-gray-50 px-3.5 py-1.5 text-xs font-bold text-gray-800 shadow-2xs transition hover:bg-gray-200"
                            title="Edit this UPI"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(upi._id || upi.upiId, upi.name || upi.upiId)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 shadow-2xs transition hover:bg-rose-100 hover:text-rose-800"
                            title="Delete this UPI"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Delete</span>
                          </button>
                        </div>

                        {/* Active / Inactive Toggle Button */}
                        <button
                          type="button"
                          disabled={togglingId === (upi._id || upi.upiId)}
                          onClick={() => handleToggleActive(upi)}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition shadow-2xs ${
                            isActive
                              ? "border border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200"
                          } disabled:opacity-50`}
                          title={`Click to mark as ${isActive ? "Inactive" : "Active"}`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isActive ? "bg-emerald-500" : "bg-gray-400"
                            }`}
                          />
                          <span>{isActive ? "Active" : "Inactive"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
