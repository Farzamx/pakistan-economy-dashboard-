"use client";

// Single-province, single-metric historical line chart — same architecture
// as src/components/budget/BudgetTrendChart.tsx (the Federal Budget
// Workshop's trend chart). connectNulls={false} is the load-bearing prop
// here: years with no verified figure render as a genuine gap in the line
// rather than being interpolated or dropped to zero, per the Historical
// Explorer's "display null gaps honestly, do not interpolate" requirement.

import { useRef } from "react";
import { useInView } from "framer-motion";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { useTheme } from "@/components/ThemeProvider";
import type { ProvincialTrendPoint } from "@/lib/provincial/provincialBudgetData";

interface ProvincialTrendChartProps {
  points: ProvincialTrendPoint[];
  field: string;
  label: string;
  color: string;
  /** "bn" for Rs billion values (the default — every budget field), "Rs" for plain-Rupee values (per-citizen figures, which are tens of thousands of Rupees, not billions). */
  unit?: "bn" | "Rs";
}

export default function ProvincialTrendChart({ points, field, label, color, unit = "bn" }: ProvincialTrendChartProps) {
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

  const flatData = points.map((p) => ({ fiscalYear: `FY${p.fiscalYear}`, [field]: p.values[field] }));
  const hasAnyData = points.some((p) => typeof p.values[field] === "number");

  return (
    <div ref={containerRef} style={{ minHeight: 300 }}>
      {!hasAnyData ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-[var(--text-muted)]">
          No verified data available for {label} in this range.
        </div>
      ) : (
        shouldRender && (
          <ResponsiveContainer width="100%" height={300}>
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
                width={unit === "bn" ? 52 : 64}
                tickFormatter={(v) => (unit === "bn" ? `${v}bn` : v.toLocaleString())}
              />
              <Tooltip
                contentStyle={{ background: tooltipBg, border: tooltipBorder, borderRadius: "0.75rem", backdropFilter: "blur(16px)" }}
                labelStyle={{ color: tooltipLabel, marginBottom: 4 }}
                cursor={{ stroke: cursorStroke, strokeWidth: 1 }}
                formatter={(value) => [
                  typeof value === "number" ? (unit === "bn" ? `Rs ${value.toFixed(1)}bn` : `Rs ${Math.round(value).toLocaleString()}`) : "No verified data",
                  label,
                ]}
              />
              <Line
                type="monotone"
                dataKey={field}
                name={label}
                stroke={color}
                strokeWidth={2.5}
                dot={{ r: 3, fill: color, strokeWidth: 0 }}
                connectNulls={false}
                isAnimationActive={!prefersReducedMotion}
                animationDuration={1000}
              />
            </LineChart>
          </ResponsiveContainer>
        )
      )}
    </div>
  );
}
