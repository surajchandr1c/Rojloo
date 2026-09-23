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
    coins: 20,
    price: 799,
    originalPrice: 820,
    breakdown: "",
    discount: "",
    label: "",
    popular: false,
  },
  {
    coins: 30,
    price: 1399,
    originalPrice: 1460,
    breakdown: "28 + 2 Free",
    discount: "3% DISCOUNT",
    label: "",
    popular: false,
  },
  {
    coins: 65,
    price: 2799,
    originalPrice: 3199,
    breakdown: "56 + 9 Free",
    discount: "6% DISCOUNT",
    label: "",
    popular: true,
  },
  {
    coins: 180,
    price: 7199,
    originalPrice: 7395,
    breakdown: "147 + 33 Free",
    discount: "9% DISCOUNT",
    label: "",
    popular: false,
  },
  {
    coins: 300,
    price: 12399,
    originalPrice: 15435,
    breakdown: "242 + 58 Free",
    discount: "12% DISCOUNT",
    label: "",
    popular: false,
  },
  {
    coins: 503,
    price: 18599,
    originalPrice: 19785,
    breakdown: "393 + 110 Free",
    discount: "15% DISCOUNT",
    label: "",
    popular: false,
  },
];
