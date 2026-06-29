// Indicator Connection Engine — connects the Economic Calendar to the rest
// of EIC. Two distinct things live here:
//  - getRelatedDashboard: ONE primary "go deeper" link per series.
//  - getAffectedIndicators: a short list of OTHER indicators this release
//    typically moves, each linking to its own EIC page where one exists —
//    hand-curated against the real page slugs in seoConfig.ts (and /budget,
//    which predates SEO_PAGES) rather than derived heuristically, so every
//    link points at content that's actually topically related. An entry
//    with no matching page (e.g. "Banking Sector", "Real Interest Rate" —
//    neither has a standalone page) is still listed, just without a link.

import { SEO_PAGES } from "@/lib/seoConfig";

export interface IndicatorLink {
  label: string;
  href: string | null;
}

function page(slug: string): string | null {
  return SEO_PAGES.some((p) => p.slug === slug) ? `/${slug}` : null;
}

interface SeriesConnections {
  dashboard: { label: string; href: string };
  affected: IndicatorLink[];
}

const CONNECTIONS: Record<string, SeriesConnections> = {
  "cpi-inflation-release": {
    dashboard: { label: "Inflation Dashboard", href: "/inflation-rate-pakistan" },
    affected: [
      { label: "Policy Rate", href: page("pakistan-interest-rate") },
      { label: "Bond Yields", href: page("pakistan-bond-yields") },
      { label: "USD/PKR", href: page("usd-pkr-exchange-rate") },
      { label: "KSE-100", href: page("pakistan-stock-market") },
      { label: "Real Interest Rate", href: null },
    ],
  },
  "core-inflation-release": {
    dashboard: { label: "Inflation Dashboard", href: "/inflation-rate-pakistan" },
    affected: [
      { label: "Policy Rate", href: page("pakistan-interest-rate") },
      { label: "CPI Inflation", href: page("inflation-rate-pakistan") },
      { label: "Real Interest Rate", href: null },
    ],
  },
  "spi-weekly-inflation-release": {
    dashboard: { label: "Weekly Inflation Dashboard", href: "/weekly-inflation-pakistan" },
    affected: [
      { label: "CPI Inflation", href: page("inflation-rate-pakistan") },
      { label: "Food Inflation", href: page("pakistan-food-inflation") },
    ],
  },
  "sbp-monetary-policy-committee-meeting": {
    dashboard: { label: "Interest Rate Dashboard", href: "/pakistan-interest-rate" },
    affected: [
      { label: "Policy Rate", href: page("pakistan-interest-rate") },
      { label: "PIB Yields", href: page("pakistan-bond-yields") },
      { label: "T-Bill Yields", href: page("pakistan-bond-yields") },
      { label: "Banking Sector", href: null },
      { label: "KSE-100", href: page("pakistan-stock-market") },
    ],
  },
  "sbp-foreign-exchange-reserves": {
    dashboard: { label: "Reserves Dashboard", href: "/foreign-exchange-reserves-pakistan" },
    affected: [
      { label: "USD/PKR", href: page("usd-pkr-exchange-rate") },
      { label: "Current Account", href: page("current-account-deficit-pakistan") },
      { label: "External Debt", href: page("pakistan-external-debt") },
    ],
  },
  "trade-balance": {
    dashboard: { label: "Trade Dashboard", href: "/pakistan-trade-deficit" },
    affected: [
      { label: "USD/PKR", href: page("usd-pkr-exchange-rate") },
      { label: "Current Account", href: page("current-account-deficit-pakistan") },
      { label: "FX Reserves", href: page("foreign-exchange-reserves-pakistan") },
    ],
  },
  "current-account-balance": {
    dashboard: { label: "External Sector Dashboard", href: "/current-account-deficit-pakistan" },
    affected: [
      { label: "FX Reserves", href: page("foreign-exchange-reserves-pakistan") },
      { label: "USD/PKR", href: page("usd-pkr-exchange-rate") },
      { label: "External Debt", href: page("pakistan-external-debt") },
    ],
  },
  "worker-remittances": {
    dashboard: { label: "Remittances Dashboard", href: "/pakistan-remittances" },
    affected: [
      { label: "Current Account", href: page("current-account-deficit-pakistan") },
      { label: "FX Reserves", href: page("foreign-exchange-reserves-pakistan") },
      { label: "USD/PKR", href: page("usd-pkr-exchange-rate") },
    ],
  },
  "gdp-growth-release": {
    dashboard: { label: "GDP Dashboard", href: "/gdp-growth-pakistan" },
    affected: [
      { label: "LSM Growth", href: null },
      { label: "Fiscal Deficit", href: page("pakistan-fiscal-deficit") },
      { label: "KSE-100", href: page("pakistan-stock-market") },
    ],
  },
  "large-scale-manufacturing-lsm-growth": {
    dashboard: { label: "GDP Dashboard", href: "/gdp-growth-pakistan" },
    affected: [
      { label: "GDP Growth", href: page("gdp-growth-pakistan") },
      { label: "KSE-100", href: page("pakistan-stock-market") },
    ],
  },
  "treasury-bill-auction-3m": {
    dashboard: { label: "Bond Yields Dashboard", href: "/pakistan-bond-yields" },
    affected: [
      { label: "Policy Rate", href: page("pakistan-interest-rate") },
      { label: "PIB Yields", href: page("pakistan-bond-yields") },
      { label: "Banking Sector", href: null },
    ],
  },
  "treasury-bill-auction-6m": {
    dashboard: { label: "Bond Yields Dashboard", href: "/pakistan-bond-yields" },
    affected: [
      { label: "Policy Rate", href: page("pakistan-interest-rate") },
      { label: "3M T-Bill Yield", href: page("pakistan-bond-yields") },
    ],
  },
  "treasury-bill-auction-12m": {
    dashboard: { label: "Bond Yields Dashboard", href: "/pakistan-bond-yields" },
    affected: [
      { label: "Policy Rate", href: page("pakistan-interest-rate") },
      { label: "PIB Yields", href: page("pakistan-bond-yields") },
    ],
  },
  "pib-auction": {
    dashboard: { label: "Bond Yields Dashboard", href: "/pakistan-bond-yields" },
    affected: [
      { label: "Policy Rate", href: page("pakistan-interest-rate") },
      { label: "T-Bill Yields", href: page("pakistan-bond-yields") },
      { label: "Fiscal Deficit", href: page("pakistan-fiscal-deficit") },
    ],
  },
  "sbp-monetary-policy-report": {
    dashboard: { label: "Interest Rate Dashboard", href: "/pakistan-interest-rate" },
    affected: [
      { label: "Policy Rate", href: page("pakistan-interest-rate") },
      { label: "CPI Inflation", href: page("inflation-rate-pakistan") },
    ],
  },
};

export function getRelatedDashboard(seriesSlug: string): { label: string; href: string } | null {
  return CONNECTIONS[seriesSlug]?.dashboard ?? null;
}

export function getAffectedIndicators(seriesSlug: string): IndicatorLink[] {
  return CONNECTIONS[seriesSlug]?.affected ?? [];
}
