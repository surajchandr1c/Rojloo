import { readStore, writeStore, invalidateStoreCache } from "@/lib/persist";
import {
  type PromotionPackage,
  DEFAULT_PROMO_PACKAGES,
} from "@/lib/promotion-packages";
import { normalizeTier, TIER_RANK_MAP, type PromoTier } from "@/lib/promo-shifts";

export type { PromotionPackage };
export { DEFAULT_PROMO_PACKAGES };

function normalizePackage(pkg: Partial<PromotionPackage>, index = 0): PromotionPackage {
  const tier: PromoTier = normalizeTier(pkg.tier, `${pkg.id || ""} ${pkg.title || ""}`);
  const rankInfo = TIER_RANK_MAP[tier] || TIER_RANK_MAP.bronze;

  return {
    _id: pkg._id || `promo-pkg-${index + 1}`,
    id: pkg.id || `promo-${tier}-${index + 1}`,
    title: pkg.title || rankInfo.title,
    tier,
    rankRange: pkg.rankRange || rankInfo.rankRange,
    durationDays: Math.max(1, Math.round(Number(pkg.durationDays || 1))),
    coinsCost: Math.max(0, Math.round(Number(pkg.coinsCost || 0))),
    tag: typeof pkg.tag === "string" ? pkg.tag.trim() : "",
    highlight: Boolean(pkg.highlight),
    features: Array.isArray(pkg.features)
      ? pkg.features.map((f) => String(f).trim()).filter(Boolean)
      : [],
    createdAt: pkg.createdAt || new Date(),
    updatedAt: pkg.updatedAt || new Date(),
  };
}

export async function getPromotionPackages(): Promise<PromotionPackage[]> {
  const store = await readStore();
  const rawPackages = ((store.promotionPackages ?? []) as unknown) as Partial<PromotionPackage>[];
  const isInitialized = Boolean((store as Record<string, unknown>).promotionPackagesInitialized);

  if (isInitialized && rawPackages.length > 0) {
    return rawPackages.map((pkg, idx) => normalizePackage(pkg, idx));
  }

  // Initial seeding on fresh database or re-seed
  const seeded: PromotionPackage[] = DEFAULT_PROMO_PACKAGES.map((pkg, index) => ({
    _id: `promo-package-${index + 1}`,
    ...pkg,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  store.promotionPackages = (seeded as unknown) as typeof store.promotionPackages;
  (store as Record<string, unknown>).promotionPackagesInitialized = true;
  await writeStore(store);

  return seeded;
}

export async function savePromotionPackages(
  packages: Array<{
    _id?: string;
    id?: string;
    title: string;
    tier?: string;
    rankRange?: string;
    durationDays: number;
    coinsCost: number;
    tag?: string;
    highlight?: boolean;
    features?: string[];
  }>
): Promise<PromotionPackage[]> {
  const cleaned: PromotionPackage[] = packages
    .filter(
      (pkg) =>
        pkg &&
        typeof pkg.title === "string" &&
        pkg.title.trim().length > 0 &&
        Number(pkg.durationDays) > 0 &&
        Number(pkg.coinsCost) >= 0
    )
    .map((pkg, idx) => {
      const tier = normalizeTier(pkg.tier, `${pkg.id || ""} ${pkg.title || ""}`);
      const rankInfo = TIER_RANK_MAP[tier] || TIER_RANK_MAP.bronze;

      const generatedId =
        pkg.id && pkg.id.trim()
          ? pkg.id.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-")
          : `promo-${tier}-${idx + 1}`;

      return {
        _id:
          pkg._id && !pkg._id.startsWith("pkg-")
            ? String(pkg._id)
            : `promo-package-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        id: generatedId,
        title: pkg.title.trim(),
        tier,
        rankRange: pkg.rankRange?.trim() || rankInfo.rankRange,
        durationDays: Math.max(1, Math.round(Number(pkg.durationDays))),
        coinsCost: Math.max(0, Math.round(Number(pkg.coinsCost))),
        tag: typeof pkg.tag === "string" ? pkg.tag.trim() : "",
        highlight: Boolean(pkg.highlight),
        features: Array.isArray(pkg.features)
          ? pkg.features.map((f) => String(f).trim()).filter(Boolean)
          : [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

  const store = await readStore();
  store.promotionPackages = (cleaned as unknown) as typeof store.promotionPackages;
  (store as Record<string, unknown>).promotionPackagesInitialized = true;

  await writeStore(store);
  invalidateStoreCache();

  return [...cleaned];
}
