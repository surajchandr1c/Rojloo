import { readStore, writeStore } from "@/lib/persist";

export type CoinPackage = {
  _id?: string;
  coins: number;
  price: number;
  label?: string;
  popular?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

const DEFAULT_PACKAGES: Omit<CoinPackage, "_id">[] = [
  { coins: 50, price: 49, label: "Starter", popular: false },
  { coins: 200, price: 149, label: "Popular", popular: true },
  { coins: 500, price: 349, label: "Value", popular: false },
  { coins: 1200, price: 699, label: "Best Deal", popular: false },
];

export async function getCoinPackages(): Promise<CoinPackage[]> {
  const store = await readStore();
  const packages = (store.coinPackages ?? []) as CoinPackage[];

  if (packages.length > 0) {
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

export async function saveCoinPackages(packages: Array<{ coins: number; price: number; label?: string; popular?: boolean }>): Promise<CoinPackage[]> {
  const cleaned = packages
    .filter((pkg) => pkg && Number(pkg.coins) > 0 && Number(pkg.price) >= 0)
    .map((pkg) => ({
      _id: `coin-package-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      coins: Number(pkg.coins),
      price: Number(pkg.price),
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
