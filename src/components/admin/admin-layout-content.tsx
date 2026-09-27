"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./admin-sidebar";
import { useAdminContext } from "./use-admin-context";

interface AdminLayoutContentProps {
  children: React.ReactNode;
}

export default function AdminLayoutContent({ children }: AdminLayoutContentProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const me = useAdminContext();

  // Hide sidebar and header on login page
  const isLoginPage = pathname === "/admin/login";
  const isAuthenticated = me?.authenticated;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-950">
      {/* Desktop Sidebar - visible on lg+ screens and when authenticated */}
      {!isLoginPage && isAuthenticated && (
        <div className="hidden lg:flex">
          <Sidebar isOpen={true} />
        </div>
      )}

      {/* Mobile & Tablet Sidebar - togglable on smaller screens and when authenticated */}
      {!isLoginPage && isAuthenticated && (
        <div className="lg:hidden">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile & Tablet Top Nav Header with Hamburger - visible on phone and tablet */}
        {!isLoginPage && isAuthenticated && (
          <header className="lg:hidden sticky top-0 z-30 flex-none flex items-center justify-between h-14 sm:h-16 bg-black text-white px-4 sm:px-6 border-b border-gray-800 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="text-base sm:text-lg font-black tracking-tight text-white">Admin Panel</span>
              {me?.role === "main" ? (
                <span className="rounded-full bg-red-600/30 border border-red-500/40 px-2 py-0.5 text-[10px] font-bold text-red-300 uppercase">
                  Super Admin
                </span>
              ) : (
                <span className="rounded-full bg-gray-800 border border-gray-700 px-2 py-0.5 text-[10px] font-semibold text-gray-300 uppercase">
                  Sub Admin
                </span>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl text-white hover:bg-gray-800 transition-colors cursor-pointer"
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
        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">{children}</div>
      </div>
    </div>
  );
}
