"use client";

// Recharts-based charts for time and category axes: signed bars, multi-series
// lines, clustered bars, stacked bars, scatter and histogram. They follow the
// GDP Workshop's conventions (recharts, --chart-* axis tokens, no animation unless a chart opts in with `animate`, and never under prefers-reduced-motion) and
// add the rules every PEIC analytical chart keeps:
//   - a zero baseline whenever values can be negative,
//   - a missing value stays missing (a gap in a line, no bar, "no data" in the
//     tooltip) — never zero,
//   - series colours come from --pe-viz-* so they re-theme,
//   - the plot is wrapped as a labelled image; the numbers behind it are in the
//     ChartFrame's table alternative.

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { formatValue } from "@/lib/analytics/scales";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";

export const AXIS = { fill: "var(--chart-axis)", fontSize: 11 } as const;
export type Colour = "blue" | "orange" | "teal" | "purple" | "amber" | "slate";
export const viz = (name: Colour) => `var(--pe-viz-${name})`;

/** Draw/grow animation settings for a chart that opts in with `animate`. Off for every chart that does not, and always off under prefers-reduced-motion. */
export const ANIMATION = { duration: 900, easing: "ease-out" as const };

export interface SeriesSpec {
  key: string;
  label: string;
  color: Colour;
  /** Dash pattern for lines — a second cue besides colour. */
  dash?: string;
  /** Draw as a step (a policy rate holds until the next decision). */
  step?: boolean;
}

export function Box({ children, ariaLabel, height }: { children: React.ReactNode; ariaLabel: string; height: number }) {
  return (
    <div className="w-full" style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

export const tipBox: React.CSSProperties = {
  background: "var(--chart-tooltip-bg)",
  border: "1px solid var(--chart-tooltip-border)",
  borderRadius: "var(--pe-radius)",
  padding: "8px 10px",
  minWidth: 150,
  boxShadow: "var(--pe-shadow-pop)",
};

export function makeTip(unit: string, decimals: number, series?: SeriesSpec[], extra?: (label: string) => string | null) {
  // eslint-disable-next-line react/display-name
  return ({ active, payload, label }: TooltipContentProps<ValueType, NameType>) => {
    if (!active || !payload || payload.length === 0) return null;
    const note = extra?.(String(label));
    return (
      <div style={tipBox}>
        <p style={{ color: "var(--chart-tooltip-label)", fontSize: 11, marginBottom: 4 }}>{label}</p>
        {payload.map((p) => {
          const spec = series?.find((s) => s.key === p.dataKey);
          const v = p.value;
          return (
            <p key={String(p.dataKey)} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, color: "var(--chart-tooltip-value)" }}>
              <span style={{ color: "var(--chart-tooltip-label)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: String(p.color ?? p.fill ?? "currentColor"), display: "inline-block" }} />
                {spec?.label ?? p.name}
              </span>
              <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
                {typeof v === "number" ? `${formatValue(v, decimals)}${unit}` : "no data"}
              </span>
            </p>
          );
        })}
        {note && <p style={{ color: "var(--chart-tooltip-label)", fontSize: 10, marginTop: 4 }}>{note}</p>}
      </div>
    );
  };
}

export const yTick = (unit: string, decimals = 0) => (v: number) => `${formatValue(v, decimals)}${unit}`;

// ───────────────────────────── Signed bars ─────────────────────────────

export interface BarDatum {
  period: string;
  value: number;
}

export function SignedBars({
  data,
  metric,
  unit = "%",
  height = 300,
  decimals = 1,
  positive = "blue",
  negative = "orange",
  ariaLabel,
  animate = false,
}: {
  data: BarDatum[];
  metric: string;
  unit?: string;
  height?: number;
  decimals?: number;
  positive?: Colour;
  negative?: Colour;
  ariaLabel: string;
  /** Bars grow in (and re-grow when the data changes). Off by default; always off under prefers-reduced-motion. */
  animate?: boolean;
}) {
  const reduced = useSafeReducedMotion();
  if (data.length === 0) return <p className="px-1 py-10 text-center text-[13px] text-pe-text-3">No observations in this range.</p>;
  const spec: SeriesSpec[] = [{ key: "value", label: metric, color: positive }];
  return (
    <Box height={height} ariaLabel={ariaLabel}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }} accessibilityLayer>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="period" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} />
        <YAxis tickFormatter={yTick(unit)} tick={AXIS} tickLine={false} axisLine={false} width={46} />
        <ReferenceLine y={0} stroke="var(--chart-axis)" strokeWidth={1.25} />
        <Tooltip content={makeTip(unit, decimals, spec)} cursor={{ fill: "var(--chart-cursor)" }} />
        <Bar dataKey="value" name={metric} radius={[2, 2, 0, 0]} isAnimationActive={animate && !reduced} animationDuration={ANIMATION.duration} animationEasing={ANIMATION.easing}>
          {data.map((d, i) => (
            <Cell key={`${d.period}-${i}`} fill={viz(d.value < 0 ? negative : positive)} />
          ))}
        </Bar>
      </BarChart>
    </Box>
  );
}

