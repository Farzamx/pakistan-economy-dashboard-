"use client";

// Row-based charts drawn as SVG: dot plot, dumbbell, lollipop, waterfall and
// box plot. They share one layout (a label column on the left, a numeric axis
// along the bottom) so they read as a family, and every one:
//   - draws a zero baseline whenever the axis spans zero,
//   - shows a missing value as a labelled gap ("no data"), never as zero,
//   - has a full-width invisible hit band per row (large touch target) that
//     opens a tooltip on hover, tap or keyboard focus,
//   - takes its colours from the --pe-viz-* tokens, so it re-themes.
//
// Row ORDER is the caller's: the page sorts by value where the chart is a
// ranking, and a chart never re-sorts behind the caller's back.

import { useMemo, type ReactNode } from "react";
import { linearScale, niceTicks, formatValue } from "@/lib/analytics/scales";
import type { BoxStats } from "@/lib/inflation/analytics";
import { TipRow, TipTitle, TooltipBox, useChartTooltip, type ChartTooltipApi } from "@/components/analytics/tooltip";

const ROW_H = 28;
const TOP = 8;
const AXIS_H = 28;
const RIGHT = 56; // room for the value label at the end of a mark

type Colour = "blue" | "orange" | "teal" | "purple" | "amber" | "slate";
const c = (name: Colour) => `var(--pe-viz-${name})`;

interface BaseRow {
  key: string;
  label: string;
}

/** Clip a label to roughly `px` of 12px text (SVG text has no ellipsis of its own). */
function fit(label: string, px: number): string {
  const max = Math.max(4, Math.floor(px / 6.4));
  return label.length <= max ? label : `${label.slice(0, max - 1).trimEnd()}…`;
}

interface Layout {
  width: number;
  labelW: number;
  x0: number;
  x1: number;
  height: number;
  x: (v: number) => number;
  ticks: number[];
  rowY: (i: number) => number;
}

