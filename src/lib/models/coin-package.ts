import { readStore, writeStore, invalidateStoreCache } from "@/lib/persist";
import {
  type CoinPackage,
  DEFAULT_PACKAGES,
} from "@/lib/coin-packages";

export type { CoinPackage };
export { DEFAULT_PACKAGES };

export async function getCoinPackages(): Promise<CoinPackage[]> {
  const store = await readStore();
  const packages = (store.coinPackages ?? []) as CoinPackage[];
  const isInitialized = Boolean((store as Record<string, unknown>).coinPackagesInitialized);

  if (isInitialized || packages.length > 0) {
    return [...packages].sort((a, b) => Number(a.coins) - Number(b.coins));
  }

  // Initial seeding on fresh database
  const seeded = DEFAULT_PACKAGES.map((pkg, index) => ({
    _id: `coin-package-${index + 1}`,
    ...pkg,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  store.coinPackages = seeded;
  (store as Record<string, unknown>).coinPackagesInitialized = true;
  await writeStore(store);

  return seeded;
}

export async function saveCoinPackages(
  packages: Array<{
    _id?: string;
    coins: number;
    price: number;
    originalPrice?: number;
    breakdown?: string;
    discount?: string;
    label?: string;
    popular?: boolean;
  }>
): Promise<CoinPackage[]> {
  const cleaned: CoinPackage[] = packages
    .filter((pkg) => pkg && Number(pkg.coins) > 0 && Number(pkg.price) >= 0)
    .map((pkg, idx) => ({
      _id: pkg._id && !pkg._id.startsWith("pkg-")
        ? String(pkg._id)
        : `coin-package-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      coins: Number(pkg.coins),
      price: Number(pkg.price),
      originalPrice:
        pkg.originalPrice && Number(pkg.originalPrice) > 0
          ? Number(pkg.originalPrice)
          : undefined,
      breakdown: typeof pkg.breakdown === "string" ? pkg.breakdown.trim() : "",
      discount: typeof pkg.discount === "string" ? pkg.discount.trim() : "",
      label: typeof pkg.label === "string" ? pkg.label.trim() : "",
      popular: Boolean(pkg.popular),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

  const store = await readStore();
  store.coinPackages = cleaned;
  (store as Record<string, unknown>).coinPackagesInitialized = true;

  await writeStore(store);
  invalidateStoreCache();

  return [...cleaned].sort((a, b) => Number(a.coins) - Number(b.coins));
}
