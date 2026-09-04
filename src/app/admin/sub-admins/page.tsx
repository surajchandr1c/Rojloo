"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminContext } from "@/components/admin/use-admin-context";
import { formatDisplayDateTime } from "@/lib/date";

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
    if (!confirm("Delete this sub-admin?")) return;
    await fetch("/api/admin/subadmins", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <main className="p-6 sm:p-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-black text-red-950">Sub Admin List</h1>
        <button
          type="button"
          onClick={() => router.push("/admin/admin-control")}
          className="rounded-full bg-[#450a0a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7f1d1d]"
        >
          Add Sub Admin
        </button>
      </div>
      <p className="mt-2 text-red-900">
        All sub-admins created by the main admin.
      </p>

      {loading ? (
        <p className="mt-6 text-red-900">Loading...</p>
      ) : admins.length === 0 ? (
        <p className="mt-6 text-red-900">No sub-admins found.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-red-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-pink-50 text-red-950">
              <tr>
                <th className="px-4 py-4 font-semibold">Email</th>
                <th className="px-4 py-4 font-semibold">Access</th>
                <th className="px-4 py-4 font-semibold">Last Login</th>
                <th className="px-4 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin._id} className="border-t border-red-50">
                  <td className="px-4 py-4 font-medium text-red-950">
                    {admin.email}
                  </td>
                  <td className="px-4 py-4 text-red-900">
                    {admin.permissions.length === 0
                      ? "—"
                      : admin.permissions.join(", ")}
                  </td>
                  <td className="px-4 py-4 text-red-900">
                    {admin.lastLogin ? formatDisplayDateTime(admin.lastLogin) : "Never"}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => remove(admin._id)}
                      className="rounded-full bg-[#450a0a] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#7f1d1d]"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
