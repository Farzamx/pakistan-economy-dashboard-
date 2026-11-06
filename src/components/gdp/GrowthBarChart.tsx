"use client";

// Single-series bar chart for a growth RATE (GDP Breakdown Workshop).
//
// Bars, not a line: each observation is a discrete annual or fiscal-quarter
// reading, and a bar makes period-to-period comparison easier to read than a
// continuous line, which implies interpolation between periods.
//
// Negative growth is drawn in the "down" token and positive in "up"; a zero
// baseline is always shown so a contraction is unmistakable. The caller
// supplies the period label (calendar year or fiscal quarter) verbatim —
// this component never reformats it, so quarterly data keeps its FY labels.

import { Bar, BarChart, Cell, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

export interface GrowthBar {
  /** Period label exactly as the source reports it, e.g. "2025" or "Q4 FY26". */
  period: string;
  value: number;
}

function makeTooltip(unit: string, metric: string) {
  // eslint-disable-next-line react/display-name
  return ({ active, payload, label }: TooltipContentProps<ValueType, NameType>) => {
    if (!active || !payload || payload.length === 0) return null;
    const v = Number(payload[0].value);
    return (
      <div style={{ background: "var(--chart-tooltip-bg)", border: "1px solid var(--chart-tooltip-border)", borderRadius: "var(--pe-radius)", padding: "8px 10px" }}>
        <p style={{ color: "var(--chart-tooltip-label)", fontSize: 11 }}>{label}</p>
        <p style={{ color: "var(--chart-tooltip-value)", fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
          {v > 0 ? "+" : ""}
          {v.toFixed(2)}
          {unit}
        </p>
        <p style={{ color: "var(--chart-tooltip-label)", fontSize: 10 }}>{metric}</p>
      </div>
    );
  };
}

export default function GrowthBarChart({
  data,
  unit = "%",
  metric,
  height = 280,
}: {
  data: GrowthBar[];
  unit?: string;
  /** What the bars measure — shown in the tooltip so the metric is never ambiguous. */
  metric: string;
  height?: number;
}) {
  if (data.length === 0) {
    return <p className="px-1 py-8 text-center text-[13px] text-pe-text-3">No observations available for this series.</p>;
  }
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="period" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis tickFormatter={(v) => `${v}${unit}`} tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickLine={false} axisLine={false} width={46} />
          <ReferenceLine y={0} stroke="var(--chart-axis)" strokeWidth={1} />
          <Tooltip content={makeTooltip(unit, metric)} cursor={{ fill: "var(--chart-cursor)" }} />
          <Bar dataKey="value" name={metric} radius={[2, 2, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.period} fill={d.value < 0 ? "var(--pe-down)" : "var(--pe-up)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
