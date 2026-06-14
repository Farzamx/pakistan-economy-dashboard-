import type { TrendPoint } from "@/components/charts/TrendLineChart";

// Fallback data, used by getReservesTrend() in src/lib/data/worldBank.ts if
// the World Bank API is unreachable. Real total reserves (includes gold, B
// USD) for Pakistan, 2015-2024, from World Bank indicator FI.RES.TOTL.CD.
export const fallbackReservesTrend: TrendPoint[] = [
  { month: "2015", value: 20.0 },
  { month: "2016", value: 22.0 },
  { month: "2017", value: 18.5 },
  { month: "2018", value: 11.8 },
  { month: "2019", value: 16.6 },
  { month: "2020", value: 18.5 },
  { month: "2021", value: 22.8 },
  { month: "2022", value: 9.9 },
  { month: "2023", value: 13.7 },
  { month: "2024", value: 18.4 },
];
