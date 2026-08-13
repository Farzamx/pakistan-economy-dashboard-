"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/components/ThemeProvider";
import type { ChartPoint, PointOrigin } from "@/lib/comparisons/comparisonTransforms";
import type { ComparisonSeriesConfig } from "@/lib/comparisons/comparisonRegistry";
import type { ChartMode } from "@/lib/comparisons/comparisonTransforms";

interface ComparisonChartProps {
  data: ChartPoint[];
  seriesA: ComparisonSeriesConfig;
  seriesB: ComparisonSeriesConfig;
  mode: ChartMode;
}

function formatKeyLabel(key: string): string {
  // "2024-03" -> "Mar 2024"; "2024" stays as-is (annual series).
  if (/^\d{4}$/.test(key)) return key;
  const [year, month] = key.split("-");
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

function unitSuffix(mode: ChartMode, unit: string): string {
  if (mode === "percentChange") return "%";
  if (mode === "baseIndex") return "";
  return unit;
}

// Phase 7: a modest, non-redesign visual cue for carried-forward points —
// Recharts' <Line> has no built-in per-segment styling without splitting
// into multiple Line elements (a much larger change), so this uses its
// existing custom-dot escape hatch instead: a small hollow ring at each
// carried-forward point, nothing at observed points (observed points are
// already the plain line itself). This is a real, if intentionally modest,
// visual distinction — not a substitute for the tooltip disclosure above,
// which is the primary, always-available signal.
function makeOriginDot(color: string, pick: (p: ChartPoint) => PointOrigin | null | undefined) {
  function OriginDot(props: { cx?: number; cy?: number; payload?: ChartPoint }) {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined || !payload || pick(payload) !== "carried-forward") {
      return <g key={`${cx}-${cy}`} />; // Recharts requires an element back, even when rendering nothing.
    }
    return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.5} fill="none" stroke={color} strokeWidth={1.25} strokeDasharray="1.5 1" />;
  }
  return OriginDot;
}

export default function ComparisonChart({ data, seriesA, seriesB, mode }: ComparisonChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const prefersReducedMotion = useSafeReducedMotion();
  const { theme } = useTheme();
  const shouldRender = isInView || !!prefersReducedMotion;
  const isLight = theme === "light";

  const gridStroke = isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.06)";
  const axisTickFill = isLight ? "rgba(0, 0, 0, 0.50)" : "rgba(255, 255, 255, 0.40)";
  const tooltipBg = isLight ? "rgba(255, 255, 255, 0.97)" : "rgba(11, 14, 33, 0.90)";
  const tooltipBorder = isLight ? "1px solid rgba(0, 0, 0, 0.10)" : "1px solid rgba(255, 255, 255, 0.10)";
  const tooltipLabel = isLight ? "rgba(0, 0, 0, 0.50)" : "rgba(255, 255, 255, 0.50)";
  const cursorStroke = isLight ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.15)";
  const dotStroke = isLight ? "#ffffff" : "#05060f";
  const legendColor = isLight ? "rgba(0, 0, 0, 0.65)" : "rgba(255, 255, 255, 0.65)";

  const sameAxis = mode !== "raw";
  const formattedData = data.map((d) => ({ ...d, label: formatKeyLabel(d.key) }));

  return (
    <div ref={containerRef} style={{ minHeight: 320 }} data-testid="comparison-chart">
      {shouldRender && (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={formattedData} margin={{ top: 8, right: sameAxis ? 8 : 16, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="label"
              stroke="transparent"
              tick={{ fill: axisTickFill, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={32}
            />
            <YAxis
              yAxisId="left"
              stroke="transparent"
              tick={{ fill: axisTickFill, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v) => `${v}${unitSuffix(mode, seriesA.unit)}`}
            />
            {!sameAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="transparent"
                tick={{ fill: axisTickFill, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(v) => `${v}${unitSuffix(mode, seriesB.unit)}`}
              />
            )}
            <Tooltip
              contentStyle={{
                background: tooltipBg,
                border: tooltipBorder,
                borderRadius: "0.75rem",
                backdropFilter: "blur(16px)",
              }}
              labelStyle={{ color: tooltipLabel, marginBottom: 4 }}
              cursor={{ stroke: cursorStroke, strokeWidth: 1 }}
              formatter={(value, name, item) => {
                const isA = name === seriesA.shortLabel;
                const unit = isA ? unitSuffix(mode, seriesA.unit) : unitSuffix(mode, seriesB.unit);
                const formatted = typeof value === "number" ? value.toFixed(2) : String(value ?? "");
                const payload = item?.payload as ChartPoint | undefined;
                const origin = isA ? payload?.aOrigin : payload?.bOrigin;
                const sourcePeriod = isA ? payload?.aSourcePeriod : payload?.bSourcePeriod;
                // Phase 7: this is the one place a reader learns a value was
                // genuinely published this period vs carried forward from an
                // earlier one (e.g. the policy rate between MPC meetings) --
                // never presented as if it were a fresh observation.
                const originNote = origin === "carried-forward" ? ` (carried forward${sourcePeriod ? ` from ${sourcePeriod}` : ""})` : "";
                return [`${formatted}${unit}${originNote}`, name];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: legendColor }}
              iconType="line"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="a"
              name={seriesA.shortLabel}
              stroke={seriesA.color}
              strokeWidth={2}
              dot={makeOriginDot(seriesA.color, (p) => p.aOrigin)}
              activeDot={{ r: 4, fill: seriesA.color, stroke: dotStroke, strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={1400}
              animationEasing="ease-out"
            />
            <Line
              yAxisId={sameAxis ? "left" : "right"}
              type="monotone"
              dataKey="b"
              name={seriesB.shortLabel}
              stroke={seriesB.color}
              strokeWidth={2}
              dot={makeOriginDot(seriesB.color, (p) => p.bOrigin)}
              activeDot={{ r: 4, fill: seriesB.color, stroke: dotStroke, strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={1400}
              animationBegin={150}
              animationEasing="ease-out"
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
