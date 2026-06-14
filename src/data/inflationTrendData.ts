import type { TrendPoint } from "@/components/charts/TrendLineChart";

// Mock monthly CPI inflation (YoY %) for Phase 1.5, ending at the same
// 11.8% shown on the Inflation KPI card.
//
// Later: replace this static array with data fetched from the SBP/PBS
// API — keep the same `{ month, value }[]` shape and TrendLineChart
// needs no changes, e.g.:
//
//   export async function getInflationTrend(): Promise<TrendPoint[]> {
//     const res = await fetch("https://api.sbp.org.pk/...");
//     return res.json();
//   }
export const inflationTrend: TrendPoint[] = [
  { month: "Jul", value: 28.3 },
  { month: "Aug", value: 27.4 },
  { month: "Sep", value: 24.5 },
  { month: "Oct", value: 20.7 },
  { month: "Nov", value: 17.0 },
  { month: "Dec", value: 15.4 },
  { month: "Jan", value: 14.5 },
  { month: "Feb", value: 13.8 },
  { month: "Mar", value: 13.2 },
  { month: "Apr", value: 12.6 },
  { month: "May", value: 13.0 },
  { month: "Jun", value: 11.8 },
];
