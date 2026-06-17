import type { DataFrequency } from "@/lib/dataFreshness";

export type Trend = "up" | "down";

export interface Kpi {
  title: string;
  value: string;
  unit: string;
  change: string;
  trend: Trend;
  glow: "blue" | "purple";
  // Source transparency — populated by every live data provider.
  // Optional only for backwards compat; all current providers set these.
  source?: string;
  seriesId?: string;
  latestDate?: string;   // "YYYY-MM-DD" or "YYYY" (annual)
  frequency?: DataFrequency;
}

// Fallback used by getGdpKpi() in src/lib/data/worldBank.ts when the API
// is unreachable, so the dashboard never shows a broken state.
export const fallbackGdpKpi: Kpi = {
  title: "GDP Growth",
  value: "2.5",
  unit: "%",
  change: "+0.3 pp vs 2022",
  trend: "up",
  glow: "blue",
  source: "World Bank",
  seriesId: "NY.GDP.MKTP.KD.ZG",
  latestDate: "2023",
  frequency: "Annual",
};

// Fallback used by getQuarterlyGdpKpi() when the SBP QGDP.xlsx is unreachable.
export const fallbackQuarterlyGdpKpi: Kpi = {
  title: "Quarterly GDP Growth (YoY)",
  value: "3.99",
  unit: "%",
  change: "-0.06 pp vs Q2 FY26",
  trend: "down",
  glow: "blue",
  source: "SBP / PBS",
  seriesId: "QGDP.xlsx / Growth_Q / row D.",
  latestDate: "2026-03-31",
  frequency: "Quarterly",
};
