// Source Redundancy Engine — documents the intended Primary → Secondary →
// Fallback chain for every externally-sourced market-data KPI, and derives
// which tier is *currently* active from the KPI's own `source` string.
//
// This is intentionally a static registry, not a runtime detector — the
// actual fallback behavior already lives in each provider module
// (metals.ts, fred.ts, fxRates.ts, yfinance.ts); this file only documents
// that chain for the UI (KpiCard tooltip, DataSourcesModal audit table) and
// lets the audit table show which tier answered a given request.

export interface SourceChain {
  primary: string;
  secondary: string | null;
  fallback: string;
}

export const SOURCE_CHAINS: Record<string, SourceChain> = {
  Gold: { primary: "Twelve Data", secondary: "Yahoo Finance", fallback: "Static Snapshot" },
  Silver: { primary: "Twelve Data", secondary: "Yahoo Finance", fallback: "Static Snapshot" },
  "US Dollar Index": { primary: "Twelve Data", secondary: "Yahoo Finance", fallback: "Static Snapshot" },
  "WTI Crude": { primary: "Yahoo Finance", secondary: "FRED", fallback: "Static Snapshot" },
  "Brent Crude": { primary: "Yahoo Finance", secondary: "FRED", fallback: "Static Snapshot" },
  "Natural Gas": { primary: "Yahoo Finance", secondary: "FRED", fallback: "Static Snapshot" },
  "US 10Y Treasury": { primary: "FRED", secondary: "Yahoo Finance", fallback: "Static Snapshot" },
  "Fed Funds Rate": { primary: "FRED", secondary: null, fallback: "Static Snapshot" },
  "USD / PKR": { primary: "Yahoo Finance", secondary: null, fallback: "Static Snapshot" },
  "EUR / PKR": { primary: "Yahoo Finance", secondary: null, fallback: "Static Snapshot" },
  "GBP / PKR": { primary: "Yahoo Finance", secondary: null, fallback: "Static Snapshot" },
  "SAR / PKR": { primary: "Yahoo Finance", secondary: null, fallback: "Static Snapshot" },
  "Pakistan ETF (NYSE: PAK)": { primary: "Yahoo Finance", secondary: null, fallback: "Static Snapshot" },
};

export type ActiveTier = "primary" | "secondary" | "fallback" | "unknown";

/** Which tier of the chain actually answered, based on the KPI's live `source` string (e.g. "Yahoo Finance (fallback)"). */
export function getActiveTier(kpiTitle: string, activeSource: string | undefined): ActiveTier {
  const chain = SOURCE_CHAINS[kpiTitle];
  if (!chain || !activeSource) return "unknown";
  const normalized = activeSource.replace(/\s*\(fallback\)\s*$/i, "").trim();
  if (/offline|fallback/i.test(activeSource)) return "fallback";
  if (normalized === chain.primary) return "primary";
  if (chain.secondary && normalized === chain.secondary) return "secondary";
  if (normalized === chain.fallback) return "fallback";
  return "unknown";
}
