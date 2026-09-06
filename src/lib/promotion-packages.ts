export type PromotionPackage = {
  _id?: string;
  id: string;
  title: string;
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
    id: "vip-1-day",
    title: "VIP Top 1 Day (3 TOP-US)",
    durationDays: 1,
    coinsCost: 5,
    tag: "Quick Boost",
    features: [
      "Top VIP placement in your city",
      "Highlighted card badge",
      "2x higher search visibility",
      "Instant activation",
    ],
  },
  {
    id: "vip-3-days",
    title: "VIP Super 3 Days (3 TOP-US)",
    durationDays: 3,
    coinsCost: 12,
    tag: "Most Popular",
    highlight: true,
    features: [
      "3x visibility across city listings",
      "Unlocks all ad gallery images",
      "VIP 1x3 rotation slot",
      "High priority lead placement",
    ],
  },
  {
    id: "vip-7-days",
    title: "VIP Premium 7 Days (VIP 1x3)",
    durationDays: 7,
    coinsCost: 25,
    tag: "Best Value",
    features: [
      "Maximum exposure for 7 full days",
      "Prime VIP carousel rotation",
      "All gallery photos unlocked",
      "Priority WhatsApp & call display",
    ],
  },
  {
    id: "unlock-images",
    title: "Unlock Images Pack (30 Days)",
    durationDays: 30,
    coinsCost: 3,
    tag: "Photo Pack",
    features: [
      "Instantly unlock all photos",
      "Visible to all potential clients",
      "Valid for full 30 days",
    ],
  },
];
