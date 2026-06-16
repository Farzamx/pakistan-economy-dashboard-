import type { Kpi } from "./kpiData";

// Emergency static fallback — shown only if BOTH the primary API (Twelve Data /
// FRED) AND the secondary free API (Yahoo Finance) fail simultaneously.
//
// FRED-sourced values (WTI, Brent, Natural Gas, US 10Y, Fed Funds) reflect the
// latest FRED observations as of 2026-06-12 (retrieved Jun 16 2026).
// Yahoo Finance-sourced values (Gold, Silver, DXY) reflect Jun 16 2026 prices.
// These update automatically once any live source reconnects.

export const fallbackGoldKpi: Kpi = {
  title: "Gold",
  value: "4,366.20",
  unit: "$/oz",
  change: "offline — last known Jun 16",
  trend: "up",
  glow: "blue",
  source: "Yahoo Finance",
  seriesId: "GC=F",
  latestDate: "2026-06-16",
  frequency: "Hourly",
};

export const fallbackSilverKpi: Kpi = {
  title: "Silver",
  value: "70.57",
  unit: "$/oz",
  change: "offline — last known Jun 16",
  trend: "up",
  glow: "purple",
  source: "Yahoo Finance",
  seriesId: "SI=F",
  latestDate: "2026-06-16",
  frequency: "Hourly",
};

export const fallbackWtiKpi: Kpi = {
  title: "WTI Crude",
  value: "95.00",
  unit: "$/bbl",
  change: "offline — FRED Jun 8",
  trend: "up",
  glow: "blue",
  source: "FRED",
  seriesId: "DCOILWTICO",
  latestDate: "2026-06-08",
  frequency: "Daily",
};

export const fallbackBrentKpi: Kpi = {
  title: "Brent Crude",
  value: "97.46",
  unit: "$/bbl",
  change: "offline — FRED Jun 8",
  trend: "up",
  glow: "purple",
  source: "FRED",
  seriesId: "DCOILBRENTEU",
  latestDate: "2026-06-08",
  frequency: "Daily",
};

export const fallbackNatGasKpi: Kpi = {
  title: "Natural Gas",
  value: "3.10",
  unit: "$/MMBtu",
  change: "offline — FRED Jun 8",
  trend: "up",
  glow: "blue",
  source: "FRED",
  seriesId: "DHHNGSP",
  latestDate: "2026-06-08",
  frequency: "Daily",
};

export const fallbackDxyKpi: Kpi = {
  title: "US Dollar Index",
  value: "99.61",
  unit: "DXY",
  change: "offline — last known Jun 16",
  trend: "up",
  glow: "purple",
  source: "Yahoo Finance",
  seriesId: "DX-Y.NYB",
  latestDate: "2026-06-16",
  frequency: "Hourly",
};

export const fallbackUs10yKpi: Kpi = {
  title: "US 10Y Treasury",
  value: "4.48",
  unit: "%",
  change: "offline — FRED Jun 12",
  trend: "up",
  glow: "blue",
  source: "FRED",
  seriesId: "DGS10",
  latestDate: "2026-06-12",
  frequency: "Daily",
};

export const fallbackFedFundsKpi: Kpi = {
  title: "Fed Funds Rate",
  value: "3.62",
  unit: "%",
  change: "offline — FRED Jun 12",
  trend: "up",
  glow: "purple",
  source: "FRED",
  seriesId: "DFF",
  latestDate: "2026-06-12",
  frequency: "Daily",
};

export const fallbackPakEtfKpi: Kpi = {
  title: "Pakistan ETF (NYSE: PAK)",
  value: "16.79",
  unit: "$",
  change: "offline — last known Jun 16",
  trend: "up",
  glow: "blue",
  source: "Yahoo Finance",
  seriesId: "PAK",
  latestDate: "2026-06-16",
  frequency: "Hourly",
};
