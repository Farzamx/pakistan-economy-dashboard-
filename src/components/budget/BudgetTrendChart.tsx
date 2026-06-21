"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { useTheme } from "@/components/ThemeProvider";
import { BUDGET_FIELD_META } from "@/lib/budget/budgetRegistry";
import type { BudgetTrendField, TrendPoint, TrendValueMode } from "@/lib/budget/budgetData";

interface BudgetTrendChartProps {
  points: TrendPoint[];
  fields: BudgetTrendField[];
  mode: TrendValueMode;
}

export default function BudgetTrendChart({ points, fields, mode }: BudgetTrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const prefersReducedMotion = useSafeReducedMotion();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const shouldRender = isInView || !!prefersReducedMotion;

  const gridStroke = isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.06)";
  const axisTickFill = isLight ? "rgba(0, 0, 0, 0.50)" : "rgba(255, 255, 255, 0.40)";
  const tooltipBg = isLight ? "rgba(255, 255, 255, 0.97)" : "rgba(11, 14, 33, 0.90)";
  const tooltipBorder = isLight ? "1px solid rgba(0, 0, 0, 0.10)" : "1px solid rgba(255, 255, 255, 0.10)";
  const tooltipLabel = isLight ? "rgba(0, 0, 0, 0.50)" : "rgba(255, 255, 255, 0.50)";
  const cursorStroke = isLight ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.15)";
  const legendColor = isLight ? "rgba(0, 0, 0, 0.65)" : "rgba(255, 255, 255, 0.65)";

  const unitSuffix = mode === "pctGdp" ? "%" : "bn";
  const flatData = points.map((p) => ({ fiscalYear: `FY${p.fiscalYear}`, ...p.values }));

  return (
    <div ref={containerRef} style={{ minHeight: 340 }} data-testid="budget-trend-chart">
      {shouldRender && (
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={flatData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="fiscalYear"
              stroke="transparent"
              tick={{ fill: axisTickFill, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={20}
            />
            <YAxis
              stroke="transparent"
              tick={{ fill: axisTickFill, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v) => `${v}${unitSuffix}`}
            />
            <Tooltip
              contentStyle={{ background: tooltipBg, border: tooltipBorder, borderRadius: "0.75rem", backdropFilter: "blur(16px)" }}
              labelStyle={{ color: tooltipLabel, marginBottom: 4 }}
              cursor={{ stroke: cursorStroke, strokeWidth: 1 }}
              formatter={(value, name) => [
                typeof value === "number" ? `${value.toFixed(mode === "pctGdp" ? 2 : 0)}${unitSuffix}` : "No data",
                String(name),
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: legendColor }} iconType="line" />
            {fields.map((field, i) => {
              const meta = BUDGET_FIELD_META[field];
              return (
                <Line
                  key={field}
                  type="monotone"
                  dataKey={field}
                  name={meta?.label ?? field}
                  stroke={meta?.color ?? "#94a3b8"}
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={!prefersReducedMotion}
                  animationDuration={1200}
                  animationBegin={i * 120}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
