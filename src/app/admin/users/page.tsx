"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminTableSkeleton } from "@/components/skeletons/admin-skeletons";

type User = {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  coins?: number;
  adCount?: number;
  createdAt: string | Date;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users").then((r) => r.json());
      setUsers(res.users ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function remove(id?: string) {
    if (!id) return;
    if (!confirm("Delete this user?")) return;
    await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0">
      <h1 className="text-3xl font-black text-red-950">Users</h1>
      <p className="mt-2 text-red-900">Manage registered users.</p>

      {loading ? (
        <AdminTableSkeleton
          headers={["Name", "Email", "Phone", "Coins", "Actions", "Ads"]}
          minWidth="min-w-[600px]"
        />
      ) : users.length === 0 ? (
        <p className="mt-6 text-red-900">No users found.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-red-100 bg-white">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-pink-50 text-red-950">
              <tr>
                <th className="px-4 py-4 font-semibold">Name</th>
                <th className="px-4 py-4 font-semibold">Email</th>
                <th className="px-4 py-4 font-semibold">Phone</th>
                <th className="px-4 py-4 font-semibold">Coins</th>
                <th className="px-4 py-4 font-semibold">Actions</th>
                <th className="px-4 py-4 text-right font-semibold">Ads</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} className="border-t border-red-50">
                  <td className="px-4 py-4 font-medium text-red-950">
                    {user.name}
                  </td>
                  <td className="px-4 py-4 text-red-900">{user.email}</td>
                  <td className="px-4 py-4 text-red-900">
                    {user.phone ?? "—"}
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                      {Number(user.coins ?? 0)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => remove(user._id)}
                      className="rounded-full bg-[#450a0a] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#7f1d1d]"
                    >
                      Delete
                    </button>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="rounded-full bg-pink-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                      {user.adCount ?? 0} ads
                    </span>
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
