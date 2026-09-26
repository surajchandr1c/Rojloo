export type SubAdminPermissionOption = {
  key: string;
  label: string;
};

export const SUBADMIN_PERMISSION_OPTIONS: SubAdminPermissionOption[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "state", label: "State" },
  { key: "city", label: "City List" },
  { key: "city-seo", label: "City SEO" },
  { key: "local-area-seo", label: "Local Area SEO" },
  { key: "dynamic-seo", label: "Dynamic SEO" },
  { key: "static-seo", label: "Static SEO" },
  { key: "ads", label: "Ads" },
  { key: "users", label: "Users" },
  { key: "phone-control", label: "Phone No. Control" },
  { key: "upi", label: "UPI" },
  { key: "coupon", label: "Coupon" },
  { key: "payment-request", label: "Payment Request" },
  { key: "payment-history", label: "Payment History" },
  { key: "set-coins", label: "Set Coins" },
  { key: "promotion-packages", label: "Promotion Package" },
  { key: "vip", label: "VIP" },
  { key: "not-found", label: "404 Pages" },
];

export const PERMISSION_LABELS_MAP: Record<string, string> = Object.fromEntries(
  SUBADMIN_PERMISSION_OPTIONS.map((opt) => [opt.key, opt.label])
);
