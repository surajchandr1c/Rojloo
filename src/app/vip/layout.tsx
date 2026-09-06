"use client";

import { VipProvider } from "@/components/vip/vip-context";
import VipLayoutContent from "@/components/vip/vip-layout-content";

export default function VipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <VipProvider>
      <VipLayoutContent>{children}</VipLayoutContent>
    </VipProvider>
  );
}
