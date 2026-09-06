export type CoinPackage = {
  _id?: string;
  coins: number;
  price: number;
  originalPrice?: number;
  breakdown?: string;
  discount?: string;
  label?: string;
  popular?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export const DEFAULT_PACKAGES: Omit<CoinPackage, "_id">[] = [
  {
    coins: 15,
    price: 705,
    originalPrice: 705,
    breakdown: "",
    discount: "",
    label: "Starter",
    popular: false,
  },
  {
    coins: 30,
    price: 1316,
    originalPrice: 1410,
    breakdown: "28 + 2 Free",
    discount: "7% DISCOUNT",
    label: "7% OFF",
    popular: false,
  },
  {
    coins: 62,
    price: 2632,
    originalPrice: 2914,
    breakdown: "56 + 6 Free",
    discount: "10% DISCOUNT",
    label: "10% OFF",
    popular: false,
  },
  {
    coins: 104,
    price: 4183,
    originalPrice: 4888,
    breakdown: "89 + 15 Free",
    discount: "14% DISCOUNT",
    label: "14% OFF",
    popular: false,
  },
  {
    coins: 172,
    price: 6909,
    originalPrice: 8084,
    breakdown: "147 + 25 Free",
    discount: "15% DISCOUNT",
    label: "Popular",
    popular: true,
  },
  {
    coins: 297,
    price: 11374,
    originalPrice: 13959,
    breakdown: "242 + 55 Free",
    discount: "19% DISCOUNT",
    label: "19% OFF",
    popular: false,
  },
  {
    coins: 493,
    price: 18471,
    originalPrice: 23171,
    breakdown: "393 + 100 Free",
    discount: "20% DISCOUNT",
    label: "20% OFF",
    popular: false,
  },
  {
    coins: 895,
    price: 32195,
    originalPrice: 42065,
    breakdown: "685 + 210 Free",
    discount: "23% DISCOUNT",
    label: "23% OFF",
    popular: false,
  },
  {
    coins: 1330,
    price: 46060,
    originalPrice: 62510,
    breakdown: "980 + 350 Free",
    discount: "26% DISCOUNT",
    label: "Best Value",
    popular: false,
  },
  {
    coins: 1850,
    price: 61100,
    originalPrice: 86950,
    breakdown: "1300 + 550 Free",
    discount: "30% DISCOUNT",
    label: "Maximum Savings",
    popular: false,
  },
];
