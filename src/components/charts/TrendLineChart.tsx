"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DotItemDotProps, TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { useTheme } from "@/components/ThemeProvider";

export interface TrendPoint {
  month: string;
  value: number;
}

interface TrendLineChartProps {
  data: TrendPoint[];
  color: string;
  unit: string;
  gradientId: string;
  /** Recharts XAxis interval. Default auto. Pass a number to show every Nth label. */
  xAxisInterval?: number | "preserveStart" | "preserveEnd" | "preserveStartEnd";
  /**
   * Optional annotation points (e.g. MPC meeting dates, a specific
   * release) rendered as a small dashed vertical marker + label. `month`
   * must exactly match one of `data`'s `month` values — points that don't
   * line up with an actual data point are silently skipped rather than
   * guessing a position. Kept optional and unused by most call sites for
   * now; wired in selectively where a caller already has the marker
   * dates on hand (e.g. the policy rate chart against MPC decisions).
   */
  markers?: { month: string; label: string }[];
}

/** period-over-period institutional tooltip — shows the point's own date,
 * value, and change vs. the previous point, matching the same "value +
 * delta" convention KpiCard uses (arrow, signed, muted "vs" caption). */
function buildTooltipContent(data: TrendPoint[], unit: string, color: string, isLight: boolean) {
  const tooltipBg      = isLight ? "rgba(255, 255, 255, 0.97)" : "rgba(11, 14, 33, 0.94)";
  const tooltipBorder  = isLight ? "1px solid rgba(0, 0, 0, 0.10)" : "1px solid rgba(255, 255, 255, 0.12)";
  const labelColor     = isLight ? "rgba(0, 0, 0, 0.50)" : "rgba(255, 255, 255, 0.50)";
  const valueColor     = isLight ? "rgba(0, 0, 0, 0.85)" : "#ffffff";
  const upColor        = isLight ? "#047857" : "#34d399";
  const downColor      = isLight ? "#be123c" : "#fb7185";

  // eslint-disable-next-line react/display-name
  return ({ active, payload, label }: TooltipContentProps<ValueType, NameType>) => {
    if (!active || !payload || payload.length === 0) return null;
    const value = Number(payload[0].value);
    const idx = data.findIndex((p) => p.month === label);
    const prev = idx > 0 ? data[idx - 1] : null;
    const delta = prev ? value - prev.value : null;
    const deltaColor = delta === null ? labelColor : delta >= 0 ? upColor : downColor;

    return (
      <div
        style={{
          background: tooltipBg,
          border: tooltipBorder,
          borderRadius: "0.75rem",
          backdropFilter: "blur(16px)",
          padding: "8px 12px",
          minWidth: 120,
        }}
      >
        <div style={{ color: labelColor, fontSize: 11, marginBottom: 3, letterSpacing: "0.02em" }}>{label}</div>
        <div style={{ color: valueColor, fontWeight: 600, fontSize: 15, fontVariantNumeric: "tabular-nums" }}>
          {value}{unit}
        </div>
        {delta !== null && (
          <div style={{ color: deltaColor, fontSize: 11, fontWeight: 500, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(2)}{unit} vs prior
          </div>
        )}
        <div style={{ color, fontSize: 9, marginTop: 4, opacity: 0.6 }}>●&nbsp;current series</div>
      </div>
    );
  };
}

export default function TrendLineChart({
  data,
  color,
  unit,
  gradientId,
  xAxisInterval,
  markers,
}: TrendLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const prefersReducedMotion = useSafeReducedMotion();
  const { theme } = useTheme();

  const shouldRender = isInView || !!prefersReducedMotion;
  const isLight = theme === "light";

  const gridStroke     = isLight ? "rgba(0, 0, 0, 0.08)"   : "rgba(255, 255, 255, 0.06)";
  const axisTickFill   = isLight ? "rgba(0, 0, 0, 0.50)"   : "rgba(255, 255, 255, 0.40)";
  const cursorStroke   = isLight ? "rgba(0, 0, 0, 0.12)"   : "rgba(255, 255, 255, 0.15)";
  const dotStroke      = isLight ? "#ffffff"                : "#05060f";
  const avgStroke      = isLight ? "rgba(0, 0, 0, 0.28)"    : "rgba(255, 255, 255, 0.28)";
  const avgLabelColor  = isLight ? "rgba(0, 0, 0, 0.45)"    : "rgba(255, 255, 255, 0.45)";
  const markerStroke   = isLight ? "rgba(2, 132, 199, 0.55)" : "rgba(56, 189, 248, 0.55)";

  const numericValues = data.map((p) => p.value).filter((v) => Number.isFinite(v));
  const average = numericValues.length > 0
    ? numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length
    : null;

  const tooltipContent = buildTooltipContent(data, unit, color, isLight);
  const lastIndex = data.length - 1;

  /** Emphasized endpoint — the latest observation gets a permanently
   * visible, slightly larger dot (institutional "you are here" marker)
   * instead of only appearing on hover like every other point. */
  function renderDot(props: DotItemDotProps) {
    const { cx, cy, index } = props;
    if (cx == null || cy == null || index == null) return <g key={`dot-${index}`} />;
    if (index !== lastIndex) return <g key={`dot-${index}`} />;
    return (
      <g key={`dot-${index}`}>
        <circle cx={cx} cy={cy} r={7} fill={color} opacity={0.16} />
        <circle cx={cx} cy={cy} r={3.5} fill={color} stroke={dotStroke} strokeWidth={1.5} />
      </g>
    );
  }

  return (
    <div ref={containerRef} style={{ minHeight: 240 }}>
      {shouldRender && (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="month"
              stroke="transparent"
              tick={{ fill: axisTickFill, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              {...(xAxisInterval !== undefined ? { interval: xAxisInterval } : {})}
            />
            <YAxis
              stroke="transparent"
              tick={{ fill: axisTickFill, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(value) => `${value}${unit}`}
            />
            <Tooltip
              content={tooltipContent}
              cursor={{ stroke: cursorStroke, strokeWidth: 1 }}
            />
            {average !== null && (
              <ReferenceLine
                y={average}
                stroke={avgStroke}
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{ value: `Avg ${average.toFixed(1)}${unit}`, position: "insideTopRight", fill: avgLabelColor, fontSize: 10 }}
              />
            )}
            {markers?.map((marker) => {
              const exists = data.some((p) => p.month === marker.month);
              if (!exists) return null;
              return (
                <ReferenceLine
                  key={marker.month}
                  x={marker.month}
                  stroke={markerStroke}
                  strokeDasharray="2 3"
                  strokeWidth={1}
                  label={{ value: marker.label, position: "top", fill: markerStroke, fontSize: 9 }}
                />
              );
            })}
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={renderDot}
              activeDot={{ r: 4, fill: color, stroke: dotStroke, strokeWidth: 2 }}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={1800}
              animationBegin={0}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
