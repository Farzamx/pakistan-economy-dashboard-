"use client";

import { useTheme } from "@/components/ThemeProvider";

// Decision Support Lab — shared Recharts theme. Every chart across every
// Lab tool (comparison bars, contribution bars, composition donuts, and
// whatever Purchasing Power/Budget Allocation/Future Value need next)
// pulls the same grid/axis/tooltip colors from here instead of each chart
// file re-deriving its own isLight ? ... : ... ternaries — the exact
// duplication PersonalInflationChartsInner.tsx had before this module
// existed.
export interface ChartTheme {
  isLight: boolean;
  gridStroke: string;
  axisTickFill: string;
  tooltipBg: string;
  tooltipBorder: string;
  /** Ready-to-spread Recharts <Tooltip contentStyle={...}> object. */
  tooltipStyle: { background: string; border: string; borderRadius: string };
}

export function useChartTheme(): ChartTheme {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const gridStroke = isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.06)";
  const axisTickFill = isLight ? "rgba(0, 0, 0, 0.50)" : "rgba(255, 255, 255, 0.40)";
  const tooltipBg = isLight ? "rgba(255, 255, 255, 0.97)" : "rgba(11, 14, 33, 0.90)";
  const tooltipBorder = isLight ? "1px solid rgba(0, 0, 0, 0.10)" : "1px solid rgba(255, 255, 255, 0.10)";

  return {
    isLight,
    gridStroke,
    axisTickFill,
    tooltipBg,
    tooltipBorder,
    tooltipStyle: { background: tooltipBg, border: tooltipBorder, borderRadius: "0.75rem" },
  };
}
