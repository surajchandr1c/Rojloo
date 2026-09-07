export type PromoShift = "12h" | "day" | "night" | "all";

export type PromoTier = "platinum" | "gold" | "silver" | "bronze";

export interface ShiftInfo {
  shift: "day" | "night";
  label: string;
  hours: string;
  nextShift: "day" | "night";
  nextShiftLabel: string;
  nextShiftTime: string;
}

export interface TierRankInfo {
  tier: PromoTier;
  title: string;
  rankRange: string;
  minRank: number;
  maxRank: number;
  badge: string;
  badgeClass: string;
}

/**
 * Returns current shift based on Indian Standard Time (IST, UTC+5:30).
 * Day Shift: 08:00 AM (08:00) to 08:00 PM (20:00)
 * Night Shift: 08:00 PM (20:00) to 08:00 AM (08:00)
 */
export function getCurrentShift(date: Date = new Date()): "day" | "night" {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  // IST is UTC + 5.5 hours
  const istDate = new Date(utc + 3600000 * 5.5);
  const hour = istDate.getHours();
  return hour >= 8 && hour < 20 ? "day" : "night";
}

export function getCurrentShiftInfo(date: Date = new Date()): ShiftInfo {
  const current = getCurrentShift(date);
  if (current === "day") {
    return {
      shift: "day",
      label: "Day Shift",
      hours: "08:00 AM – 08:00 PM (12 Hours)",
      nextShift: "night",
      nextShiftLabel: "Night Shift",
      nextShiftTime: "08:00 PM",
    };
  }

  return {
    shift: "night",
    label: "Night Shift",
    hours: "08:00 PM – 08:00 AM (12 Hours)",
    nextShift: "day",
    nextShiftLabel: "Day Shift",
    nextShiftTime: "08:00 AM",
  };
}

export function getShiftLabel(shift?: string): string {
  const normalized = (shift || "12h").toLowerCase();
  if (normalized === "12h") {
    return "12 Hours Shift (Runs 12 hours from promotion time)";
  }
  if (normalized === "night") {
    return "Night Shift (12 Hours from promotion time)";
  }
  if (normalized === "all" || normalized === "24h") {
    return "24 Hours Shift (Day & Night)";
  }
  return "Day Shift (12 Hours from promotion time)";
}

export function getShiftShortLabel(shift?: string): string {
  const normalized = (shift || "12h").toLowerCase();
  if (normalized === "12h") return "⏱️ 12h Shift";
  if (normalized === "night") return "🌙 Night (12h)";
  if (normalized === "all" || normalized === "24h") return "🔄 24h Full Day";
  return "☀️ Day (12h)";
}

export const TIER_RANK_MAP: Record<PromoTier, TierRankInfo> = {
  platinum: {
    tier: "platinum",
    title: "Platinum VIP",
    rankRange: "Top 1 - 3",
    minRank: 1,
    maxRank: 3,
    badge: "👑 Top 1-3 VIP",
    badgeClass: "bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white border-purple-300",
  },
  gold: {
    tier: "gold",
    title: "Gold VIP",
    rankRange: "Top 4 - 6",
    minRank: 4,
    maxRank: 6,
    badge: "🥇 Top 4-6 VIP",
    badgeClass: "bg-gradient-to-r from-amber-500 to-yellow-600 text-white border-amber-300",
  },
  silver: {
    tier: "silver",
    title: "Silver VIP",
    rankRange: "Top 7 - 10",
    minRank: 7,
    maxRank: 10,
    badge: "🥈 Top 7-10 VIP",
    badgeClass: "bg-gradient-to-r from-slate-500 to-gray-700 text-white border-slate-300",
  },
  bronze: {
    tier: "bronze",
    title: "Bronze VIP",
    rankRange: "Top 10 - 15",
    minRank: 10,
    maxRank: 15,
    badge: "🥉 Top 10-15 VIP",
    badgeClass: "bg-gradient-to-r from-amber-800 to-yellow-900 text-white border-amber-600",
  },
};

export function normalizeTier(rawTier?: string, rawTitleOrId?: string): PromoTier {
  const val = (rawTier || "").trim().toLowerCase();
  if (val === "platinum" || val === "gold" || val === "silver" || val === "bronze") {
    return val as PromoTier;
  }

  const search = `${rawTier || ""} ${rawTitleOrId || ""}`.toLowerCase();
  if (search.includes("platinum") || search.includes("7-day") || search.includes("vip-7")) {
    return "platinum";
  }
  if (search.includes("gold") || search.includes("3-day") || search.includes("vip-3")) {
    return "gold";
  }
  if (search.includes("silver") || search.includes("2-day") || search.includes("vip-2")) {
    return "silver";
  }
  return "bronze";
}

