import type { TrendPoint } from "@/components/charts/TrendLineChart";

// Mock monthly foreign exchange reserves (B USD) for Phase 1.5, ending
// at the same 9.4B shown on the Foreign Reserves KPI card.
//
// Later: replace this static array with data fetched from the SBP
// weekly reserves API — keep the same `{ month, value }[]` shape and
// TrendLineChart needs no changes, e.g.:
//
//   export async function getReservesTrend(): Promise<TrendPoint[]> {
//     const res = await fetch("https://api.sbp.org.pk/...");
//     return res.json();
//   }
export const reservesTrend: TrendPoint[] = [
  { month: "Jul", value: 7.8 },
  { month: "Aug", value: 8.0 },
  { month: "Sep", value: 7.5 },
  { month: "Oct", value: 7.2 },
  { month: "Nov", value: 7.6 },
  { month: "Dec", value: 8.0 },
  { month: "Jan", value: 8.2 },
  { month: "Feb", value: 8.4 },
  { month: "Mar", value: 8.5 },
  { month: "Apr", value: 8.6 },
  { month: "May", value: 8.8 },
  { month: "Jun", value: 9.4 },
];
