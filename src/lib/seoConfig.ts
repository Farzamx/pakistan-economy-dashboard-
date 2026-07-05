// Shared constants + registry for the SEO expansion pages (src/app/<slug>/page.tsx).
// Kept separate from layout.tsx's own copies to avoid touching the existing
// root layout — these are additive, standalone pages.

export const SITE_URL = "https://www.pakeconintel.com";
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
  // SEO Phase 1 (added once each had verified, real data behind it)
  { slug: "pakistan-remittances", label: "Pakistan Remittances" },
  { slug: "gold-price-pakistan", label: "Gold Price in Pakistan" },
  { slug: "pakistan-external-debt", label: "Pakistan External Debt" },
  { slug: "pakistan-trade-deficit", label: "Pakistan Trade Deficit" },
  { slug: "sar-to-pkr-exchange-rate", label: "SAR to PKR Exchange Rate" },
  { slug: "pakistan-fiscal-deficit", label: "Pakistan Fiscal Deficit" },
  { slug: "pakistan-food-inflation", label: "Pakistan Food Inflation" },
  { slug: "fdi-in-pakistan", label: "FDI in Pakistan" },
  { slug: "eur-to-pkr-exchange-rate", label: "EUR to PKR Exchange Rate" },
  { slug: "gbp-to-pkr-exchange-rate", label: "GBP to PKR Exchange Rate" },
  { slug: "weekly-inflation-pakistan", label: "Pakistan Weekly Inflation (SPI)" },
  { slug: "spi-index-pakistan", label: "Pakistan SPI Index" },
];

// Maps a homepage Kpi's exact `title` string to the SEO page slug that
// covers it in depth — powers the "Learn More" link on KpiCard. Cards
// whose title has no entry here (e.g. Natural Gas, REER, Silver) simply
// render without the link rather than pointing at an unrelated page.
export const KPI_SEO_SLUG: Record<string, string> = {
  "GDP Growth": "gdp-growth-pakistan",
  "Quarterly GDP Growth (YoY)": "gdp-growth-pakistan",
  "CPI Inflation": "inflation-rate-pakistan",
  "Foreign Reserves": "foreign-exchange-reserves-pakistan",
  "USD / PKR": "usd-pkr-exchange-rate",
  "Policy Rate": "pakistan-interest-rate",
  "Current Account": "current-account-deficit-pakistan",
  "3M T-Bill Yield": "pakistan-bond-yields",
  "3Y PIB Yield": "pakistan-bond-yields",
  "Pakistan ETF (NYSE: PAK)": "pakistan-stock-market",
  "Remittances": "pakistan-remittances",
  "Gold": "gold-price-pakistan",
  "Trade Balance": "pakistan-trade-deficit",
  "SAR / PKR": "sar-to-pkr-exchange-rate",
  "Fiscal Balance": "pakistan-fiscal-deficit",
  "FDI Inflows": "fdi-in-pakistan",
  "EUR / PKR": "eur-to-pkr-exchange-rate",
  "GBP / PKR": "gbp-to-pkr-exchange-rate",
  "Weekly Inflation (SPI)": "weekly-inflation-pakistan",
};

export function relatedSeoLinks(excludeSlug: string, slugs: string[]): { href: string; label: string }[] {
  return SEO_PAGES.filter((p) => slugs.includes(p.slug) && p.slug !== excludeSlug).map((p) => ({
    href: `/${p.slug}`,
    label: p.label,
  }));
}

