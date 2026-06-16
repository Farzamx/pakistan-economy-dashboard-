import type { Kpi } from "./kpiData";

// Fallback data, used by src/lib/data/fred.ts and src/lib/data/metals.ts if
// the FRED / Twelve Data APIs are unreachable or the relevant API key
// (FRED_API_KEY / TWELVEDATA_API_KEY) is missing, so the dashboard never
// shows a broken state.
//
// Approximate snapshot values as of 2026-06-15 — will be replaced by live
// figures automatically once the API keys are configured in .env.local.

export const fallbackGoldKpi: Kpi = {
  title: "Gold",
  value: "3,150.40",
  unit: "$/oz",
  change: "+12.80 vs prior day",
  trend: "up",
  glow: "blue",
};

export const fallbackSilverKpi: Kpi = {
  title: "Silver",
  value: "36.15",
  unit: "$/oz",
  change: "+0.32 vs prior day",
  trend: "up",
  glow: "purple",
};

export const fallbackWtiKpi: Kpi = {
  title: "WTI Crude",
  value: "67.80",
  unit: "$/bbl",
  change: "-0.65 vs prior day",
  trend: "down",
  glow: "blue",
};

export const fallbackBrentKpi: Kpi = {
  title: "Brent Crude",
  value: "71.95",
  unit: "$/bbl",
  change: "-0.58 vs prior day",
  trend: "down",
  glow: "purple",
};

export const fallbackNatGasKpi: Kpi = {
  title: "Natural Gas",
  value: "3.22",
  unit: "$/MMBtu",
  change: "+0.07 vs prior day",
  trend: "up",
  glow: "blue",
};

export const fallbackDxyKpi: Kpi = {
  title: "US Dollar Index",
  value: "98.45",
  unit: "DXY",
  change: "-0.21 vs prior day",
  trend: "down",
  glow: "purple",
};

export const fallbackUs10yKpi: Kpi = {
  title: "US 10Y Treasury",
  value: "4.36",
  unit: "%",
  change: "+0.02 pp vs prior day",
  trend: "up",
  glow: "blue",
};

export const fallbackFedFundsKpi: Kpi = {
  title: "Fed Funds Rate",
  value: "3.83",
  unit: "%",
  change: "+0.00 pp vs prior day",
  trend: "up",
  glow: "purple",
};
