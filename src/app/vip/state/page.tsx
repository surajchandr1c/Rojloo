"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useVipContext } from "@/components/vip/use-vip-context";
import { AdminTableSkeleton } from "@/components/skeletons/admin-skeletons";

type StateItem = {
  name: string;
  slug: string;
};

export default function VipStatePage() {
  const router = useRouter();
  const me = useVipContext();
  const [states, setStates] = useState<StateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (me === null) return;
    if (!me.authenticated) {
      if (typeof window !== "undefined") {
        window.location.replace("/vip/login");
      } else {
        router.replace("/vip/login");
      }
      return;
    }
    // If VIP does not have state access, redirect to dashboard
    if (!me.hasStateAccess && me.role !== "admin") {
      router.replace("/vip");
      return;
    }

    fetch("/api/vip/states", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setStates(Array.isArray(data.states) ? data.states : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [me, router]);

  if (!me || !me.authenticated) return null;

  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-950">Assigned States</h1>
          <p className="mt-2 text-gray-900">
            States assigned to your VIP account (Read-Only Access).
          </p>
        </div>
        <span className="rounded-full bg-gray-100 px-3.5 py-1.5 text-xs font-bold text-gray-900 border border-gray-200">
          {states.length} {states.length === 1 ? "State" : "States"}
        </span>
      </div>

      {loading ? (
        <div className="mt-6">
          <AdminTableSkeleton
            headers={["State Name", "Slug", "Access Level"]}
            rowCount={4}
            minWidth="min-w-[500px]"
          />
        </div>
      ) : states.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-900">
          No states assigned to your account.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-100 bg-white">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-950">
              <tr>
                <th className="px-5 py-4 font-semibold">State Name</th>
                <th className="px-5 py-4 font-semibold">Slug</th>
                <th className="px-5 py-4 text-right font-semibold">Access Level</th>
              </tr>
            </thead>
            <tbody>
              {states.map((st) => (
                <tr key={st.slug || st.name} className="border-t border-gray-50">
                  <td className="px-5 py-4 font-bold text-gray-950">{st.name}</td>
                  <td className="px-5 py-4 font-mono text-xs text-gray-700">{st.slug}</td>
                  <td className="px-5 py-4 text-right">
                    <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-900">
                      Full State Control
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
