"use client";

// Data coverage per stored snapshot (Macro Intelligence, Phase C).
//
// WHY THIS IS A BAR CHART AND NOT A LINE
// The quantity plotted is a COUNT of dimensions the engine could classify —
// a real integer the analytics layer already computes, not a score invented
// for a categorical state. Bars are used rather than a connected line for
// the reason MacroHistoricalAnalytics states: a line implies a continuous,
// evenly-spaced series, and daily snapshots may have gaps. One bar per
// stored snapshot claims only what the record contains.
//
// WHAT IT IS NOT
// This chart says nothing about the economy. A tall bar means the engine saw
// more of the picture that day, not that conditions improved. The caption in
// the parent section says so explicitly.

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { CoveragePoint } from "@/lib/macroIntelligenceViews";

function Tip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as CoveragePoint;
  return (
    <div
      style={{
        background: "var(--chart-tooltip-bg)",
        border: "1px solid var(--chart-tooltip-border)",
        borderRadius: "var(--pe-radius)",
        padding: "8px 10px",
      }}
    >
      <p style={{ color: "var(--chart-tooltip-label)", fontSize: 11 }}>{label}</p>
      <p style={{ color: "var(--chart-tooltip-value)", fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
        {row.classified} of {row.recorded} dimensions classified
      </p>
      {row.unclassified > 0 && (
        <p style={{ color: "var(--chart-tooltip-label)", fontSize: 10 }}>
          {row.unclassified} lacked sufficient evidence
        </p>
      )}
    </div>
  );
}

export default function CoverageBarChart({ data, height = 200 }: { data: CoveragePoint[]; height?: number }) {
  if (data.length === 0) {
    return <p className="text-[13px] text-white/40 light:text-slate-500">No snapshots are stored yet.</p>;
  }

  // The denominator is the engine's own `recorded` count, so the axis never
  // implies a target the system does not define.
  const maxRecorded = Math.max(...data.map((d) => d.recorded));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="snapshotDate"
            tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
            tickFormatter={(v: string) => v.slice(5)}
          />
          <YAxis
            domain={[0, maxRecorded]}
            allowDecimals={false}
            tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip content={Tip} cursor={{ fill: "var(--chart-cursor)" }} />
          {/* Stacked so the full height is always `recorded`: the grey
              remainder is the part of the picture the engine could not see,
              which is the honest complement to the classified count. */}
          <Bar dataKey="classified" stackId="c" name="Classified" fill="var(--pe-accent)" isAnimationActive={false} />
          <Bar
            dataKey="unclassified"
            stackId="c"
            name="Insufficient evidence"
            fill="var(--pe-border-strong)"
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
