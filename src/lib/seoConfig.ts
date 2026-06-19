// Shared constants + registry for the SEO expansion pages (src/app/<slug>/page.tsx).
// Kept separate from layout.tsx's own copies to avoid touching the existing
// root layout — these are additive, standalone pages.

export const SITE_URL = "https://pakeconintel.com";
export const SITE_NAME = "Pakistan Economic Intelligence Center";

export interface SeoPageMeta {
  slug: string;
  label: string;
}

// Every SEO expansion page, used to build "related pages" internal links
// without each page needing to hardcode the full list.
export const SEO_PAGES: SeoPageMeta[] = [
  { slug: "gdp-growth-pakistan", label: "Pakistan GDP Growth" },
  { slug: "inflation-rate-pakistan", label: "Pakistan Inflation Rate" },
  { slug: "pakistan-interest-rate", label: "Pakistan Interest Rate" },
  { slug: "usd-pkr-exchange-rate", label: "USD to PKR Exchange Rate" },
  { slug: "foreign-exchange-reserves-pakistan", label: "Pakistan Foreign Exchange Reserves" },
  { slug: "current-account-deficit-pakistan", label: "Pakistan Current Account Deficit" },
  { slug: "pakistan-stock-market", label: "Pakistan Stock Market (PSX)" },
  { slug: "pakistan-economic-indicators", label: "Pakistan Economic Indicators" },
  { slug: "pakistan-bond-yields", label: "Pakistan Bond Yields" },
  { slug: "pakistan-economic-dashboard", label: "Pakistan Economic Dashboard" },
];

export function relatedSeoLinks(excludeSlug: string, slugs: string[]): { href: string; label: string }[] {
  return SEO_PAGES.filter((p) => slugs.includes(p.slug) && p.slug !== excludeSlug).map((p) => ({
    href: `/${p.slug}`,
    label: p.label,
  }));
}