export function getTierRankInfo(tier?: string, titleOrId?: string): TierRankInfo {
  const norm = normalizeTier(tier, titleOrId);
  return TIER_RANK_MAP[norm] || TIER_RANK_MAP.bronze;
}

export function isAdPromotionActive(
  ad: {
    promoted?: boolean;
    isPromoted?: boolean;
    promotedUntil?: Date | string;
  },
  now: Date = new Date()
): boolean {
  const isFlagged = Boolean(ad.promoted || ad.isPromoted);
  if (!isFlagged || !ad.promotedUntil) return false;
  const expiryTime = new Date(ad.promotedUntil).getTime();
  return !isNaN(expiryTime) && expiryTime > now.getTime();
}

export function isAdActiveInCurrentShift(
  ad: {
    promoted?: boolean;
    isPromoted?: boolean;
    promotedUntil?: Date | string;
    promoShift?: string;
  },
  now: Date = new Date()
): boolean {
  return isAdPromotionActive(ad, now);
}

export function calculateExpirationDate(
  duration: number,
  startDate: Date = new Date(),
  isHours = false
): Date {
  if (isHours) {
    const hours = Math.max(1, Number(duration) || 12);
    return new Date(startDate.getTime() + hours * 60 * 60 * 1000);
  }
  const days = Number(duration) || 1;
  return new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);
}

export function calculatePromoExpiration(
  pkg?: { durationDays?: number; durationHours?: number },
  shift?: string,
  startDate: Date = new Date()
): Date {
  if (pkg?.durationHours) {
    return new Date(startDate.getTime() + pkg.durationHours * 60 * 60 * 1000);
  }

  const normShift = (shift || "12h").toLowerCase();
  if (normShift === "12h" || normShift === "day" || normShift === "night") {
    if (pkg?.durationDays && pkg.durationDays > 1) {
      return new Date(startDate.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000);
    }
    // Default 12-hour shift: runs for exactly 12 hours from activation
    return new Date(startDate.getTime() + 12 * 60 * 60 * 1000);
  }

  const days = Number(pkg?.durationDays) || 1;
  return new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);
}

export function formatDateTime(date?: Date | string): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const day = String(d.getDate()).padStart(2, "0");
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const formattedTime = `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;

  return `${day} ${month} ${year}, ${formattedTime}`;
}

export function formatTimeRemaining(expiryDate?: Date | string, now: Date = new Date()): string {
  if (!expiryDate) return "Expired";
  const exp = new Date(expiryDate).getTime();
  const diff = exp - now.getTime();

  if (diff <= 0) return "Expired";

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

export function formatDetailedTimeRemaining(expiryDate?: Date | string, now: Date = new Date()): string {
  if (!expiryDate) return "Expired";
  const exp = new Date(expiryDate).getTime();
  const diff = exp - now.getTime();

  if (diff <= 0) return "Expired";

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h ${minutes}m ${seconds}s left`;
  }
  return `${hours}h ${minutes}m ${seconds}s left`;
}

/**
 * Sorts ads by promotion tier:
 * - Active Platinum ads (Top 1 - 3)
 * - Active Gold ads (Top 4 - 6)
 * - Active Silver ads (Top 7 - 10)
 * - Active Bronze ads (Top 10 - 15)
 * - Remaining ads: expired ads and standard free ads (newest first).
 */
export function sortAdsWithPromotions<T extends {
  _id?: string;
  createdAt: Date | string;
  promoted?: boolean;
  isPromoted?: boolean;
  promotedUntil?: Date | string;
  promoPackage?: string;
  promoTier?: string;
  promoShift?: string;
}>(ads: T[], now: Date = new Date()): T[] {
  const platinumAds: T[] = [];
  const goldAds: T[] = [];
  const silverAds: T[] = [];
  const bronzeAds: T[] = [];
  const otherAds: T[] = [];

  for (const ad of ads) {
    const isActivePromo = isAdPromotionActive(ad, now);

    if (isActivePromo) {
      const tier = normalizeTier(ad.promoTier, ad.promoPackage);
      if (tier === "platinum") {
        platinumAds.push(ad);
      } else if (tier === "gold") {
        goldAds.push(ad);
      } else if (tier === "silver") {
        silverAds.push(ad);
      } else {
        bronzeAds.push(ad);
      }
      continue;
    }

    // Ads not active (expired or standard free ads)
    otherAds.push(ad);
  }

  // Sort within tiers by promotion recency or creation date
  const sortByDate = (a: T, b: T) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

  platinumAds.sort(sortByDate);
  goldAds.sort(sortByDate);
  silverAds.sort(sortByDate);
  bronzeAds.sort(sortByDate);
  otherAds.sort(sortByDate);

  return [
    ...platinumAds,
    ...goldAds,
    ...silverAds,
    ...bronzeAds,
    ...otherAds,
  ];
}
