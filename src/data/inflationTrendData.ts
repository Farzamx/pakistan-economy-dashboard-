import type { TrendPoint } from "@/components/charts/TrendLineChart";

// Fallback data, used by getInflationTrend() in src/lib/data/worldBank.ts if
// the World Bank API is unreachable. Real annual CPI inflation (%) for
// Pakistan, 2015-2024, from World Bank indicator FP.CPI.TOTL.ZG.
export const fallbackInflationTrend: TrendPoint[] = [
  { month: "2015", value: 2.5 },
  { month: "2016", value: 3.8 },
  { month: "2017", value: 4.1 },
  { month: "2018", value: 5.1 },
  { month: "2019", value: 10.6 },
  { month: "2020", value: 9.7 },
  { month: "2021", value: 9.5 },
  { month: "2022", value: 19.9 },
  { month: "2023", value: 30.8 },
  { month: "2024", value: 12.6 },
];
