"use client";

// Recharts-based charts for series observed on DIFFERENT dates, and for bars that carry their own explanation.
//
//   DateLines      lines on a real TIME axis. Each series sits on its own observation dates and is never resampled onto another's
//                  calendar: a "step" series (the policy rate) holds until its next observation; an "observed" series (auction
//                  yields) is joined between neighbours but BROKEN across a long silence. The tooltip reports, for every series, the
//                  latest observation on or before the hovered day and says WHEN it was observed, so a reader can see that a yield and
//                  a policy rate do not share a date.
//   DetailBars     one bar per item with an explanation of its own in the tooltip (how long a rate level lasted, and which change began it).
//   RealRateChart  the policy rate and inflation as lines and the real policy rate as an area split at zero (monthly points).
//
// Conventions kept from TimeCharts: --pe-viz-* and --chart-* tokens, a zero baseline when values can be negative, a missing value is a
// gap (never zero), the plot is a labelled image and the numbers are in the ChartFrame's table. Animation is opt-in and is switched off
// by prefers-reduced-motion.

import { useEffect, useId, useMemo, useState } from "react";
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { ANIMATION, AXIS, Box, makeTip, tipBox, viz, yTick, type Colour, type SeriesSpec } from "@/components/analytics/TimeCharts";
import { formatValue } from "@/lib/analytics/scales";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { asOfObservation, buildDateChart, timeTicks, toTs, tsToIso, MS_PER_DAY, type DatedPoint } from "@/lib/policyRate/dateSeries";
import { formatDate } from "@/lib/policyRate/format";

/** Width of the element, kept current by a ResizeObserver (so tick counts can follow the screen). */
function useWidth(): [(el: HTMLDivElement | null) => void, number] {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, width];
}

const empty = (text: string) => <p className="px-1 py-10 text-center text-[13px] text-pe-text-3">{text}</p>;

// ───────────────────────────── DateLines ─────────────────────────────

export interface DateLineSeries {
  key: string;
  label: string;
  color: Colour;
  /** "step": holds until the next observation. "observed": exists only on its own dates. */
  kind: "step" | "observed";
  points: DatedPoint[];
  dash?: string;
  /** Mark every observation with a dot (for sparse series). A stretch of one observation is always dotted. */
  dots?: boolean;
}

