import Link from "next/link";
import { cn } from "@/lib/cn";

export type CityNavTabKey = "city-list" | "city-seo" | "dynamic-seo";

interface CityNavTabsProps {
  activeTab: CityNavTabKey;
  className?: string;
}

const TABS: Array<{ key: CityNavTabKey; label: string; href: string }> = [
  { key: "city-list", label: "City List", href: "/admin/city" },
  { key: "city-seo", label: "City SEO", href: "/admin/city-seo" },
  { key: "dynamic-seo", label: "Dynamic SEO", href: "/admin/dynamic-seo" },
];

export function CityNavTabs({ activeTab, className = "" }: CityNavTabsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-semibold transition cursor-pointer",
              isActive
                ? "bg-gray-900 !text-white text-white shadow-sm"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-xs"
            )}
            style={isActive ? { color: "#ffffff" } : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

export default CityNavTabs;
