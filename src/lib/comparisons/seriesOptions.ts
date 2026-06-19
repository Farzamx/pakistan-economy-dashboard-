// Canonical list of every indicator the Indicator Selector (free-form
// "compare any two" picker) can offer — one entry per SeriesProviderId,
// independent of which pre-built comparisons in comparisonRegistry.ts
// happen to use it.

import type { ComparisonSeriesConfig, SeriesProviderId } from "./comparisonRegistry";

export const ALL_SERIES_OPTIONS: ComparisonSeriesConfig[] = [
  { id: "sbp:usdPkr", label: "USD / PKR Exchange Rate", shortLabel: "USD/PKR", unit: "PKR", color: "#38bdf8" },
  { id: "sbp:foreignReserves", label: "Foreign Exchange Reserves", shortLabel: "Forex Reserves", unit: "B USD", color: "#a855f7" },
  { id: "sbp:currentAccount", label: "Current Account Balance", shortLabel: "Current Account", unit: "B USD", color: "#a855f7" },
  { id: "sbp:exports", label: "Exports (Goods, FOB)", shortLabel: "Exports", unit: "B USD", color: "#34d399" },
  { id: "sbp:imports", label: "Imports (Goods, FOB)", shortLabel: "Imports", unit: "B USD", color: "#f59e0b" },
  { id: "sbp:tradeBalance", label: "Trade Balance", shortLabel: "Trade Balance", unit: "B USD", color: "#f59e0b" },
  { id: "sbp:policyRate", label: "SBP Policy Rate", shortLabel: "Policy Rate", unit: "%", color: "#38bdf8" },
  { id: "sbp:cpiInflation", label: "CPI Inflation (YoY)", shortLabel: "CPI Inflation", unit: "%", color: "#a855f7" },
  { id: "sbp:coreInflation", label: "Core Inflation (Urban NFNE, YoY)", shortLabel: "Core Inflation", unit: "%", color: "#34d399" },
  { id: "sbp:moneySupplyM2", label: "M2 Money Supply", shortLabel: "M2 Money Supply", unit: "T PKR", color: "#38bdf8" },
  { id: "sbp:tbillYield3m", label: "3-Month T-Bill Yield", shortLabel: "T-Bill Yield", unit: "%", color: "#a855f7" },
  { id: "worldbank:gdpGrowthPak", label: "Pakistan Real GDP Growth", shortLabel: "Pakistan GDP", unit: "%", color: "#a855f7" },
  { id: "worldbank:gdpGrowthIndia", label: "India Real GDP Growth", shortLabel: "India GDP", unit: "%", color: "#38bdf8" },
  { id: "worldbank:gdpGrowthBangladesh", label: "Bangladesh Real GDP Growth", shortLabel: "Bangladesh GDP", unit: "%", color: "#34d399" },
  { id: "fred:fedFunds", label: "US Federal Funds Rate", shortLabel: "Fed Funds Rate", unit: "%", color: "#38bdf8" },
  { id: "fred:usCpiInflation", label: "US CPI Inflation (YoY)", shortLabel: "US Inflation", unit: "%", color: "#38bdf8" },
  { id: "yfinance:gold", label: "Gold (USD/oz)", shortLabel: "Gold", unit: "$/oz", color: "#f59e0b" },
];

export function getSeriesOption(id: SeriesProviderId): ComparisonSeriesConfig {
  const found = ALL_SERIES_OPTIONS.find((o) => o.id === id);
  if (!found) throw new Error(`Unknown series id: ${id}`);
  return found;
}
