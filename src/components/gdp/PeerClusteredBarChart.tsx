"use client";

// Clustered bar chart comparing Pakistan, India and Bangladesh on annual
// real GDP growth (GDP Breakdown Workshop).
//
// A clustered comparison is only legitimate when the series are measured
// the same way. All three bars come from the SAME World Bank indicator
// (NY.GDP.MKTP.KD.ZG — annual % change in real GDP), so they share a unit
// and a period basis and belong on one scale. The caller passes only the
// countries that actually have data (availablePeers), so the legend never
// implies a country is present when it is not.
//
// A year with no observation for a country renders as a GAP, not a
// zero-height bar at the baseline: Recharts skips null values, and the
// builder emits null rather than 0 precisely so "no data" cannot be read
// as "no growth".

import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { PEER_LABEL, type PeerCountry, type PeerYearPoint } from "@/lib/gdpWorkshop";

const COLOR: Record<PeerCountry, string> = {
  PAK: "var(--pe-accent)",
  IND: "var(--pe-up)",
  BGD: "#E8A33D",
};

function PeerTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={{ background: "var(--chart-tooltip-bg)", border: "1px solid var(--chart-tooltip-border)", borderRadius: "var(--pe-radius)", padding: "8px 10px", minWidth: 170 }}>
      <p style={{ color: "var(--chart-tooltip-label)", fontSize: 11, marginBottom: 4 }}>{label} · real GDP growth</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, color: "var(--chart-tooltip-value)" }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {Number(p.value) > 0 ? "+" : ""}
            {Number(p.value).toFixed(2)}%
          </span>
        </p>
      ))}
    </div>
  );
}

export default function PeerClusteredBarChart({ data, countries }: { data: PeerYearPoint[]; countries: PeerCountry[] }) {
  if (data.length === 0 || countries.length === 0) {
    return <p className="px-1 py-8 text-center text-[13px] text-pe-text-3">Peer comparison data is unavailable right now.</p>;
  }
  return (
    <div className="h-[300px] w-full sm:h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barGap={2} barCategoryGap="18%">
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
          <YAxis tickFormatter={(v) => `${v}%`} tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickLine={false} axisLine={false} width={46} />
          <ReferenceLine y={0} stroke="var(--chart-axis)" strokeWidth={1} />
          <Tooltip content={PeerTooltip} cursor={{ fill: "var(--chart-cursor)" }} />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--chart-axis)", paddingTop: 4 }} iconType="square" iconSize={9} />
          {countries.map((c) => (
            <Bar key={c} dataKey={c} name={PEER_LABEL[c]} fill={COLOR[c]} radius={[2, 2, 0, 0]} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