function useLayout(width: number, rowCount: number, values: number[], opts: { includeZero?: boolean; domain?: [number, number] } = {}): Layout {
  const valuesKey = values.join("|");
  const domainKey = opts.domain?.join("|") ?? "";
  const { includeZero, domain } = opts;
  return useMemo(() => {
    const labelW = Math.min(190, Math.max(96, Math.round(width * 0.34)));
    const x0 = labelW + 8;
    const x1 = Math.max(x0 + 80, width - RIGHT);
    const finite = values.filter((v) => Number.isFinite(v));
    const lo = domain ? domain[0] : Math.min(...(includeZero === false ? finite : [0, ...finite]));
    const hi = domain ? domain[1] : Math.max(...(includeZero === false ? finite : [0, ...finite]));
    const ticks = niceTicks(finite.length ? lo : 0, finite.length ? hi : 1, Math.max(3, Math.floor((x1 - x0) / 90)));
    const x = linearScale([ticks[0], ticks[ticks.length - 1]], [x0, x1]);
    return { width, labelW, x0, x1, height: TOP + rowCount * ROW_H + AXIS_H, x, ticks, rowY: (i) => TOP + i * ROW_H + ROW_H / 2 };
    // `values` and `domain` enter the deps as the stable string keys above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, rowCount, valuesKey, includeZero, domainKey]);
}

function Axis({ L, unit }: { L: Layout; unit: string }) {
  const plotBottom = L.height - AXIS_H;
  return (
    <g aria-hidden>
      {L.ticks.map((t) => (
        <g key={t}>
          <line x1={L.x(t)} x2={L.x(t)} y1={TOP} y2={plotBottom} stroke={t === 0 ? "var(--chart-axis)" : "var(--chart-grid)"} strokeWidth={t === 0 ? 1.25 : 1} />
          <text x={L.x(t)} y={plotBottom + 16} textAnchor="middle" fontSize={11} fill="var(--chart-axis)" className="tabular-nums">
            {formatValue(t, Math.abs(t) < 10 && t % 1 !== 0 ? 1 : 0)}
            {unit}
          </text>
        </g>
      ))}
    </g>
  );
}

function RowLabel({ L, i, label }: { L: Layout; i: number; label: string }) {
  return (
    <text x={L.labelW} y={L.rowY(i)} textAnchor="end" dominantBaseline="central" fontSize={12} fill="var(--pe-text-2)">
      {fit(label, L.labelW)}
      <title>{label}</title>
    </text>
  );
}

/** Full-width transparent band per row: hover, tap and focus target. */
function HitBand<T>({ L, i, api, data, label }: { L: Layout; i: number; api: ChartTooltipApi<T>; data: T; label: string }) {
  return (
    <rect
      x={0}
      y={L.rowY(i) - ROW_H / 2}
      width={L.width}
      height={ROW_H}
      fill="transparent"
      tabIndex={0}
      role="img"
      aria-label={label}
      style={{ outline: "none" }}
      className="cursor-default focus-visible:[stroke:var(--pe-focus)] focus-visible:[stroke-width:2]"
      onPointerEnter={(e) => api.showAtPointer(e, data)}
      onPointerMove={(e) => api.showAtPointer(e, data)}
      onPointerDown={(e) => api.showAtPointer(e, data)}
      onFocus={(e) => api.showAtElement(e.currentTarget, data)}
      onBlur={api.hide}
    />
  );
}

function NoData({ L, i }: { L: Layout; i: number }) {
  return (
    <text x={L.x0 + 4} y={L.rowY(i)} dominantBaseline="central" fontSize={11} fontStyle="italic" fill="var(--pe-text-3)">
      no data
    </text>
  );
}

function Shell<T>({ api, attach, L, ariaLabel, unit, children, tip }: { api: ChartTooltipApi<T>; attach: (el: HTMLDivElement | null) => void; L: Layout; ariaLabel: string; unit: string; children: ReactNode; tip: (d: T) => ReactNode }) {
  return (
    <div ref={attach} className="relative w-full" onPointerLeave={(e) => e.pointerType === "mouse" && api.hide()}>
      <svg width={L.width} height={L.height} role="group" aria-label={ariaLabel} className="block max-w-full select-none">
        <Axis L={L} unit={unit} />
        {children}
      </svg>
      <TooltipBox api={api}>{tip}</TooltipBox>
    </div>
  );
}

// ───────────────────────────── Dot plot ─────────────────────────────

export interface DotRow extends BaseRow {
  value: number | null;
  /** Optional second line in the tooltip, e.g. "weight 34.6%". */
  detail?: string;
  color?: Colour;
}

export function DotPlot({
  rows,
  unit = "%",
  reference,
  ariaLabel,
  decimals = 1,
  includeZero = true,
}: {
  rows: DotRow[];
  unit?: string;
  /** A labelled vertical reference line, e.g. the headline rate. */
  reference?: { value: number; label: string };
  ariaLabel: string;
  decimals?: number;
  includeZero?: boolean;
}) {
  const [api, attach] = useChartTooltip<DotRow>();
  const values = [...rows.map((r) => r.value).filter((v): v is number => v !== null), ...(reference ? [reference.value] : [])];
  const L = useLayout(api.width, rows.length, values, { includeZero });
  return (
    <Shell api={api} attach={attach} L={L} ariaLabel={ariaLabel} unit={unit} tip={(d) => (<><TipTitle>{d.label}</TipTitle><TipRow label="Value" value={d.value === null ? "no data" : `${formatValue(d.value, decimals)}${unit}`} />{d.detail && <p className="mt-1" style={{ color: "var(--chart-tooltip-label)" }}>{d.detail}</p>}</>)}>
      {reference && (
        <g aria-hidden>
          <line x1={L.x(reference.value)} x2={L.x(reference.value)} y1={TOP} y2={L.height - AXIS_H} stroke={c("slate")} strokeWidth={1.5} strokeDasharray="4 3" />
          <text x={L.x(reference.value)} y={TOP - 1} textAnchor="middle" fontSize={10} fill="var(--pe-text-3)">{reference.label}</text>
        </g>
      )}
      {rows.map((r, i) => (
        <g key={r.key}>
          <RowLabel L={L} i={i} label={r.label} />
          <line x1={L.x0} x2={L.x1} y1={L.rowY(i)} y2={L.rowY(i)} stroke="var(--chart-grid)" strokeDasharray="2 3" />
          {r.value === null ? (
            <NoData L={L} i={i} />
          ) : (
            <>
              <circle cx={L.x(r.value)} cy={L.rowY(i)} r={6} fill={c(r.color ?? "blue")} stroke="var(--pe-surface)" strokeWidth={1.5} />
              <text x={L.x(r.value) + 11} y={L.rowY(i)} dominantBaseline="central" fontSize={11} className="tabular-nums" fill="var(--pe-text)">
                {formatValue(r.value, decimals)}
              </text>
            </>
          )}
          <HitBand L={L} i={i} api={api} data={r} label={`${r.label}: ${r.value === null ? "no data" : `${formatValue(r.value, decimals)}${unit}`}`} />
        </g>
      ))}
    </Shell>
  );
}

// ───────────────────────────── Dumbbell ─────────────────────────────

export interface DumbbellRow extends BaseRow {
  from: number | null;
  to: number | null;
}

export function DumbbellPlot({
  rows,
  fromLabel,
  toLabel,
  unit = "%",
  ariaLabel,
  decimals = 1,
  deltaUnit = "pp",
  zeroBaseline = true,
}: {
  rows: DumbbellRow[];
  fromLabel: string;
  toLabel: string;
  unit?: string;
  ariaLabel: string;
  decimals?: number;
  deltaUnit?: string;
  /** Dots encode POSITION, not length, so an axis zoomed to the data is honest; set false to zoom when all values are far from zero. */
  zeroBaseline?: boolean;
}) {
  const [api, attach] = useChartTooltip<DumbbellRow>();
  const values = rows.flatMap((r) => [r.from, r.to]).filter((v): v is number => v !== null);
  const L = useLayout(api.width, rows.length, values, { includeZero: zeroBaseline });
  const delta = (r: DumbbellRow) => (r.from !== null && r.to !== null ? r.to - r.from : null);
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-pe-text-2" aria-hidden>
        <span className="inline-flex items-center gap-1.5"><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="var(--pe-surface)" stroke={c("slate")} strokeWidth="2.5" /></svg>{fromLabel}</span>
        <span className="inline-flex items-center gap-1.5"><svg width="14" height="14"><circle cx="7" cy="7" r="6" fill={c("blue")} /></svg>{toLabel}</span>
      </div>
      <Shell
        api={api}
        attach={attach}
        L={L}
        ariaLabel={ariaLabel}
        unit={unit}
        tip={(d) => {
          const dl = delta(d);
          return (
            <>
              <TipTitle>{d.label}</TipTitle>
              <TipRow label={fromLabel} value={d.from === null ? "no data" : `${formatValue(d.from, decimals)}${unit}`} />
              <TipRow label={toLabel} value={d.to === null ? "no data" : `${formatValue(d.to, decimals)}${unit}`} />
              {dl !== null && <TipRow label="Change" value={`${formatValue(dl, decimals, { signed: true })} ${deltaUnit}`} />}
            </>
          );
        }}
      >
        {rows.map((r, i) => {
          const dl = delta(r);
          return (
            <g key={r.key}>
              <RowLabel L={L} i={i} label={r.label} />
              <line x1={L.x0} x2={L.x1} y1={L.rowY(i)} y2={L.rowY(i)} stroke="var(--chart-grid)" strokeDasharray="2 3" />
              {r.from === null && r.to === null && <NoData L={L} i={i} />}
              {dl !== null && <line x1={L.x(r.from as number)} x2={L.x(r.to as number)} y1={L.rowY(i)} y2={L.rowY(i)} stroke="var(--pe-border-strong)" strokeWidth={3} strokeLinecap="round" />}
              {r.from !== null && <circle cx={L.x(r.from)} cy={L.rowY(i)} r={5} fill="var(--pe-surface)" stroke={c("slate")} strokeWidth={2.5} />}
              {r.to !== null && <circle cx={L.x(r.to)} cy={L.rowY(i)} r={6} fill={c("blue")} stroke="var(--pe-surface)" strokeWidth={1.5} />}
              <text x={L.width - 4} y={L.rowY(i)} textAnchor="end" dominantBaseline="central" fontSize={11} className="tabular-nums" fill="var(--pe-text-2)">
                {dl === null ? "—" : formatValue(dl, decimals, { signed: true })}
              </text>
              <HitBand L={L} i={i} api={api} data={r} label={`${r.label}: ${r.from === null ? "no data" : formatValue(r.from, decimals)} to ${r.to === null ? "no data" : formatValue(r.to, decimals)}${unit}`} />
            </g>
          );
        })}
      </Shell>
    </div>
  );
}

// ───────────────────────────── Lollipop ─────────────────────────────

export interface LollipopRow extends BaseRow {
  value: number | null;
  detail?: string;
}

export function LollipopChart({
  rows,
  unit = "pp",
  ariaLabel,
  decimals = 2,
  signed = false,
}: {
  rows: LollipopRow[];
  unit?: string;
  ariaLabel: string;
  decimals?: number;
  signed?: boolean;
}) {
  const [api, attach] = useChartTooltip<LollipopRow>();
  const L = useLayout(api.width, rows.length, rows.map((r) => r.value).filter((v): v is number => v !== null));
  return (
    <Shell api={api} attach={attach} L={L} ariaLabel={ariaLabel} unit="" tip={(d) => (<><TipTitle>{d.label}</TipTitle><TipRow label="Value" value={d.value === null ? "no data" : `${formatValue(d.value, decimals, { signed })} ${unit}`} />{d.detail && <p className="mt-1" style={{ color: "var(--chart-tooltip-label)" }}>{d.detail}</p>}</>)}>
      {rows.map((r, i) => (
        <g key={r.key}>
          <RowLabel L={L} i={i} label={r.label} />
          {r.value === null ? (
            <NoData L={L} i={i} />
          ) : (
            <>
              <line x1={L.x(0)} x2={L.x(r.value)} y1={L.rowY(i)} y2={L.rowY(i)} stroke={c(r.value < 0 ? "orange" : "blue")} strokeWidth={2.5} strokeLinecap="round" />
              <circle cx={L.x(r.value)} cy={L.rowY(i)} r={5.5} fill={c(r.value < 0 ? "orange" : "blue")} stroke="var(--pe-surface)" strokeWidth={1.5} />
              <text x={L.x(r.value) + (r.value < 0 ? -10 : 10)} y={L.rowY(i)} textAnchor={r.value < 0 ? "end" : "start"} dominantBaseline="central" fontSize={11} className="tabular-nums" fill="var(--pe-text)">
                {formatValue(r.value, decimals, { signed })}
              </text>
            </>
          )}
          <HitBand L={L} i={i} api={api} data={r} label={`${r.label}: ${r.value === null ? "no data" : `${formatValue(r.value, decimals, { signed })} ${unit}`}`} />
        </g>
      ))}
    </Shell>
  );
}

// ───────────────────────────── Waterfall ─────────────────────────────

export interface WaterfallRow extends BaseRow {
  /** A total is drawn from zero; a delta floats from the running level. */
  kind: "total" | "delta";
  value: number;
}

export function WaterfallChart({ rows, unit = "pp", ariaLabel, decimals = 2 }: { rows: WaterfallRow[]; unit?: string; ariaLabel: string; decimals?: number }) {
  const [api, attach] = useChartTooltip<WaterfallRow & { from: number; to: number }>();
  const bars = useMemo(() => {
    // A running level: totals reset it, deltas move it. A plain loop (not a closure over a mutated variable).
    const out: (WaterfallRow & { from: number; to: number })[] = [];
    let level = 0;
    for (const r of rows) {
      if (r.kind === "total") {
        level = r.value;
        out.push({ ...r, from: 0, to: r.value });
      } else {
        const from = level;
        level += r.value;
        out.push({ ...r, from, to: level });
      }
    }
    return out;
  }, [rows]);
  const L = useLayout(api.width, rows.length, bars.flatMap((b) => [b.from, b.to]));
  return (
    <Shell api={api} attach={attach} L={L} ariaLabel={ariaLabel} unit="" tip={(d) => (<><TipTitle>{d.label}</TipTitle>{d.kind === "total" ? <TipRow label="Total" value={`${formatValue(d.value, decimals)} ${unit}`} /> : (<><TipRow label="Change" value={`${formatValue(d.value, decimals, { signed: true })} ${unit}`} /><TipRow label="Running total" value={`${formatValue(d.to, decimals)} ${unit}`} /></>)}</>)}>
      {bars.map((b, i) => {
        const x1 = L.x(Math.min(b.from, b.to));
        const x2 = L.x(Math.max(b.from, b.to));
        const fill = b.kind === "total" ? c("slate") : b.value >= 0 ? c("orange") : c("teal");
        const next = bars[i + 1];
        return (
          <g key={b.key}>
            <RowLabel L={L} i={i} label={b.label} />
            <rect x={x1} y={L.rowY(i) - 8} width={Math.max(2, x2 - x1)} height={16} rx={2} fill={fill} />
            {next && <line x1={L.x(b.to)} x2={L.x(b.to)} y1={L.rowY(i) + 8} y2={L.rowY(i + 1) - 8} stroke="var(--chart-axis)" strokeWidth={1} strokeDasharray="2 2" />}
            <text x={x2 + 6} y={L.rowY(i)} dominantBaseline="central" fontSize={11} className="tabular-nums" fill="var(--pe-text)">
              {formatValue(b.value, decimals, { signed: b.kind === "delta" })}
            </text>
            <HitBand L={L} i={i} api={api} data={b} label={`${b.label}: ${formatValue(b.value, decimals, { signed: b.kind === "delta" })} ${unit}`} />
          </g>
        );
      })}
    </Shell>
  );
}

// ───────────────────────────── Box plot ─────────────────────────────

export interface BoxRow extends BaseRow {
  stats: BoxStats | null;
}

export function BoxPlot({ rows, unit = "%", ariaLabel, decimals = 1 }: { rows: BoxRow[]; unit?: string; ariaLabel: string; decimals?: number }) {
  const [api, attach] = useChartTooltip<BoxRow>();
  const values = rows.flatMap((r) => (r.stats ? [r.stats.min, r.stats.max] : []));
  const L = useLayout(api.width, rows.length, values);
  return (
    <Shell
      api={api}
      attach={attach}
      L={L}
      ariaLabel={ariaLabel}
      unit={unit}
      tip={(d) =>
        d.stats ? (
          <>
            <TipTitle>{d.label} · {d.stats.n} months</TipTitle>
            <TipRow label="Median" value={`${formatValue(d.stats.median, decimals)}${unit}`} />
            <TipRow label="Middle half" value={`${formatValue(d.stats.q1, decimals)} to ${formatValue(d.stats.q3, decimals)}${unit}`} />
            <TipRow label="Range" value={`${formatValue(d.stats.min, decimals)} to ${formatValue(d.stats.max, decimals)}${unit}`} />
            {d.stats.outliers.length > 0 && <TipRow label="Unusual months" value={d.stats.outliers.length} />}
          </>
        ) : (
          <><TipTitle>{d.label}</TipTitle><p>Too few observations for a box plot.</p></>
        )
      }
    >
      {rows.map((r, i) => (
        <g key={r.key}>
          <RowLabel L={L} i={i} label={r.label} />
          {!r.stats ? (
            <NoData L={L} i={i} />
          ) : (
            <>
              <line x1={L.x(r.stats.whiskerLow)} x2={L.x(r.stats.whiskerHigh)} y1={L.rowY(i)} y2={L.rowY(i)} stroke={c("slate")} strokeWidth={1.5} />
              <rect x={L.x(r.stats.q1)} y={L.rowY(i) - 7} width={Math.max(2, L.x(r.stats.q3) - L.x(r.stats.q1))} height={14} rx={2} fill={c("blue")} fillOpacity={0.35} stroke={c("blue")} strokeWidth={1.5} />
              <line x1={L.x(r.stats.median)} x2={L.x(r.stats.median)} y1={L.rowY(i) - 7} y2={L.rowY(i) + 7} stroke={c("blue")} strokeWidth={3} />
              {r.stats.outliers.map((o, k) => (
                <circle key={k} cx={L.x(o)} cy={L.rowY(i)} r={3} fill="none" stroke={c("orange")} strokeWidth={1.5} />
              ))}
            </>
          )}
          <HitBand L={L} i={i} api={api} data={r} label={r.stats ? `${r.label}: median ${formatValue(r.stats.median, decimals)}${unit}, range ${formatValue(r.stats.min, decimals)} to ${formatValue(r.stats.max, decimals)}${unit}` : `${r.label}: too few observations`} />
        </g>
      ))}
    </Shell>
  );
}
