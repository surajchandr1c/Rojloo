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
      "Top 1 - 3 position on city listings",
      "Runs on Top during chosen shift every day for 7 Days",
      "Fair 30-min slot rotation when shift is full",
      "Moves down outside shift, returns to top next day",
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
      "Top 4 - 6 position on city listings",
      "Runs on Top during chosen shift every day for 3 Days",
      "Fair 30-min slot rotation when shift is full",
      "Moves down outside shift, returns to top next day",
      "Distinctive Gold VIP badge",
    ],
  },
  {
    id: "silver-vip",
    title: "Silver VIP (Top 7-10)",
    tier: "silver",
    rankRange: "Top 7 - 10",
    durationDays: 2,
    durationHours: 48,
    coinsCost: 10,
    tag: "Great Value",
    features: [
      "Top 7 - 10 position on city listings",
      "Runs on Top during chosen shift every day for 2 Days",
      "Fair 30-min slot rotation when shift is full",
      "Moves down outside shift, returns to top next day",
      "Distinctive Silver VIP badge",
    ],
  },
  {
    id: "bronze-vip",
    title: "Bronze VIP (Top 10-15)",
    tier: "bronze",
    rankRange: "Top 10 - 15",
    durationDays: 0.25,
    durationHours: 6,
    coinsCost: 5,
    tag: "6h Shift",
    features: [
      "Top 10 - 15 position on city listings",
      "Runs on Top during chosen shift for 6 Hours",
      "Fair 30-min slot rotation when shift is full",
      "Moves down when 6h shift ends",
      "Distinctive Bronze VIP badge",
    ],
  },
];
