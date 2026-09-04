"use client";

import { formatDisplayDate } from "@/lib/date";
import type { ProfileUser } from "./types";

export default function ProfileSection({
  profile,
}: {
  profile: ProfileUser | null;
}) {
  return (
    <section className="rounded-[1.75rem] bg-white p-6 sm:p-8">
      <div className="mt-6 space-y-4">
        <div className="rounded-2xl bg-pink-50 p-4">
          <p className="text-sm font-semibold text-red-700">Name</p>
          <p className="mt-1 font-semibold text-red-950">
            {profile?.name ?? "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-pink-50 p-4">
          <p className="text-sm font-semibold text-red-700">Email</p>
          <p className="mt-1 font-semibold text-red-950">
            {profile?.email ?? "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-pink-50 p-4">
          <p className="text-sm font-semibold text-red-700">Service</p>
          <p className="mt-1 font-semibold text-red-950">
            {profile?.service ?? "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-pink-50 p-4">
          <p className="text-sm font-semibold text-red-700">Member Since</p>
          <p className="mt-1 font-semibold text-red-950">
            {profile?.createdAt ? formatDisplayDate(profile.createdAt) : "—"}
          </p>
        </div>
      </div>
    </section>
  );
}
