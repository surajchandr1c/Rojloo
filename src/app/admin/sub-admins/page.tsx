"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminContext } from "@/components/admin/use-admin-context";
import { formatDisplayDateTime } from "@/lib/date";
import { AdminTableSkeleton } from "@/components/skeletons/admin-skeletons";
import {
  SUBADMIN_PERMISSION_OPTIONS,
  PERMISSION_LABELS_MAP,
} from "@/lib/constants/subadmin-permissions";

type SubAdminRow = {
  _id: string;
  email: string;
  permissions: string[];
  lastLogin: string | null;
  createdAt: string;
};

export default function SubAdminList() {
  const router = useRouter();
  const me = useAdminContext();
  const [admins, setAdmins] = useState<SubAdminRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Access Modal state
  const [editingAdmin, setEditingAdmin] = useState<SubAdminRow | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/subadmins").then((r) => r.json());
      setAdmins(res.admins ?? []);
    } catch {
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (me && me.authenticated && me.role !== "main") {
      router.replace("/admin");
      return;
    }
    if (me && me.authenticated && me.role === "main") {
      queueMicrotask(() => load());
    }
  }, [me, router, load]);

  if (!me || !me.authenticated) return null;

  async function remove(id: string) {
    if (!confirm("Are you sure you want to delete this sub-admin?")) return;
    try {
      const res = await fetch("/api/admin/subadmins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setAdmins((prev) => prev.filter((a) => a._id !== id));
      }
    } catch {
      // Reload on failure
      load();
    }
  }

  function openEditModal(admin: SubAdminRow) {
    setEditingAdmin(admin);
    setEditPermissions([...(admin.permissions || [])]);
    setEditPassword("");
    setShowEditPassword(false);
    setEditError(null);
    setEditSuccess(null);
  }

  function closeEditModal() {
    if (editSaving) return;
    setEditingAdmin(null);
    setEditError(null);
    setEditSuccess(null);
  }

  function toggleEditPermission(key: string) {
    setEditPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function selectAllPermissions() {
    setEditPermissions(SUBADMIN_PERMISSION_OPTIONS.map((opt) => opt.key));
  }

  function deselectAllPermissions() {
    setEditPermissions([]);
  }

  async function handleSavePermissions(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAdmin) return;

    setEditSaving(true);
    setEditError(null);
    setEditSuccess(null);

    try {
      const payload: { id: string; permissions: string[]; password?: string } = {
        id: editingAdmin._id,
        permissions: editPermissions,
      };

      if (editPassword.trim()) {
        if (editPassword.trim().length < 6) {
          setEditError("Password must be at least 6 characters.");
          setEditSaving(false);
          return;
        }
        payload.password = editPassword.trim();
      }

      const res = await fetch("/api/admin/subadmins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setEditError(data?.error || "Failed to update sub-admin access.");
        return;
      }

      // Update state locally for immediate feedback
      setAdmins((prev) =>
        prev.map((a) =>
          a._id === editingAdmin._id
            ? { ...a, permissions: editPermissions }
            : a
        )
      );

      setEditSuccess("Permissions updated successfully!");
      setTimeout(() => {
        setEditingAdmin(null);
      }, 700);
    } catch {
      setEditError("Network error. Please try again.");
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-950">
            Sub Admin List ({admins.length})
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage sub-admins and customize their section access permissions in the admin panel.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/admin/admin-control")}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-black"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Sub Admin</span>
        </button>
      </div>

      {/* Main Table */}
      {loading ? (
        <AdminTableSkeleton
          headers={["Email", "Assigned Access", "Last Login", "Actions"]}
          minWidth="min-w-[650px]"
        />
      ) : admins.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-base font-bold text-gray-900">No sub-admins found</p>
          <p className="mt-1 text-xs text-gray-500">
            Click &ldquo;Add Sub Admin&rdquo; above to create your first sub-admin with custom access permissions.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/80 text-gray-950">
              <tr>
                <th className="px-5 py-4 font-bold">Email</th>
                <th className="px-5 py-4 font-bold">Assigned Access</th>
                <th className="px-5 py-4 font-bold">Last Login</th>
                <th className="px-5 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {admins.map((admin) => (
                <tr key={admin._id} className="hover:bg-gray-50/50 transition">
                  <td className="px-5 py-4 font-semibold text-gray-950">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xs font-bold text-blue-800">
                        {admin.email.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="truncate max-w-[220px]" title={admin.email}>
                        {admin.email}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-gray-900">
                    {admin.permissions.length === 0 ? (
                      <span className="inline-block rounded-lg bg-gray-100 px-2.5 py-1 text-xs italic text-gray-500">
                        No access granted
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-w-xl">
                        {admin.permissions.map((p) => (
                          <span
                            key={p}
                            className="inline-flex items-center rounded-lg bg-blue-50/90 border border-blue-200 px-2 py-0.5 text-[11px] font-bold text-blue-900"
                          >
                            {PERMISSION_LABELS_MAP[p] || p}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-600">
                    {admin.lastLogin ? formatDisplayDateTime(admin.lastLogin) : "Never logged in"}
                  </td>

                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(admin)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
                        title="Edit sub-admin panel access"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit Access</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => remove(admin._id)}
                        className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700"
                        title="Delete sub-admin"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Access Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-gray-100 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-950 flex items-center gap-2">
                  <span>Edit Sub-Admin Access</span>
                  <span className="rounded-lg bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-900">
                    {editPermissions.length} / {SUBADMIN_PERMISSION_OPTIONS.length} active
                  </span>
                </h2>
                <p className="mt-1 text-xs text-gray-600">
                  Select which admin sections <strong className="text-gray-900 font-semibold">{editingAdmin.email}</strong> is allowed to access.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                disabled={editSaving}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Permissions List */}
            <form onSubmit={handleSavePermissions} className="flex flex-col flex-1 min-h-0 pt-4 space-y-5">
              {/* Quick Select Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 p-2.5 rounded-2xl border border-gray-200/80">
                <span className="text-xs font-bold text-gray-700 ml-1">
                  Panel Permissions:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllPermissions}
                    className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-bold text-gray-800 transition hover:bg-gray-100 shadow-2xs"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllPermissions}
                    className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-bold text-gray-800 transition hover:bg-gray-100 shadow-2xs"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Checkboxes Grid */}
              <div className="overflow-y-auto max-h-[46vh] pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {SUBADMIN_PERMISSION_OPTIONS.map((opt) => {
                    const isChecked = editPermissions.includes(opt.key);
                    return (
                      <label
                        key={opt.key}
                        className={`flex items-center gap-3 p-3 rounded-2xl border text-xs font-semibold cursor-pointer transition select-none ${
                          isChecked
                            ? "bg-blue-50/90 border-blue-300 text-blue-950 shadow-2xs"
                            : "bg-gray-50/60 border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-950"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleEditPermission(opt.key)}
                          className="h-4 w-4 rounded accent-blue-600 text-blue-600 shrink-0"
                        />
                        <span className="truncate">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Optional: Password Reset Field */}
              <div className="border-t border-gray-100 pt-3">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  New Password <span className="font-normal text-gray-500">(Optional: leave blank to keep unchanged)</span>
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    value={editPassword}
                    placeholder="Enter at least 6 characters..."
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 pr-12 text-xs text-gray-900 outline-none focus:border-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-xs text-gray-500 hover:text-gray-800"
                  >
                    {showEditPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Error and Success Messages */}
              {editError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                  {editError}
                </div>
              )}
              {editSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                  {editSuccess}
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={editSaving}
                  className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={editSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {editSaving ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
