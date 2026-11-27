// Shared constants + registry for the SEO expansion pages (src/app/<slug>/page.tsx).
// Kept separate from layout.tsx's own copies to avoid touching the existing
// root layout — these are additive, standalone pages.

import { resolveSeoRedirect } from "@/lib/seoRedirects";

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
  { slug: "pakistan-bond-yields", label: "Pakistan Bond Yields" },
  // SEO Stage 2 (27 Nov 2026): market-data pages built on the validated interest-rate datasets, and the government debt page.
  { slug: "pakistan-kibor-rates", label: "KIBOR Rates in Pakistan" },
  { slug: "pakistan-t-bill-rates", label: "Pakistan T-Bill Rates" },
  { slug: "pakistan-government-debt", label: "Pakistan Government Debt" },
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
  // Complete Indicator Coverage & SEO Expansion — every KPI shown anywhere
  // in PEIC that previously had no detail page (see KPI_SEO_SLUG's comment).
  { slug: "pakistan-core-inflation", label: "Pakistan Core Inflation (NFNE)" },
  { slug: "pakistan-wholesale-inflation", label: "Pakistan Wholesale Inflation (WPI)" },
  { slug: "pakistan-bank-reserves", label: "Pakistan Bank Reserves" },
  { slug: "pakistan-money-supply", label: "Pakistan Money Supply (M2)" },
  { slug: "pakistan-exports", label: "Pakistan Exports" },
  { slug: "pakistan-imports", label: "Pakistan Imports" },
  { slug: "pakistan-real-effective-exchange-rate", label: "Pakistan Real Effective Exchange Rate (REER)" },
  { slug: "pakistan-lsm-growth", label: "Pakistan LSM Growth" },
  { slug: "pakistan-private-credit-growth", label: "Pakistan Private Credit Growth" },
  { slug: "silver-price-pakistan", label: "Silver Price in Pakistan" },
  { slug: "us-dollar-index", label: "US Dollar Index (DXY)" },
  { slug: "wti-crude-oil-price", label: "WTI Crude Oil Price" },
  { slug: "brent-crude-oil-price", label: "Brent Crude Oil Price" },
  { slug: "natural-gas-price", label: "Natural Gas Price" },
  { slug: "us-10-year-treasury-yield", label: "US 10-Year Treasury Yield" },
  { slug: "fed-funds-rate", label: "US Fed Funds Rate" },
];

// Maps a homepage Kpi's exact `title` string to the SEO page slug that
// covers it in depth — powers the "Learn More" link on KpiCard and
// IndicatorTable. Complete Indicator Coverage & SEO Expansion closed the
// last remaining gaps (Core/WPI Inflation, Bank Reserves, Money Supply,
// Exports, Imports, REER, LSM, Private Credit, Silver, DXY, WTI, Brent,
// Natural Gas, US10Y, Fed Funds) — every Kpi.title used anywhere in PEIC
// now has an entry here. Any future new indicator that's added without a
// corresponding entry will simply render without a "Learn more" link
// rather than 404ing, so this map staying complete is a discipline, not a
// hard requirement — but the goal is zero gaps going forward too.
export const KPI_SEO_SLUG: Record<string, string> = {
  "GDP Growth": "gdp-growth-pakistan",
  "Quarterly GDP Growth (YoY)": "gdp-growth-pakistan",
  "CPI Inflation": "inflation-rate-pakistan",
  "Core Inflation": "pakistan-core-inflation",
  "WPI Inflation": "pakistan-wholesale-inflation",
  "Foreign Reserves": "foreign-exchange-reserves-pakistan",
  "Bank Reserves": "pakistan-bank-reserves",
  "USD / PKR": "usd-pkr-exchange-rate",
  "Policy Rate": "pakistan-interest-rate",
  "Current Account": "current-account-deficit-pakistan",
  "3M T-Bill Yield": "pakistan-bond-yields",
  "3Y PIB Yield": "pakistan-bond-yields",
  "Pakistan ETF (NYSE: PAK)": "pakistan-stock-market",
  "Remittances": "pakistan-remittances",
  "Gold": "gold-price-pakistan",
  "Silver": "silver-price-pakistan",
  "Trade Balance": "pakistan-trade-deficit",
  "SAR / PKR": "sar-to-pkr-exchange-rate",
  "Fiscal Balance": "pakistan-fiscal-deficit",
  "FDI Inflows": "fdi-in-pakistan",
  "EUR / PKR": "eur-to-pkr-exchange-rate",
  "GBP / PKR": "gbp-to-pkr-exchange-rate",
  "Weekly Inflation (SPI)": "weekly-inflation-pakistan",
  "Money Supply (M2)": "pakistan-money-supply",
  "Exports": "pakistan-exports",
  "Imports": "pakistan-imports",
  "REER": "pakistan-real-effective-exchange-rate",
  "LSM Growth": "pakistan-lsm-growth",
  "Private Credit Growth": "pakistan-private-credit-growth",
  "US Dollar Index": "us-dollar-index",
  "WTI Crude": "wti-crude-oil-price",
  "Brent Crude": "brent-crude-oil-price",
  "Natural Gas": "natural-gas-price",
  "US 10Y Treasury": "us-10-year-treasury-yield",
  "Fed Funds Rate": "fed-funds-rate",
};

