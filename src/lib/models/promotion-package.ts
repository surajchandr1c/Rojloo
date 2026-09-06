import { readStore, writeStore, invalidateStoreCache } from "@/lib/persist";
import {
  type PromotionPackage,
  DEFAULT_PROMO_PACKAGES,
} from "@/lib/promotion-packages";

export type { PromotionPackage };
export { DEFAULT_PROMO_PACKAGES };

export async function getPromotionPackages(): Promise<PromotionPackage[]> {
  const store = await readStore();
  const packages = ((store.promotionPackages ?? []) as unknown) as PromotionPackage[];
  const isInitialized = Boolean((store as Record<string, unknown>).promotionPackagesInitialized);

  if (isInitialized || packages.length > 0) {
    return [...packages];
  }

  // Initial seeding on fresh database
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
      const generatedId =
        pkg.id && pkg.id.trim()
          ? pkg.id.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-")
          : `promo-pkg-${idx + 1}`;

      return {
        _id:
          pkg._id && !pkg._id.startsWith("pkg-")
            ? String(pkg._id)
            : `promo-package-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        id: generatedId,
        title: pkg.title.trim(),
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
