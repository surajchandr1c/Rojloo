import { readStore, writeStore } from "@/lib/persist";
import {
  type CoinPackage,
  DEFAULT_PACKAGES,
} from "@/lib/coin-packages";

export type { CoinPackage };
export { DEFAULT_PACKAGES };

export async function getCoinPackages(): Promise<CoinPackage[]> {
  const store = await readStore();
  const packages = (store.coinPackages ?? []) as CoinPackage[];

  const isLegacySet =
    packages.length === 4 &&
    packages[0]?.coins === 50 &&
    packages[1]?.coins === 200;

  if (packages.length > 0 && !isLegacySet) {
    return packages.sort((a, b) => a.coins - b.coins);
  }

  const seeded = DEFAULT_PACKAGES.map((pkg, index) => ({
    _id: `coin-package-${index + 1}`,
    ...pkg,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  store.coinPackages = seeded;
  await writeStore(store);

  return seeded;
}

export async function saveCoinPackages(
  packages: Array<{
    coins: number;
    price: number;
    originalPrice?: number;
    breakdown?: string;
    discount?: string;
    label?: string;
    popular?: boolean;
  }>
): Promise<CoinPackage[]> {
  const cleaned = packages
    .filter((pkg) => pkg && Number(pkg.coins) > 0 && Number(pkg.price) >= 0)
    .map((pkg) => ({
      _id: `coin-package-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      coins: Number(pkg.coins),
      price: Number(pkg.price),
      originalPrice: pkg.originalPrice ? Number(pkg.originalPrice) : undefined,
      breakdown: typeof pkg.breakdown === "string" ? pkg.breakdown.trim() : "",
      discount: typeof pkg.discount === "string" ? pkg.discount.trim() : "",
      label: typeof pkg.label === "string" ? pkg.label.trim() : "",
      popular: Boolean(pkg.popular),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

  const store = await readStore();
  store.coinPackages = cleaned.length > 0 ? cleaned : DEFAULT_PACKAGES.map((pkg, index) => ({
    _id: `coin-package-${index + 1}`,
    ...pkg,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  await writeStore(store);
  return store.coinPackages as CoinPackage[];
}
