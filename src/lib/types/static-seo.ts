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

export const DEFAULT_STATIC_SEO_DATA: Record<StaticPageKey, StaticSeo> = {
  home: {
    pageKey: "home",
    title: "Escort Call Girl in Rojloo, Companion, Thai Massage & Nightlife Listings | Rojlo",
    description:
      "Find local listings for escort call girl in rojloo, call girls in rojloo, massage in rojloo, body massage, male escort, male escort service, escort service rojloo, night outings, hotel parties, Thai massage, and other social experiences.",
    keywords:
      "escort call girl in rojloo, call girls in rojloo, massage in rojloo, body massage, male escort, male escort service, escort service rojloo, Thai massage call girl, night out, hotel party",
    images: [],
    status: "published",
    content: [
      {
        id: "home_1",
        type: "h2",
        text: "Call Girls in Rojloo, Escort Call Girl & Companionship Services",
      },
      {
        id: "home_2",
        type: "p",
        text: "Finding the right social experience can be easier when you have access to a platform where people can discover and post local listings. **Rojloo** brings together listings for **call girls in Rojloo, escort call girl in Rojloo, escort service Rojloo, male escort, male escort service, night out plans, night meetings, hotel parties, Thai massage call girl, massage in Rojloo, and body massage** in one convenient place.",
      },
      {
        id: "home_3",
        type: "p",
        text: "Whether you are looking for a **call girl in Rojloo**, planning a night out, exploring local massage and wellness options, or looking to connect with people offering social services, users can browse available ads and choose listings based on their preferences and location.",
      },
      {
        id: "home_4",
        type: "h3",
        text: "Escort Call Girl in Rojloo & Social Connection",
      },
      {
        id: "home_5",
        type: "p",
        text: "Rojloo allows adults to browse advertisements from individuals offering social companionship. If you are searching for an **escort call girl in Rojloo** or looking to connect with independent companions, you can explore available profiles, read service details, and reach out directly to the advertiser.",
      },
      {
        id: "home_6",
        type: "h3",
        text: "Escort Service Rojloo & Male Escort Service",
      },
      {
        id: "home_7",
        type: "p",
        text: "In addition to traditional listings, our platform also features options for users looking for **escort service Rojloo** or interested in meeting male companions through **male escort and male escort service** listings. We aim to offer a diverse platform where different types of companionship services can be discovered easily.",
      },
      {
        id: "home_8",
        type: "h3",
        text: "Night Out & Night Meeting",
      },
      {
        id: "home_9",
        type: "p",
        text: "Make your evening plans easier by discovering local listings for **night out** and **night meeting** experiences. Users can browse advertisements and connect with people offering social companionship for evenings and events.",
      },
      {
        id: "home_10",
        type: "h3",
        text: "Hotel Party & Social Events",
      },
      {
        id: "home_11",
        type: "p",
        text: "Users can also discover listings related to hotel parties and private social gatherings. Always review the listing details and communicate directly with the advertiser before making arrangements.",
      },
      {
        id: "home_12",
        type: "h3",
        text: "Thai Massage Call Girl, Massage in Rojloo & Body Massage",
      },
      {
        id: "home_13",
        type: "p",
        text: "Explore listings for **Thai massage call girl, massage in Rojloo, and body massage**. Massage listings can provide information about available services, location, timings, and contact details so users can make informed choices.",
      },
      {
        id: "home_14",
        type: "h3",
        text: "Find Local Listings Easily",
      },
      {
        id: "home_15",
        type: "p",
        text: "Rojloo makes it simple to search and discover relevant listings by location and category. Whether you are interested in **call girls in Rojloo, escort call girl in Rojloo, escort service Rojloo, male escort, male escort service, Thai massage call girl, massage in Rojloo, or body massage**, you can explore advertisements and connect with suitable providers.",
      },
    ],
  },
  terms: {
    pageKey: "terms",
    title: "Terms and Conditions | Rojlo",
    description:
      "Read the terms and conditions for using Rojlo, including accounts, listings, payments, and acceptable use.",
    keywords: "terms and conditions, terms of service, user agreement, Rojlo terms",
    images: [],
    status: "published",
    content: [
      {
        id: "terms_1",
        type: "h2",
        text: "1. Acceptance of Terms",
      },
      {
        id: "terms_2",
        type: "p",
        text: "By accessing or using Rojlo, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree, please do not use the platform.",
      },
      {
        id: "terms_3",
        type: "h2",
        text: "2. Accounts",
      },
      {
        id: "terms_4",
        type: "p",
        text: "You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must provide accurate information and be at least 18 years old to use this service.",
      },
      {
        id: "terms_5",
        type: "h2",
        text: "3. Listings and Content",
      },
      {
        id: "terms_6",
        type: "p",
        text: "Users are solely responsible for the ads and content they post. Content must be lawful, accurate, and not infringe the rights of others. We reserve the right to remove any listing that violates these terms.",
      },
      {
        id: "terms_7",
        type: "h2",
        text: "4. Payments and Coins",
      },
      {
        id: "terms_8",
        type: "p",
        text: "Payments for coins or promoted listings are processed as described at the time of purchase. All purchases are final unless otherwise required by applicable law.",
      },
      {
        id: "terms_9",
        type: "h2",
        text: "5. Prohibited Use",
      },
      {
        id: "terms_10",
        type: "p",
        text: "You may not use Rojlo for any unlawful, fraudulent, or abusive activity. We may suspend or terminate accounts that breach these terms.",
      },
      {
        id: "terms_11",
        type: "h2",
        text: "6. Limitation of Liability",
      },
      {
        id: "terms_12",
        type: "p",
        text: 'Rojlo is provided on an "as is" basis. We are not liable for any indirect or consequential damages arising from the use of the platform or interactions between users.',
      },
      {
        id: "terms_13",
        type: "h2",
        text: "7. Changes to Terms",
      },
      {
        id: "terms_14",
        type: "p",
        text: "We may update these Terms from time to time. Continued use of Rojlo after changes are posted constitutes acceptance of the revised terms.",
      },
    ],
  },
  "return-policy": {
    pageKey: "return-policy",
    title: "Return Policy | Rojlo",
    description: "Read Rojlo's return policy for products, services, and listings.",
    keywords: "return policy, returns, refunds, Rojlo return policy",
    images: [],
    status: "published",
    content: [
      {
        id: "ret_1",
        type: "h2",
        text: "1. Eligibility",
      },
      {
        id: "ret_2",
        type: "p",
        text: "Returns are evaluated on a case-by-case basis depending on the product or service purchased through the platform.",
      },
      {
        id: "ret_3",
        type: "h2",
        text: "2. How to Request",
      },
      {
        id: "ret_4",
        type: "p",
        text: "To request a return, contact our support team with your order or ad details. We will review the request and respond with the next steps.",
      },
      {
        id: "ret_5",
        type: "h2",
        text: "3. Non-Returnable Items",
      },
      {
        id: "ret_6",
        type: "p",
        text: "Certain digital items, consumed services, and promotional coin purchases are non-returnable unless required by applicable law.",
      },
    ],
  },
  "refund-policy": {
    pageKey: "refund-policy",
    title: "Refund Policy | Rojlo",
    description: "Read Rojlo's refund policy for payments, coins, and listings.",
    keywords: "refund policy, money back, coin refunds, payment cancellation",
    images: [],
    status: "published",
    content: [
      {
        id: "ref_1",
        type: "h2",
        text: "1. Refund Eligibility",
      },
      {
        id: "ref_2",
        type: "p",
        text: "Refunds are considered for duplicate charges, failed deliveries, or cancelled orders as described at the time of purchase.",
      },
      {
        id: "ref_3",
        type: "h2",
        text: "2. Processing Time",
      },
      {
        id: "ref_4",
        type: "p",
        text: "Approved refunds are processed to the original payment method within the timeframe required by your payment provider.",
      },
      {
        id: "ref_5",
        type: "h2",
        text: "3. Coin Purchases",
      },
      {
        id: "ref_6",
        type: "p",
        text: "Coin purchases used to promote listings are generally non-refundable once consumed, unless required by applicable law.",
      },
    ],
  },
  "privacy-policy": {
    pageKey: "privacy-policy",
    title: "Privacy Policy | Rojlo",
    description: "Read how Rojlo collects, uses, and protects your information.",
    keywords: "privacy policy, data protection, privacy rights, Rojlo privacy",
    images: [],
    status: "published",
    content: [
      {
        id: "priv_1",
        type: "h2",
        text: "1. Information We Collect",
      },
      {
        id: "priv_2",
        type: "p",
        text: "We collect account details, ad content, and basic usage information needed to operate the platform and support you.",
      },
      {
        id: "priv_3",
        type: "h2",
        text: "2. How We Use It",
      },
      {
        id: "priv_4",
        type: "p",
        text: "Your information is used to provide services, display listings, communicate with you, and improve the platform.",
      },
      {
        id: "priv_5",
        type: "h2",
        text: "3. Data Sharing",
      },
      {
        id: "priv_6",
        type: "p",
        text: "We do not sell your personal information. Data may be shared with service providers only as needed to run the platform.",
      },
      {
        id: "priv_7",
        type: "h2",
        text: "4. Your Choices",
      },
      {
        id: "priv_8",
        type: "p",
        text: "You can request access to or deletion of your account data by contacting our support team.",
      },
    ],
  },
  disclaimer: {
    pageKey: "disclaimer",
    title: "Disclaimer | Rojlo",
    description: "Read the disclaimer for using the Rojlo platform.",
    keywords: "disclaimer, liability disclaimer, marketplace terms, terms of use",
    images: [],
    status: "published",
    content: [
      {
        id: "disc_1",
        type: "h2",
        text: "1. Marketplace Role",
      },
      {
        id: "disc_2",
        type: "p",
        text: "Rojlo is a marketplace that connects users. We do not personally perform the listed services.",
      },
      {
        id: "disc_3",
        type: "h2",
        text: "2. No Warranty",
      },
      {
        id: "disc_4",
        type: "p",
        text: 'The platform is provided "as is" without warranties of any kind. We do not guarantee service quality or availability.',
      },
      {
        id: "disc_5",
        type: "h2",
        text: "3. User Responsibility",
      },
      {
        id: "disc_6",
        type: "p",
        text: "Users are responsible for verifying listings, service details, and the conduct of other users before transacting.",
      },
    ],
  },
  contact: {
    pageKey: "contact",
    title: "Contact Us | Rojlo",
    description: "Get in touch with the Rojlo support team by email, phone, or mail.",
    keywords: "contact us, support, customer service, email, phone",
    images: [],
    status: "published",
    content: [
      {
        id: "cont_1",
        type: "h2",
        text: "Get in Touch with Rojlo Support",
      },
      {
        id: "cont_2",
        type: "p",
        text: "Have a question or need help? Reach out to our customer care and support team. We are dedicated to ensuring a safe, transparent, and seamless experience on Rojlo.",
      },
      {
        id: "cont_3",
        type: "h3",
        text: "Email Support",
      },
      {
        id: "cont_4",
        type: "p",
        text: "For general inquiries, account verification, coin purchases, or technical assistance, reach us at support@rojlo.com.",
      },
      {
        id: "cont_5",
        type: "h3",
        text: "Telephone & Helpline",
      },
      {
        id: "cont_6",
        type: "p",
        text: "You can reach our telephone support desk at +91 98765 43210 during normal business hours for rapid escalation.",
      },
    ],
  },
};