export function relatedSeoLinks(excludeSlug: string, slugs: string[]): { href: string; label: string }[] {
  return toLinks(excludeSlug, slugs);
}

/** Label of a link destination that is not an SEO indicator page. */
const OTHER_LABELS: Record<string, string> = { overview: "Pakistan Economy Dashboard (Overview)" };

/**
 * Slugs -> links: each slug is first followed through the SEO consolidations (src/lib/seoRedirects.ts) so no link points at a redirected URL, then
 * duplicates and the page itself are dropped, and only known destinations are kept.
 */
function toLinks(selfSlug: string, slugs: readonly string[]): { href: string; label: string }[] {
  const seen = new Set<string>();
  const out: { href: string; label: string }[] = [];
  for (const raw of slugs) {
    const slug = resolveSeoRedirect(`/${raw}`).slice(1);
    if (slug === selfSlug || seen.has(slug)) continue;
    const label = SEO_PAGES.find((p) => p.slug === slug)?.label ?? OTHER_LABELS[slug];
    if (!label) continue;
    seen.add(slug);
    out.push({ href: `/${slug}`, label });
  }
  return out;
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
//   - The Overview dashboard ("overview") appears on most pages because it is the natural "see all" destination (the two former hub pages
//     were consolidated into it, see src/lib/seoRedirects.ts)
export const RELATED_INDICATORS: Record<string, string[]> = {
  "pakistan-kibor-rates": [
    "pakistan-interest-rate",
    "pakistan-t-bill-rates",
    "pakistan-bond-yields",
    "inflation-rate-pakistan",
    "pakistan-private-credit-growth",
    "pakistan-money-supply",
  ],
  "pakistan-t-bill-rates": [
    "pakistan-interest-rate",
    "pakistan-kibor-rates",
    "pakistan-bond-yields",
    "pakistan-government-debt",
    "pakistan-fiscal-deficit",
    "inflation-rate-pakistan",
  ],
  "pakistan-government-debt": [
    "pakistan-fiscal-deficit",
    "pakistan-external-debt",
    "pakistan-t-bill-rates",
    "pakistan-bond-yields",
    "gdp-growth-pakistan",
    "pakistan-interest-rate",
    "foreign-exchange-reserves-pakistan",
  ],
  "gdp-growth-pakistan": [
    "inflation-rate-pakistan",
    "pakistan-fiscal-deficit",
    "pakistan-trade-deficit",
    "pakistan-stock-market",
    "fdi-in-pakistan",
    "pakistan-lsm-growth",
    "overview",
  ],
  "inflation-rate-pakistan": [
    "pakistan-interest-rate",
    "weekly-inflation-pakistan",
    "pakistan-food-inflation",
    "pakistan-core-inflation",
    "pakistan-wholesale-inflation",
    "usd-pkr-exchange-rate",
    "gdp-growth-pakistan",
    "overview",
  ],
  "pakistan-interest-rate": [
    "pakistan-kibor-rates",
    "pakistan-t-bill-rates",
    "inflation-rate-pakistan",
    "pakistan-bond-yields",
    "usd-pkr-exchange-rate",
    "current-account-deficit-pakistan",
    "pakistan-fiscal-deficit",
    "gold-price-pakistan",
    "pakistan-money-supply",
    "pakistan-private-credit-growth",
    "overview",
  ],
  "usd-pkr-exchange-rate": [
    "foreign-exchange-reserves-pakistan",
    "current-account-deficit-pakistan",
    "pakistan-remittances",
    "pakistan-external-debt",
    "eur-to-pkr-exchange-rate",
    "gbp-to-pkr-exchange-rate",
    "sar-to-pkr-exchange-rate",
    "pakistan-real-effective-exchange-rate",
    "overview",
  ],
  "foreign-exchange-reserves-pakistan": [
    "usd-pkr-exchange-rate",
    "current-account-deficit-pakistan",
    "pakistan-external-debt",
    "pakistan-remittances",
    "pakistan-trade-deficit",
    "pakistan-bank-reserves",
    "overview",
  ],
  "current-account-deficit-pakistan": [
    "pakistan-trade-deficit",
    "pakistan-remittances",
    "foreign-exchange-reserves-pakistan",
    "usd-pkr-exchange-rate",
    "fdi-in-pakistan",
    "pakistan-external-debt",
    "pakistan-real-effective-exchange-rate",
    "overview",
  ],
  "pakistan-bond-yields": [
    "pakistan-t-bill-rates",
    "pakistan-kibor-rates",
    "pakistan-interest-rate",
    "pakistan-fiscal-deficit",
    "pakistan-stock-market",
    "gold-price-pakistan",
    "usd-pkr-exchange-rate",
    "us-10-year-treasury-yield",
    "fed-funds-rate",
    "overview",
  ],
  "pakistan-stock-market": [
    "pakistan-bond-yields",
    "gdp-growth-pakistan",
    "fdi-in-pakistan",
    "usd-pkr-exchange-rate",
    "pakistan-interest-rate",
    "overview",
  ],
  "pakistan-remittances": [
    "current-account-deficit-pakistan",
    "usd-pkr-exchange-rate",
    "foreign-exchange-reserves-pakistan",
    "gbp-to-pkr-exchange-rate",
    "sar-to-pkr-exchange-rate",
    "overview",
  ],
  "gold-price-pakistan": [
    "usd-pkr-exchange-rate",
    "pakistan-interest-rate",
    "inflation-rate-pakistan",
    "pakistan-bond-yields",
    "silver-price-pakistan",
    "us-dollar-index",
    "overview",
  ],
  "pakistan-external-debt": [
    "pakistan-government-debt",
    "foreign-exchange-reserves-pakistan",
    "current-account-deficit-pakistan",
    "pakistan-fiscal-deficit",
    "usd-pkr-exchange-rate",
    "gdp-growth-pakistan",
    "overview",
  ],
  "pakistan-trade-deficit": [
    "current-account-deficit-pakistan",
    "usd-pkr-exchange-rate",
    "gdp-growth-pakistan",
    "fdi-in-pakistan",
    "foreign-exchange-reserves-pakistan",
    "pakistan-exports",
    "pakistan-imports",
    "overview",
  ],
  "sar-to-pkr-exchange-rate": [
    "usd-pkr-exchange-rate",
    "eur-to-pkr-exchange-rate",
    "gbp-to-pkr-exchange-rate",
    "pakistan-remittances",
    "foreign-exchange-reserves-pakistan",
    "overview",
  ],
  "pakistan-fiscal-deficit": [
    "pakistan-government-debt",
    "pakistan-bond-yields",
    "current-account-deficit-pakistan",
    "pakistan-external-debt",
    "gdp-growth-pakistan",
    "pakistan-interest-rate",
    "pakistan-private-credit-growth",
    "overview",
  ],
  "pakistan-food-inflation": [
    "inflation-rate-pakistan",
    "weekly-inflation-pakistan",
    "pakistan-interest-rate",
    "pakistan-core-inflation",
    "overview",
  ],
  "fdi-in-pakistan": [
    "pakistan-trade-deficit",
    "current-account-deficit-pakistan",
    "gdp-growth-pakistan",
    "pakistan-stock-market",
    "usd-pkr-exchange-rate",
    "overview",
  ],
  "eur-to-pkr-exchange-rate": [
    "usd-pkr-exchange-rate",
    "gbp-to-pkr-exchange-rate",
    "sar-to-pkr-exchange-rate",
    "pakistan-trade-deficit",
    "pakistan-remittances",
    "overview",
  ],
  "gbp-to-pkr-exchange-rate": [
    "usd-pkr-exchange-rate",
    "eur-to-pkr-exchange-rate",
    "pakistan-remittances",
    "sar-to-pkr-exchange-rate",
    "foreign-exchange-reserves-pakistan",
    "overview",
  ],
  "weekly-inflation-pakistan": [
    "inflation-rate-pakistan",
    "pakistan-food-inflation",
    "pakistan-interest-rate",
    "overview",
  ],
  // Complete Indicator Coverage & SEO Expansion — the 16 pages added to
  // close every remaining gap in KPI_SEO_SLUG.
  "pakistan-core-inflation": [
    "inflation-rate-pakistan",
    "pakistan-wholesale-inflation",
    "pakistan-interest-rate",
    "weekly-inflation-pakistan",
    "pakistan-food-inflation",
    "overview",
  ],
  "pakistan-wholesale-inflation": [
    "inflation-rate-pakistan",
    "pakistan-core-inflation",
    "pakistan-food-inflation",
    "usd-pkr-exchange-rate",
    "overview",
  ],
  "pakistan-bank-reserves": [
    "foreign-exchange-reserves-pakistan",
    "usd-pkr-exchange-rate",
    "current-account-deficit-pakistan",
    "overview",
  ],
  "pakistan-money-supply": [
    "inflation-rate-pakistan",
    "pakistan-private-credit-growth",
    "pakistan-interest-rate",
    "overview",
  ],
  "pakistan-exports": [
    "pakistan-imports",
    "pakistan-trade-deficit",
    "current-account-deficit-pakistan",
    "gdp-growth-pakistan",
    "overview",
  ],
  "pakistan-imports": [
    "pakistan-exports",
    "pakistan-trade-deficit",
    "usd-pkr-exchange-rate",
    "wti-crude-oil-price",
    "overview",
  ],
  "pakistan-real-effective-exchange-rate": [
    "usd-pkr-exchange-rate",
    "current-account-deficit-pakistan",
    "pakistan-trade-deficit",
    "foreign-exchange-reserves-pakistan",
    "overview",
  ],
  "pakistan-lsm-growth": [
    "gdp-growth-pakistan",
    "pakistan-private-credit-growth",
    "pakistan-interest-rate",
    "overview",
  ],
  "pakistan-private-credit-growth": [
    "pakistan-interest-rate",
    "pakistan-money-supply",
    "gdp-growth-pakistan",
    "pakistan-fiscal-deficit",
    "overview",
  ],
  "silver-price-pakistan": [
    "gold-price-pakistan",
    "usd-pkr-exchange-rate",
    "pakistan-interest-rate",
    "overview",
  ],
  "us-dollar-index": [
    "usd-pkr-exchange-rate",
    "gold-price-pakistan",
    "us-10-year-treasury-yield",
    "fed-funds-rate",
    "overview",
  ],
  "wti-crude-oil-price": [
    "brent-crude-oil-price",
    "natural-gas-price",
    "pakistan-imports",
    "pakistan-trade-deficit",
    "inflation-rate-pakistan",
    "overview",
  ],
  "brent-crude-oil-price": [
    "wti-crude-oil-price",
    "natural-gas-price",
    "pakistan-imports",
    "pakistan-trade-deficit",
    "inflation-rate-pakistan",
    "overview",
  ],
  "natural-gas-price": [
    "wti-crude-oil-price",
    "brent-crude-oil-price",
    "pakistan-imports",
    "pakistan-trade-deficit",
    "overview",
  ],
  "us-10-year-treasury-yield": [
    "fed-funds-rate",
    "us-dollar-index",
    "pakistan-bond-yields",
    "overview",
  ],
  "fed-funds-rate": [
    "us-10-year-treasury-yield",
    "us-dollar-index",
    "pakistan-interest-rate",
    "overview",
  ],
};

// Returns related indicator links for a given page slug, looked up from the
// comprehensive RELATED_INDICATORS graph. Zero manual lists in page files —
// adding a new entry to RELATED_INDICATORS is the only maintenance step.
export function getRelatedLinks(slug: string): { href: string; label: string }[] {
  return toLinks(slug, RELATED_INDICATORS[slug] ?? []);
}