// ───────────────────────────── Multi-series line ─────────────────────────────

export type LineDatum = { period: string } & Record<string, number | string | null>;

export function MultiLine({
  data,
  series,
  unit = "%",
  height = 320,
  decimals = 1,
  ariaLabel,
  highlight,
  animate = false,
}: {
  data: LineDatum[];
  series: SeriesSpec[];
  unit?: string;
  height?: number;
  decimals?: number;
  ariaLabel: string;
  /** A labelled marker on one period/series, e.g. the latest reading. */
  highlight?: { period: string; key: string; value: number }[];
  /** Lines draw in (and redraw when the data or range changes). Off by default; always off under prefers-reduced-motion. */
  animate?: boolean;
}) {
  const reduced = useSafeReducedMotion();
  if (data.length === 0 || series.length === 0) return <p className="px-1 py-10 text-center text-[13px] text-pe-text-3">No observations in this range.</p>;
  return (
    <Box height={height} ariaLabel={ariaLabel}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }} accessibilityLayer>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="period" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tickFormatter={yTick(unit)} tick={AXIS} tickLine={false} axisLine={false} width={46} />
        <ReferenceLine y={0} stroke="var(--chart-axis)" strokeWidth={1} />
        <Tooltip content={makeTip(unit, decimals, series)} cursor={{ stroke: "var(--chart-axis)", strokeDasharray: "3 3" }} />
        {series.map((s) => (
          <Line
            key={s.key}
            dataKey={s.key}
            name={s.label}
            type={s.step ? "stepAfter" : "linear"}
            stroke={viz(s.color)}
            strokeWidth={2}
            strokeDasharray={s.dash}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--pe-surface)", strokeWidth: 1.5 }}
            connectNulls={false}
            isAnimationActive={animate && !reduced}
            animationDuration={ANIMATION.duration}
            animationEasing={ANIMATION.easing}
          />
        ))}
        {highlight?.map((h) => {
          const spec = series.find((s) => s.key === h.key);
          return spec ? <ReferenceDot key={`${h.key}-${h.period}`} x={h.period} y={h.value} r={4} fill={viz(spec.color)} stroke="var(--pe-surface)" strokeWidth={1.5} /> : null;
        })}
      </LineChart>
    </Box>
  );
}

// ───────────────────────────── Clustered bars ─────────────────────────────

export type ClusterDatum = { period: string } & Record<string, number | string | null>;

export function ClusteredBars({
  data,
  series,
  unit = "%",
  height = 320,
  decimals = 1,
  ariaLabel,
  showLegend = false,
  angled = false,
}: {
  data: ClusterDatum[];
  series: SeriesSpec[];
  unit?: string;
  height?: number;
  decimals?: number;
  ariaLabel: string;
  showLegend?: boolean;
  /** Angle the category labels and show every one (for long names such as CPI groups). */
  angled?: boolean;
}) {
  if (data.length === 0) return <p className="px-1 py-10 text-center text-[13px] text-pe-text-3">No observations in this range.</p>;
  return (
    <Box height={height} ariaLabel={ariaLabel}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }} barGap={1} barCategoryGap="22%" accessibilityLayer>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="period" tick={AXIS} tickLine={false} axisLine={false} interval={angled ? 0 : "preserveStartEnd"} minTickGap={10} {...(angled ? { angle: -35, textAnchor: "end" as const, height: 78 } : {})} />
        <YAxis tickFormatter={yTick(unit)} tick={AXIS} tickLine={false} axisLine={false} width={46} />
        <ReferenceLine y={0} stroke="var(--chart-axis)" strokeWidth={1.25} />
        <Tooltip content={makeTip(unit, decimals, series)} cursor={{ fill: "var(--chart-cursor)" }} />
        {showLegend && <Legend wrapperStyle={{ fontSize: 12, color: "var(--chart-axis)", paddingTop: 4 }} iconType="square" iconSize={9} />}
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={viz(s.color)} radius={[2, 2, 0, 0]} maxBarSize={22} isAnimationActive={false} />
        ))}
      </BarChart>
    </Box>
  );
}

// ───────────────────────────── Stacked bars ─────────────────────────────

export type StackDatum = { period: string; total: number } & Record<string, number | string>;

export function StackedBars({
  data,
  series,
  unit = "pp",
  height = 340,
  decimals = 2,
  ariaLabel,
}: {
  data: StackDatum[];
  series: SeriesSpec[];
  unit?: string;
  height?: number;
  decimals?: number;
  ariaLabel: string;
}) {
  if (data.length === 0) return <p className="px-1 py-10 text-center text-[13px] text-pe-text-3">No observations in this range.</p>;
  const all: SeriesSpec[] = [...series, { key: "total", label: "Total (headline)", color: "slate" }];
  return (
    <Box height={height} ariaLabel={ariaLabel}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }} accessibilityLayer>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="period" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} />
        <YAxis tickFormatter={yTick("", 0)} tick={AXIS} tickLine={false} axisLine={false} width={40} />
        <ReferenceLine y={0} stroke="var(--chart-axis)" strokeWidth={1.25} />
        <Tooltip content={makeTip(` ${unit}`, decimals, all)} cursor={{ fill: "var(--chart-cursor)" }} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} stackId="contrib" fill={viz(s.color)} isAnimationActive={false} />
        ))}
        {/* The total, as a marker above the stack: it equals the headline rate. */}
        <Line dataKey="total" name="Total (headline)" stroke="none" dot={{ r: 3, fill: "var(--pe-text)", stroke: "var(--pe-surface)", strokeWidth: 1 }} activeDot={{ r: 4 }} isAnimationActive={false} />
      </ComposedChart>
    </Box>
  );
}

