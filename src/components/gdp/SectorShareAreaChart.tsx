"use client";

// Stacked-area chart of sector value-added shares (GDP Breakdown Workshop).
//
// Deliberately NOT normalised: Recharts' stackOffset defaults to "none", so
// the stack's height is the real sum (~94%) and the gap to 100% is visible
// rather than scaled away. A "expand"/percent offset would make the three
// shares look like a complete decomposition, which they are not — the World
// Bank value-added measure excludes net taxes on products.
//
// Colours come from the shared --chart-* / --pe-* tokens, so both themes
// re-theme automatically, and the series are distinguishable without relying
// on hue alone (each has a distinct lightness, and the legend is always on).

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { SectorSharePoint } from "@/lib/gdpWorkshop";

const SERIES = [
  { key: "agriculture", label: "Agriculture", color: "var(--pe-up)" },
  { key: "industry", label: "Industry", color: "var(--pe-accent)" },
  { key: "services", label: "Services", color: "#B98BE8" },
] as const;

function SectorTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as SectorSharePoint;
  return (
    <div
      style={{
        background: "var(--chart-tooltip-bg)",
        border: "1px solid var(--chart-tooltip-border)",
        borderRadius: "var(--pe-radius)",
        padding: "8px 10px",
        minWidth: 190,
      }}
    >
      <p style={{ color: "var(--chart-tooltip-label)", fontSize: 11, marginBottom: 6 }}>{label}</p>
      {SERIES.map((s) => (
        <p key={s.key} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, color: "var(--chart-tooltip-value)" }}>
          <span style={{ color: s.color }}>{s.label}</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{row[s.key].toFixed(1)}%</span>
        </p>
      ))}
      <p style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--chart-tooltip-border)", display: "flex", justifyContent: "space-between", gap: 12, fontSize: 11, color: "var(--chart-tooltip-label)" }}>
        <span>Three sectors</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{row.total.toFixed(1)}%</span>
      </p>
      <p style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 11, color: "var(--chart-tooltip-label)" }}>
        <span>Not covered</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{row.residual.toFixed(1)}%</span>
      </p>
    </div>
  );
}

export default function SectorShareAreaChart({ data }: { data: SectorSharePoint[] }) {
  if (data.length === 0) {
    return <p className="px-1 py-8 text-center text-[13px] text-pe-text-3">Sector composition data is unavailable right now.</p>;
  }
  return (
    <div className="h-[300px] w-full sm:h-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={28} />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          {/* The 100% line makes the uncovered remainder visible rather than implied. */}
          <ReferenceLine y={100} stroke="var(--chart-average)" strokeDasharray="4 4" label={{ value: "100% of GDP", position: "insideTopRight", fill: "var(--chart-average-label)", fontSize: 10 }} />
          <Tooltip content={SectorTooltip} cursor={{ stroke: "var(--chart-cursor)" }} />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--chart-axis)", paddingTop: 4 }} iconType="square" iconSize={9} />
          {SERIES.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stackId="sectors"
              stroke={s.color}
              fill={s.color}
              fillOpacity={0.55}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