export function DateLines({
  series,
  from,
  to,
  unit = "%",
  decimals = 2,
  axisDecimals = 0,
  height = 340,
  ariaLabel,
  maxGapDays = 75,
  animate = false,
  zeroLine = true,
}: {
  series: DateLineSeries[];
  /** First day shown (ISO), or null for the earliest observation. */
  from: string | null;
  /** Last day shown (ISO); step series are carried out to it. */
  to: string;
  unit?: string;
  decimals?: number;
  axisDecimals?: number;
  height?: number;
  ariaLabel: string;
  /** Observed neighbours further apart than this are not joined by a line. */
  maxGapDays?: number;
  animate?: boolean;
  zeroLine?: boolean;
}) {
  const reduced = useSafeReducedMotion();
  const [attach, width] = useWidth();
  const built = useMemo(() => buildDateChart(series.map((s) => ({ key: s.key, kind: s.kind, points: s.points })), { from, to, maxGapDays }), [series, from, to, maxGapDays]);
  const ticks = useMemo(() => timeTicks(built.fromTs, built.toTs, Math.max(3, Math.floor(width / 84))), [built.fromTs, built.toTs, width]);
  const specs = useMemo(() => new Map(series.map((s) => [s.key, s])), [series]);
  if (built.rows.length === 0) return empty("No observations in this range.");
  const labelOf = new Map(ticks.map((t) => [t.ts, t.label]));

  const tip = ({ active, label }: TooltipContentProps<ValueType, NameType>) => {
    const ts = Number(label);
    if (!active || !Number.isFinite(ts)) return null;
    const iso = tsToIso(ts);
    return (
      <div style={{ ...tipBox, minWidth: 190, maxWidth: 270 }}>
        <p style={{ color: "var(--chart-tooltip-label)", fontSize: 11, marginBottom: 4 }}>{formatDate(iso)}</p>
        {series.map((s) => {
          const o = asOfObservation(s.points, iso);
          const sameDay = o?.date === iso;
          const gap = o ? Math.round((toTs(iso) - toTs(o.date)) / MS_PER_DAY) : 0;
          const stale = s.kind === "observed" && o !== null && gap > maxGapDays;
          const detail = !o
            ? "not yet recorded"
            : s.kind === "step"
              ? sameDay ? "new on this day" : `in effect since ${formatDate(o.date)}`
              : sameDay ? "observed this day" : `${stale ? "no observation for " + gap + " days; last was" : "latest observation"} ${formatDate(o.date)}`;
          return (
            <div key={s.key} style={{ marginTop: 3 }}>
              <p style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, color: "var(--chart-tooltip-value)" }}>
                <span style={{ color: "var(--chart-tooltip-label)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: viz(s.color), display: "inline-block" }} />
                  {s.label}
                </span>
                <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 500, opacity: stale ? 0.6 : 1 }}>{o ? `${formatValue(o.value, decimals)}${unit}` : "no data"}</span>
              </p>
              <p style={{ color: "var(--chart-tooltip-label)", fontSize: 10, paddingLeft: 14 }}>{detail}{o?.note ? ` · ${o.note}` : ""}</p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div ref={attach}>
      <Box height={height} ariaLabel={ariaLabel}>
        <LineChart data={built.rows} margin={{ top: 8, right: 12, bottom: 0, left: -8 }} accessibilityLayer>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={[built.fromTs, built.toTs]}
            ticks={ticks.map((t) => t.ts)}
            tickFormatter={(v: number) => labelOf.get(v) ?? ""}
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            allowDataOverflow
          />
          <YAxis tickFormatter={yTick(unit, axisDecimals)} tick={AXIS} tickLine={false} axisLine={false} width={unit.trim().length > 1 ? 62 : 46} />
          {zeroLine && <ReferenceLine y={0} stroke="var(--chart-axis)" strokeWidth={1} />}
          <Tooltip content={tip} cursor={{ stroke: "var(--chart-axis)", strokeDasharray: "3 3" }} />
          {built.segments.map((seg) => {
            const spec = specs.get(seg.base);
            if (!spec) return null;
            const showDot = seg.length === 1 || spec.dots === true;
            return (
              <Line
                key={seg.key}
                dataKey={seg.key}
                name={spec.label}
                type={spec.kind === "step" ? "stepAfter" : "linear"}
                stroke={viz(spec.color)}
                strokeWidth={2}
                strokeDasharray={spec.dash}
                dot={showDot ? { r: 2.5, fill: viz(spec.color), stroke: "var(--pe-surface)", strokeWidth: 1 } : false}
                activeDot={{ r: 4, stroke: "var(--pe-surface)", strokeWidth: 1.5 }}
                connectNulls
                isAnimationActive={animate && !reduced}
                animationDuration={ANIMATION.duration}
                animationEasing={ANIMATION.easing}
              />
            );
          })}
        </LineChart>
      </Box>
    </div>
  );
}

// ───────────────────────────── DetailBars ─────────────────────────────

export interface DetailBar {
  /** Unique within the chart (two bars may share a label). */
  id: string;
  /** The axis label. */
  label: string;
  value: number;
  color: Colour;
  /** Tooltip heading and body lines. */
  title: string;
  lines: string[];
  /** Outline the bar (for example the longest). */
  emphasis?: boolean;
}

export function DetailBars({
  data,
  unit = "",
  decimals = 1,
  axisDecimals = 0,
  height = 280,
  ariaLabel,
  animate = false,
}: {
  data: DetailBar[];
  unit?: string;
  decimals?: number;
  axisDecimals?: number;
  height?: number;
  ariaLabel: string;
  animate?: boolean;
}) {
  const reduced = useSafeReducedMotion();
  const byId = useMemo(() => new Map(data.map((d) => [d.id, d])), [data]);
  if (data.length === 0) return empty("Nothing to show.");
  const tip = ({ active, payload }: TooltipContentProps<ValueType, NameType>) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as DetailBar;
    return (
      <div style={{ ...tipBox, maxWidth: 260 }}>
        <p style={{ color: "var(--chart-tooltip-value)", fontSize: 12, fontWeight: 600 }}>{d.title}</p>
        <p style={{ fontSize: 12, color: "var(--chart-tooltip-value)", marginTop: 2 }}>
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: viz(d.color), display: "inline-block", marginRight: 6 }} />
          <b style={{ fontVariantNumeric: "tabular-nums" }}>{formatValue(d.value, decimals)}{unit}</b>
        </p>
        {d.lines.map((l, i) => (
          <p key={i} style={{ color: "var(--chart-tooltip-label)", fontSize: 11, marginTop: 2 }}>{l}</p>
        ))}
      </div>
    );
  };
  return (
    <Box height={height} ariaLabel={ariaLabel}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }} accessibilityLayer>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="id" tickFormatter={(id: string) => byId.get(id)?.label ?? ""} tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
        <YAxis tickFormatter={yTick(unit, axisDecimals)} tick={AXIS} tickLine={false} axisLine={false} width={unit.trim().length > 1 ? 62 : 46} />
        <Tooltip content={tip} cursor={{ fill: "var(--chart-cursor)" }} />
        <Bar dataKey="value" radius={[2, 2, 0, 0]} isAnimationActive={animate && !reduced} animationDuration={ANIMATION.duration} animationEasing={ANIMATION.easing}>
          {data.map((d) => (
            <Cell key={d.id} fill={viz(d.color)} stroke={d.emphasis ? "var(--pe-text)" : "none"} strokeWidth={d.emphasis ? 1.5 : 0} />
          ))}
        </Bar>
      </BarChart>
    </Box>
  );
}

