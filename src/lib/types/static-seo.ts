export type StaticPageKey =
  | "home"
  | "terms"
  | "return-policy"
  | "refund-policy"
  | "privacy-policy"
  | "disclaimer"
  | "contact";

export type StaticSeoImage = {
  url: string;
  alt?: string;
};

export type StaticContentBlock = {
  id: string;
  type: "h2" | "h3" | "p";
  text: string;
};

export type StaticSeoStatus = "draft" | "published";

export type StaticSeo = {
  pageKey: StaticPageKey;
  title?: string;
  description?: string;
  keywords?: string;
  images: StaticSeoImage[]; // Up to 2 images
  content: StaticContentBlock[];
  status: StaticSeoStatus;
  updatedAt?: string;
};

export const STATIC_PAGES: { key: StaticPageKey; label: string; href: string }[] = [
  { key: "home", label: "Home", href: "/" },
  { key: "terms", label: "Terms", href: "/terms" },
  { key: "return-policy", label: "Return Policy", href: "/return-policy" },
  { key: "refund-policy", label: "Refund Policy", href: "/refund-policy" },
  { key: "privacy-policy", label: "Privacy Policy", href: "/privacy-policy" },
  { key: "disclaimer", label: "Disclaimer", href: "/disclaimer" },
  { key: "contact", label: "Contact Us", href: "/contact" },
];
