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