// ───────────────────────────── Scatter ─────────────────────────────

export interface ScatterDatum {
  x: number;
  y: number;
  label: string;
  /** Emphasise the most recent observation. */
  latest?: boolean;
}

export function ScatterPlot({
  points,
  xLabel,
  yLabel,
  unit = "%",
  height = 340,
  ariaLabel,
}: {
  points: ScatterDatum[];
  xLabel: string;
  yLabel: string;
  unit?: string;
  height?: number;
  ariaLabel: string;
}) {
  if (points.length === 0) return <p className="px-1 py-10 text-center text-[13px] text-pe-text-3">No aligned observations.</p>;
  const rest = points.filter((p) => !p.latest);
  const latest = points.filter((p) => p.latest);
  const tip = ({ active, payload }: TooltipContentProps<ValueType, NameType>) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as ScatterDatum;
    return (
      <div style={tipBox}>
        <p style={{ color: "var(--chart-tooltip-label)", fontSize: 11, marginBottom: 4 }}>{d.label}</p>
        <p style={{ fontSize: 12, color: "var(--chart-tooltip-value)" }}>{xLabel}: <b style={{ fontVariantNumeric: "tabular-nums" }}>{formatValue(d.x, 1)}{unit}</b></p>
        <p style={{ fontSize: 12, color: "var(--chart-tooltip-value)" }}>{yLabel}: <b style={{ fontVariantNumeric: "tabular-nums" }}>{formatValue(d.y, 2)}{unit}</b></p>
      </div>
    );
  };
  return (
    <Box height={height} ariaLabel={ariaLabel}>
      <ScatterChart margin={{ top: 8, right: 14, bottom: 22, left: 4 }} accessibilityLayer>
        <CartesianGrid stroke="var(--chart-grid)" />
        <XAxis type="number" dataKey="x" name={xLabel} tickFormatter={yTick(unit)} tick={AXIS} tickLine={false} axisLine={false} label={{ value: xLabel, position: "insideBottom", offset: -12, fill: "var(--chart-axis)", fontSize: 11 }} />
        <YAxis type="number" dataKey="y" name={yLabel} tickFormatter={yTick(unit)} tick={AXIS} tickLine={false} axisLine={false} width={46} label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 4, fill: "var(--chart-axis)", fontSize: 11, style: { textAnchor: "middle" } }} />
        <ZAxis range={[46, 46]} />
        <Tooltip content={tip} cursor={{ strokeDasharray: "3 3", stroke: "var(--chart-axis)" }} />
        <Scatter data={rest} fill={viz("blue")} fillOpacity={0.55} isAnimationActive={false} />
        <Scatter data={latest} fill={viz("orange")} shape="diamond" isAnimationActive={false} />
      </ScatterChart>
    </Box>
  );
}

// ───────────────────────────── Histogram ─────────────────────────────

export function Histogram({
  bins,
  unit = "%",
  height = 260,
  ariaLabel,
  highlightBin,
}: {
  bins: { from: number; to: number; count: number }[];
  unit?: string;
  height?: number;
  ariaLabel: string;
  /** Index of the bin containing the latest reading. */
  highlightBin?: number;
}) {
  if (bins.length === 0) return <p className="px-1 py-10 text-center text-[13px] text-pe-text-3">No observations.</p>;
  const data = bins.map((b) => ({ period: `${formatValue(b.from, 0)}–${formatValue(b.to, 0)}`, count: b.count, from: b.from, to: b.to }));
  const tip = ({ active, payload }: TooltipContentProps<ValueType, NameType>) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as (typeof data)[number];
    return (
      <div style={tipBox}>
        <p style={{ color: "var(--chart-tooltip-label)", fontSize: 11 }}>{formatValue(d.from, 0)}{unit} to under {formatValue(d.to, 0)}{unit}</p>
        <p style={{ fontSize: 13, color: "var(--chart-tooltip-value)" }}><b>{d.count}</b> month{d.count === 1 ? "" : "s"}</p>
      </div>
    );
  };
  return (
    <Box height={height} ariaLabel={ariaLabel}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barCategoryGap={2} accessibilityLayer>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="period" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={14} />
        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={34} />
        <Tooltip content={tip} cursor={{ fill: "var(--chart-cursor)" }} />
        <Bar dataKey="count" radius={[2, 2, 0, 0]} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={d.period} fill={viz(i === highlightBin ? "orange" : "blue")} />
          ))}
        </Bar>
      </BarChart>
    </Box>
  );
}
