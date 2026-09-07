import type { PromoTier } from "./promo-shifts";

export type { PromoTier };

export type PromotionPackage = {
  _id?: string;
  id: string;
  title: string;
  tier: PromoTier;
  rankRange: string;
  durationDays: number;
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
    coinsCost: 25,
    tag: "Highest Rank",
    highlight: true,
    features: [
      "Guaranteed Top 1 - 3 position on city listings",
      "Priority 12h shift display (Day or Night)",
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
    coinsCost: 15,
    tag: "Most Popular",
    features: [
      "Guaranteed Top 4 - 6 position on city listings",
      "12h shift priority boost (Day or Night)",
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
    durationDays: 2,
    coinsCost: 10,
    tag: "Great Value",
    features: [
      "Guaranteed Top 7 - 10 position on city listings",
      "12h shift priority placement",
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
    durationDays: 1,
    coinsCost: 5,
    tag: "Starter Boost",
    features: [
      "Guaranteed Top 10 - 15 position on city listings",
      "12h shift priority placement",
      "Instant promotion activation",
      "Highlighted card badge",
      "Distinctive Bronze VIP badge",
    ],
  },
];
