import type { PromoTier } from "./promo-shifts";

export type { PromoTier };

export type PromotionPackage = {
  _id?: string;
  id: string;
  title: string;
  tier: PromoTier;
  rankRange: string;
  durationDays: number;
  durationHours?: number;
  coinsCost: number;
  tag?: string;
  highlight?: boolean;
  features: string[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
  [key: string]: unknown;
};

export const DEFAULT_PROMO_PACKAGES: PromotionPackage[] = [
  {
    id: "platinum-vip",
    title: "Platinum VIP (Top 1-3)",
    tier: "platinum",
    rankRange: "Top 1 - 3",
    durationDays: 7,
    durationHours: 168,
    coinsCost: 25,
    tag: "Highest Rank",
    highlight: true,
    features: [
      "Guaranteed Top 1 - 3 position on city listings",
      "Runs for 7 Days from promotion time",
      "Unlocks all ad gallery images",
      "Maximum inquiries via WhatsApp & calls",
      "Distinctive Platinum VIP crown badge",
    ],
  },
  {
    id: "gold-vip",
    title: "Gold VIP (Top 4-6)",
    tier: "gold",
    rankRange: "Top 4 - 6",
    durationDays: 3,
    durationHours: 72,
    coinsCost: 15,
    tag: "Most Popular",
    features: [
      "Guaranteed Top 4 - 6 position on city listings",
      "Runs for 3 Days from promotion time",
      "Unlocks all ad gallery images",
      "3x higher search visibility",
      "Distinctive Gold VIP badge",
    ],
  },
  {
    id: "silver-vip",
    title: "Silver VIP (Top 7-10)",
    tier: "silver",
    rankRange: "Top 7 - 10",
    durationDays: 1,
    durationHours: 24,
    coinsCost: 10,
    tag: "Great Value",
    features: [
      "Guaranteed Top 7 - 10 position on city listings",
      "Runs for 24 Hours from promotion time",
      "2x higher search visibility",
      "Highlighted card badge",
      "Distinctive Silver VIP badge",
    ],
  },
  {
    id: "bronze-vip",
    title: "Bronze VIP (Top 10-15)",
    tier: "bronze",
    rankRange: "Top 10 - 15",
    durationDays: 0.5,
    durationHours: 12,
    coinsCost: 5,
    tag: "12h Starter",
    features: [
      "Guaranteed Top 10 - 15 position on city listings",
      "Runs for 12 Hours from promotion time",
      "Instant promotion activation",
      "Highlighted card badge",
      "Distinctive Bronze VIP badge",
    ],
  },
];
