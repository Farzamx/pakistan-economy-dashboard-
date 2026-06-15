export type Trend = "up" | "down";

export interface Kpi {
  title: string;
  value: string;
  unit: string;
  change: string;
  trend: Trend;
  glow: "blue" | "purple";
}

// Fallback data, used by getGdpKpi() in src/lib/data/worldBank.ts if the
// World Bank API is unreachable, so the dashboard never shows a broken state.
export const fallbackGdpKpi: Kpi = {
  title: "GDP Growth",
  value: "2.5",
  unit: "%",
  change: "+0.3% vs last quarter",
  trend: "up",
  glow: "blue",
};
