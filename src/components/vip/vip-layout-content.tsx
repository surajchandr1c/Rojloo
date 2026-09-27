"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import VipSidebar from "./vip-sidebar";
import { useVipContext } from "./use-vip-context";

interface VipLayoutContentProps {
  children: React.ReactNode;
}

export default function VipLayoutContent({ children }: VipLayoutContentProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const me = useVipContext();

  const isAuthPage =
    pathname === "/vip/login" || pathname.startsWith("/vip/create-password");
  const isAuthenticated = me?.authenticated;

  if (isAuthPage) {
    return <div className="min-h-screen bg-gray-50 text-gray-950">{children}</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-950">
      {/* Desktop Sidebar - visible on lg+ screens when authenticated */}
      {isAuthenticated && (
        <div className="hidden lg:flex">
          <VipSidebar isOpen={true} />
        </div>
      )}

      {/* Mobile & Tablet Sidebar */}
      {isAuthenticated && (
        <div className="lg:hidden">
          <VipSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile & Tablet Top Nav Header with Hamburger */}
        {isAuthenticated && (
          <header
            className="lg:hidden sticky top-0 z-30 flex-none flex items-center justify-between h-14 sm:h-16 bg-black text-white px-4 sm:px-6 border-b border-gray-800 shadow-sm"
            style={{ backgroundColor: "#000000", color: "#ffffff" }}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base sm:text-lg font-black !text-white text-white tracking-tight">VIP Panel</span>
              <span className="rounded-full bg-emerald-600/30 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase">
                VIP Access
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl hover:bg-gray-800 transition-colors !text-white text-white cursor-pointer"
              aria-label="Toggle menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
          </header>
        )}

        {/* Page Content */}
        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
