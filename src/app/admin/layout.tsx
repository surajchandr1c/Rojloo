"use client";

import { AdminProvider } from "@/components/admin/admin-context";
import AdminLayoutContent from "@/components/admin/admin-layout-content";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminProvider>
  );
}