// Comprehensive bidirectional relationship graph — defines which indicator
// pages are meaningfully related to each other. Drives getRelatedLinks() so
// pages never need manual slug lists: adding a new page here automatically
// surfaces it on every related page without touching page.tsx files.
//
// Design rules:
//   - Max 8 related slugs per page (enough to be useful, not overwhelming)
//   - Order by thematic proximity, not alphabetically
//   - If A lists B, B should list A (bidirectional consistency)
//   - Hub pages (economic-indicators, economic-dashboard) appear on most pages
//     because they are the natural "see all" destination
export const RELATED_INDICATORS: Record<string, string[]> = {
  "gdp-growth-pakistan": [
    "inflation-rate-pakistan",
    "pakistan-fiscal-deficit",
    "pakistan-trade-deficit",
    "pakistan-stock-market",
    "fdi-in-pakistan",
    "pakistan-economic-indicators",
    "pakistan-economic-dashboard",
  ],
  "inflation-rate-pakistan": [
    "pakistan-interest-rate",
    "weekly-inflation-pakistan",
    "pakistan-food-inflation",
    "spi-index-pakistan",
    "usd-pkr-exchange-rate",
    "gdp-growth-pakistan",
    "pakistan-economic-indicators",
  ],
  "pakistan-interest-rate": [
    "inflation-rate-pakistan",
    "pakistan-bond-yields",
    "usd-pkr-exchange-rate",
    "current-account-deficit-pakistan",
    "pakistan-fiscal-deficit",
    "gold-price-pakistan",
    "pakistan-economic-indicators",
  ],
  "usd-pkr-exchange-rate": [
    "foreign-exchange-reserves-pakistan",
    "current-account-deficit-pakistan",
    "pakistan-remittances",
    "pakistan-external-debt",
    "eur-to-pkr-exchange-rate",
    "gbp-to-pkr-exchange-rate",
    "sar-to-pkr-exchange-rate",
    "pakistan-economic-indicators",
  ],
  "foreign-exchange-reserves-pakistan": [
    "usd-pkr-exchange-rate",
    "current-account-deficit-pakistan",
    "pakistan-external-debt",
    "pakistan-remittances",
    "pakistan-trade-deficit",
    "pakistan-economic-indicators",
  ],
  "current-account-deficit-pakistan": [
    "pakistan-trade-deficit",
    "pakistan-remittances",
    "foreign-exchange-reserves-pakistan",
    "usd-pkr-exchange-rate",
    "fdi-in-pakistan",
    "pakistan-external-debt",
    "pakistan-economic-indicators",
  ],
  "pakistan-bond-yields": [
    "pakistan-interest-rate",
    "pakistan-fiscal-deficit",
    "pakistan-stock-market",
    "gold-price-pakistan",
    "usd-pkr-exchange-rate",
    "pakistan-economic-indicators",
  ],
  "pakistan-stock-market": [
    "pakistan-bond-yields",
    "gdp-growth-pakistan",
    "fdi-in-pakistan",
    "usd-pkr-exchange-rate",
    "pakistan-interest-rate",
    "pakistan-economic-indicators",
    "pakistan-economic-dashboard",
  ],
  "pakistan-economic-indicators": [
    "gdp-growth-pakistan",
    "inflation-rate-pakistan",
    "pakistan-interest-rate",
    "foreign-exchange-reserves-pakistan",
    "usd-pkr-exchange-rate",
    "pakistan-trade-deficit",
    "pakistan-external-debt",
    "pakistan-economic-dashboard",
  ],
  "pakistan-economic-dashboard": [
    "pakistan-economic-indicators",
    "gdp-growth-pakistan",
    "inflation-rate-pakistan",
    "usd-pkr-exchange-rate",
    "foreign-exchange-reserves-pakistan",
    "pakistan-interest-rate",
    "pakistan-stock-market",
  ],
  "pakistan-remittances": [
    "current-account-deficit-pakistan",
    "usd-pkr-exchange-rate",
    "foreign-exchange-reserves-pakistan",
    "gbp-to-pkr-exchange-rate",
    "sar-to-pkr-exchange-rate",
    "pakistan-economic-indicators",
  ],
  "gold-price-pakistan": [
    "usd-pkr-exchange-rate",
    "pakistan-interest-rate",
    "inflation-rate-pakistan",
    "pakistan-bond-yields",
    "pakistan-economic-indicators",
  ],
  "pakistan-external-debt": [
    "foreign-exchange-reserves-pakistan",
    "current-account-deficit-pakistan",
    "pakistan-fiscal-deficit",
    "usd-pkr-exchange-rate",
    "gdp-growth-pakistan",
    "pakistan-economic-indicators",
  ],
  "pakistan-trade-deficit": [
    "current-account-deficit-pakistan",
    "usd-pkr-exchange-rate",
    "gdp-growth-pakistan",
    "fdi-in-pakistan",
    "foreign-exchange-reserves-pakistan",
    "pakistan-economic-indicators",
  ],
  "sar-to-pkr-exchange-rate": [
    "usd-pkr-exchange-rate",
    "eur-to-pkr-exchange-rate",
    "gbp-to-pkr-exchange-rate",
    "pakistan-remittances",
    "foreign-exchange-reserves-pakistan",
    "pakistan-economic-indicators",
  ],
  "pakistan-fiscal-deficit": [
    "pakistan-bond-yields",
    "current-account-deficit-pakistan",
    "pakistan-external-debt",
    "gdp-growth-pakistan",
    "pakistan-interest-rate",
    "pakistan-economic-indicators",
  ],
  "pakistan-food-inflation": [
    "inflation-rate-pakistan",
    "weekly-inflation-pakistan",
    "spi-index-pakistan",
    "pakistan-interest-rate",
    "pakistan-economic-indicators",
  ],
  "fdi-in-pakistan": [
    "pakistan-trade-deficit",
    "current-account-deficit-pakistan",
    "gdp-growth-pakistan",
    "pakistan-stock-market",
    "usd-pkr-exchange-rate",
    "pakistan-economic-indicators",
  ],
  "eur-to-pkr-exchange-rate": [
    "usd-pkr-exchange-rate",
    "gbp-to-pkr-exchange-rate",
    "sar-to-pkr-exchange-rate",
    "pakistan-trade-deficit",
    "pakistan-remittances",
    "pakistan-economic-indicators",
  ],
  "gbp-to-pkr-exchange-rate": [
    "usd-pkr-exchange-rate",
    "eur-to-pkr-exchange-rate",
    "pakistan-remittances",
    "sar-to-pkr-exchange-rate",
    "foreign-exchange-reserves-pakistan",
    "pakistan-economic-indicators",
  ],
  "weekly-inflation-pakistan": [
    "inflation-rate-pakistan",
    "spi-index-pakistan",
    "pakistan-food-inflation",
    "pakistan-interest-rate",
    "pakistan-economic-indicators",
  ],
  "spi-index-pakistan": [
    "weekly-inflation-pakistan",
    "inflation-rate-pakistan",
    "pakistan-food-inflation",
    "pakistan-interest-rate",
    "pakistan-economic-indicators",
  ],
};

// Returns related indicator links for a given page slug, looked up from the
// comprehensive RELATED_INDICATORS graph. Zero manual lists in page files —
// adding a new entry to RELATED_INDICATORS is the only maintenance step.
export function getRelatedLinks(slug: string): { href: string; label: string }[] {
  const related = RELATED_INDICATORS[slug] ?? [];
  return related
    .filter((s) => s !== slug)
    .map((s) => {
      const page = SEO_PAGES.find((p) => p.slug === s);
      return page ? { href: `/${s}`, label: page.label } : null;
    })
    .filter((link): link is { href: string; label: string } => link !== null);
}