// ───────────────────────────── RealRateChart ─────────────────────────────

export interface RealRow {
  period: string;
  policy: number | null;
  inflation: number | null;
  real: number | null;
}

/**
 * Nominal policy rate (stepped line), inflation (dashed line) and the real policy rate (area). The area is tinted teal where the real
 * rate is above zero (the policy rate is higher than inflation) and orange where it is below, by a gradient that switches exactly at zero.
 */
export function RealRateChart({ data, inflationLabel, height = 340, ariaLabel, animate = false }: { data: RealRow[]; inflationLabel: string; height?: number; ariaLabel: string; animate?: boolean }) {
  const reduced = useSafeReducedMotion();
  const gid = `real-split-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  if (data.length === 0) return empty("No observations in this range.");
  const reals = data.map((d) => d.real).filter((v): v is number => typeof v === "number");
  const max = Math.max(...reals);
  const min = Math.min(...reals);
  // Where zero falls within the area's own vertical extent: 0 = all negative, 1 = all positive.
  const zeroAt = reals.length === 0 ? 1 : max <= 0 ? 0 : min >= 0 ? 1 : max / (max - min);
  const specs: SeriesSpec[] = [
    { key: "policy", label: "SBP policy rate (nominal)", color: "purple", step: true },
    { key: "inflation", label: inflationLabel, color: "blue" },
    { key: "real", label: "Real policy rate", color: "teal" },
  ];
  const anim = { isAnimationActive: animate && !reduced, animationDuration: ANIMATION.duration, animationEasing: ANIMATION.easing };
  return (
    <Box height={height} ariaLabel={ariaLabel}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }} accessibilityLayer>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset={0} stopColor={viz("teal")} stopOpacity={0.4} />
            <stop offset={zeroAt} stopColor={viz("teal")} stopOpacity={0.08} />
            <stop offset={zeroAt} stopColor={viz("orange")} stopOpacity={0.08} />
            <stop offset={1} stopColor={viz("orange")} stopOpacity={0.4} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="period" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tickFormatter={yTick("%", 0)} tick={AXIS} tickLine={false} axisLine={false} width={46} />
        <ReferenceLine y={0} stroke="var(--chart-axis)" strokeWidth={1.25} />
        <Tooltip content={makeTip("%", 2, specs)} cursor={{ stroke: "var(--chart-axis)", strokeDasharray: "3 3" }} />
        <Area dataKey="real" name="Real policy rate" type="linear" baseValue={0} stroke={viz("teal")} strokeWidth={2} fill={`url(#${gid})`} connectNulls={false} dot={false} activeDot={{ r: 4, stroke: "var(--pe-surface)", strokeWidth: 1.5 }} {...anim} />
        <Line dataKey="policy" name="SBP policy rate (nominal)" type="stepAfter" stroke={viz("purple")} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "var(--pe-surface)", strokeWidth: 1.5 }} connectNulls={false} {...anim} />
        <Line dataKey="inflation" name={inflationLabel} type="linear" stroke={viz("blue")} strokeWidth={1.75} strokeDasharray="6 3" dot={false} activeDot={{ r: 4, stroke: "var(--pe-surface)", strokeWidth: 1.5 }} connectNulls={false} {...anim} />
      </ComposedChart>
    </Box>
  );
}
