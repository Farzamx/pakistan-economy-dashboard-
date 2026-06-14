export type Trend = "up" | "down";

export interface Kpi {
  title: string;
  value: string;
  unit: string;
  change: string;
  trend: Trend;
  glow: "blue" | "purple";
}

// Fallback data, used by getKpiData() in src/lib/data/worldBank.ts if the
// World Bank API is unreachable, so the dashboard never shows a broken state.
export const fallbackKpiData: Kpi[] = [
  {
    title: "GDP Growth",
    value: "2.5",
    unit: "%",
    change: "+0.3% vs last quarter",
    trend: "up",
    glow: "blue",
  },
  {
    title: "Inflation",
    value: "11.8",
    unit: "%",
    change: "-1.2% vs last month",
    trend: "down",
    glow: "purple",
  },
  {
    title: "Foreign Reserves",
    value: "9.4",
    unit: "B USD",
    change: "+0.6B vs last month",
    trend: "up",
    glow: "blue",
  },
  {
    title: "USD / PKR",
    value: "278.50",
    unit: "PKR",
    change: "+0.85 vs yesterday",
    trend: "up",
    glow: "purple",
  },
  {
    title: "Remittances",
    value: "3.1",
    unit: "B USD",
    change: "+4.7% year over year",
    trend: "up",
    glow: "blue",
  },
];
