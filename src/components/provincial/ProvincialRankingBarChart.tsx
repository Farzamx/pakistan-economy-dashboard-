"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { useTheme } from "@/components/ThemeProvider";
import type { ProvinceRankEntry } from "@/lib/provincial/provincialComparison";

interface ProvincialRankingBarChartProps {
  entries: ProvinceRankEntry[];
  unitLabel?: string;
}

/** Horizontal ranking bar chart — provinces with a null value (no verified figure for the selected field/year) are still listed via the table-style legend below the chart, but contribute no bar, never a zero-height one that would misread as "verified zero." */
export default function ProvincialRankingBarChart({ entries, unitLabel = "Rs bn" }: ProvincialRankingBarChartProps) {
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

  const chartable = entries.filter((e) => e.value !== null);
  const unavailable = entries.filter((e) => e.value === null);
  const data = chartable.map((e) => ({ name: e.name, value: e.value, color: e.color, fiscalYear: e.fiscalYear }));

  return (
    <div ref={containerRef} style={{ minHeight: 260 }}>
      {chartable.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center text-sm text-[var(--text-muted)]">No verified data available for any province on this metric/year.</div>
      ) : (
        shouldRender && (
          <ResponsiveContainer width="100%" height={Math.max(180, chartable.length * 56)}>
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
              <XAxis type="number" stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
              <YAxis type="category" dataKey="name" stroke="transparent" tick={{ fill: axisTickFill, fontSize: 12 }} tickLine={false} axisLine={false} width={120} />
              <Tooltip
                contentStyle={{ background: tooltipBg, border: tooltipBorder, borderRadius: "0.75rem", backdropFilter: "blur(16px)" }}
                formatter={(value, _name, item) => [`${unitLabel} ${typeof value === "number" ? value.toFixed(1) : value} (FY${item.payload.fiscalYear})`, "Value"]}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={!prefersReducedMotion} animationDuration={800}>
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
      )}
      {unavailable.length > 0 && (
        <p className="mt-2 text-[11px] text-[var(--text-muted)]">
          Not available: {unavailable.map((e) => e.name).join(", ")} — no verified figure for this metric/year in the source documents.
        </p>
      )}
    </div>
  );
}
