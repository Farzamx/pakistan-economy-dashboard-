// Canonical list of every indicator the Indicator Selector (free-form
// "compare any two" picker) can offer — one entry per SeriesProviderId,
// independent of which pre-built comparisons in comparisonRegistry.ts
// happen to use it.
//
// Phase 8.20: unit/frequency are no longer hand-typed here — every entry is
// built via comparisonRegistry.ts's comparisonSeriesConfig(), the same
// helper COMPARISONS itself uses, which derives both fields from
// SERIES_CATALOG (src/lib/seriesDefinition.ts). This file previously
// carried its own independent copy of every series' unit/frequency,
// confirmed (Phase 8.19 audit) to already agree with comparisonRegistry.ts's
// own copy in every case, but with nothing enforcing that agreement going
// forward — this eliminates that duplication rather than merely
// re-verifying it stayed accidentally correct.

import { comparisonSeriesConfig, type ComparisonSeriesConfig, type SeriesProviderId } from "./comparisonRegistry";

export const ALL_SERIES_OPTIONS: ComparisonSeriesConfig[] = [
  comparisonSeriesConfig("sbp:usdPkr", "USD / PKR Exchange Rate", "USD/PKR", "#38bdf8"),
  comparisonSeriesConfig("sbp:foreignReserves", "Total SBP Reserves (Monthly, incl. gold/SDR)", "Total SBP Reserves", "#a855f7"),
  comparisonSeriesConfig("sbp:currentAccount", "Current Account Balance", "Current Account", "#a855f7"),
  comparisonSeriesConfig("sbp:exports", "Exports (Goods, FOB)", "Exports", "#34d399"),
  comparisonSeriesConfig("sbp:imports", "Imports (Goods, FOB)", "Imports", "#f59e0b"),
  comparisonSeriesConfig("sbp:tradeBalance", "Trade Balance", "Trade Balance", "#f59e0b"),
  comparisonSeriesConfig("sbp:policyRate", "SBP Policy Rate", "Policy Rate", "#38bdf8"),
  comparisonSeriesConfig("sbp:cpiInflation", "CPI Inflation (YoY)", "CPI Inflation", "#a855f7"),
  comparisonSeriesConfig("sbp:coreInflation", "Core Inflation (Urban NFNE, YoY)", "Core Inflation", "#34d399"),
  comparisonSeriesConfig("sbp:moneySupplyM2", "M2 Money Supply", "M2 Money Supply", "#38bdf8"),
  comparisonSeriesConfig("sbp:tbillYield3m", "3-Month T-Bill Yield", "T-Bill Yield", "#a855f7"),
  comparisonSeriesConfig("worldbank:gdpGrowthPak", "Pakistan Real GDP Growth", "Pakistan GDP", "#a855f7"),
  comparisonSeriesConfig("worldbank:gdpGrowthIndia", "India Real GDP Growth", "India GDP", "#38bdf8"),
  comparisonSeriesConfig("worldbank:gdpGrowthBangladesh", "Bangladesh Real GDP Growth", "Bangladesh GDP", "#34d399"),
  comparisonSeriesConfig("fred:fedFunds", "US Federal Funds Rate", "Fed Funds Rate", "#38bdf8"),
  comparisonSeriesConfig("fred:usCpiInflation", "US CPI Inflation (YoY)", "US Inflation", "#38bdf8"),
  comparisonSeriesConfig("yfinance:gold", "Gold (USD/oz)", "Gold", "#f59e0b"),
  comparisonSeriesConfig("sbp:foodInflationUrban", "Urban Food CPI (YoY)", "Urban Food Inflation", "#34d399"),
  comparisonSeriesConfig("sbp:externalDebt", "Total External Debt & Liabilities", "External Debt", "#f59e0b"),
];

export function getSeriesOption(id: SeriesProviderId): ComparisonSeriesConfig {
  const found = ALL_SERIES_OPTIONS.find((o) => o.id === id);
  if (!found) throw new Error(`Unknown series id: ${id}`);
  return found;
}
