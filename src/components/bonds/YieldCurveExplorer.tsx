"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Segmented, Select } from "@/components/analytics/controls";
import { TipRow, TipTitle, TooltipBox, useChartTooltip } from "@/components/analytics/tooltip";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { useTooltipHandlers } from "./useTooltipHandlers";
import {
  SHAPE_LABEL,
  YIELD_DEFINITION_LABEL,
  compareCurves,
  curvePoints,
  dayNumber,
  slopeOf,
  type CurveComparison,
  type CurvePoint,
  type CurveShape,
  type YieldDefinition,
} from "@/lib/bonds/analytics";
import { bandRuns, buildCurveLayout, pathRuns, type PlotPoint } from "@/lib/bonds/curveGeometry";
import { COMPARE_LABEL, VIEW_LABEL, comparisonDate, describeComparison, describePairing, describeShape, resolveCurves, selectableDates, type CompareChoice, type ExplorerView } from "@/lib/bonds/curveExplorerModel";
import type { AuctionRecord, Instrument } from "@/lib/bonds/types";
import { formatDate, shortDate } from "@/lib/policyRate/format";

interface YieldCurveExplorerProps {
  tbills: AuctionRecord[];
  pibs: AuctionRecord[];
  def: YieldDefinition;
}

const SHAPE_COLOR: Record<CurveShape, string> = { upward: "var(--pe-viz-teal)", flat: "var(--pe-viz-slate)", inverted: "var(--pe-viz-orange)" };
const SHAPE_GLYPH: Record<CurveShape, string> = { upward: "↗", flat: "→", inverted: "↘" };
const B_COLOR = "var(--pe-viz-blue)";
const A_COLOR = "var(--pe-viz-orange)";

const fmtY = (v: number | null) => (v === null ? "—" : v.toFixed(2));
const fmtBp = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1).replace(/\.0$/, "")}`);
const STATUS_TEXT: Record<string, string> = { "bids-rejected": "bids rejected", "no-bids": "no bids received", "none-accepted": "none accepted", "not-offered": "not offered" };

interface TipData {
  tenor: string;
  b: CurvePoint | null;
  a: CurvePoint | null;
  bDate: string;
  aDate: string | null;
  instrument: Instrument;
}

interface Plotted {
  auction: AuctionRecord;
  points: CurvePoint[];
  plot: PlotPoint[];
}

function nearestDate(dates: readonly string[], iso: string): string {
  if (dates.length === 0) return iso;
  const n = dayNumber(iso);
  return dates.reduce((best, d) => (Math.abs(dayNumber(d) - n) < Math.abs(dayNumber(best) - n) ? d : best), dates[0]);
}

export default function YieldCurveExplorer({ tbills, pibs, def }: YieldCurveExplorerProps) {
  const uid = useId().replace(/:/g, "");
  const reduced = useSafeReducedMotion();
  const [tip, attach] = useChartTooltip<TipData>();
  const { hit, onBlankPointerDown } = useTooltipHandlers(tip);
  const [view, setView] = useState<ExplorerView>("both");
  const [selected, setSelected] = useState<string>(tbills[tbills.length - 1]?.auctionDate ?? "");
  const [choice, setChoice] = useState<CompareChoice>("12m");
  const [playing, setPlaying] = useState(false);
  const [scale, setScale] = useState<"auto" | "fixed">("auto");

  const dates = useMemo(() => selectableDates(view, tbills, pibs), [view, tbills, pibs]);
  const selDate = dates.includes(selected) ? selected : nearestDate(dates, selected);
  const idx = dates.indexOf(selDate);

  // playback: step to the next auction until the last one. Never auto-plays, and is switched off under reduced motion.
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setSelected((cur) => {
        const i = dates.indexOf(dates.includes(cur) ? cur : nearestDate(dates, cur));
        if (i >= dates.length - 1) {
          setPlaying(false);
          return dates[dates.length - 1];
        }
        return dates[i + 1];
      });
    }, 650);
    return () => window.clearInterval(id);
  }, [playing, dates]);

  // the lowest and highest yield on record for what is on screen, so a fixed scale keeps the axis still from one auction to the next
  const fullRange = useMemo(() => {
    const lists = view === "tbill" ? [tbills] : view === "pib" ? [pibs] : [tbills, pibs];
    const ys = lists.flatMap((l) => l.flatMap((a) => curvePoints(a, def).map((p) => p.yield))).filter((v): v is number => v !== null);
    return ys.length ? [Math.min(...ys), Math.max(...ys)] : [];
  }, [view, tbills, pibs, def]);
  const useFixed = scale === "fixed" || playing;

  const bRes = useMemo(() => resolveCurves(view, selDate, tbills, pibs), [view, selDate, tbills, pibs]);
  const aDate = useMemo(() => comparisonDate(view, selDate, choice, tbills, pibs, def), [view, selDate, choice, tbills, pibs, def]);
  const aRes = useMemo(() => (aDate ? resolveCurves(view, aDate, tbills, pibs) : null), [aDate, view, tbills, pibs]);

  const width = Math.max(tip.width, 300);
  const height = width < 520 ? 300 : 380;

  const model = useMemo(() => {
    const raw: { who: "A" | "B"; instrument: Instrument; auction: AuctionRecord; points: CurvePoint[] }[] = [];
    const add = (who: "A" | "B", r: typeof bRes | null) => {
      if (!r) return;
      if (r.tbill) raw.push({ who, instrument: "tbill", auction: r.tbill, points: curvePoints(r.tbill, def) });
      if (r.pib) raw.push({ who, instrument: "pib", auction: r.pib.auction, points: curvePoints(r.pib.auction, def) });
    };
    add("A", aRes);
    add("B", bRes);
    const ys = raw.flatMap((r) => r.points.map((p) => p.yield)).filter((v): v is number => v !== null);
    const layout = buildCurveLayout(width, height, useFixed ? [...ys, ...fullRange] : ys);
    const plotted = raw.map((r) => ({ ...r, plot: r.points.map((p): PlotPoint => ({ tenor: p.tenor, x: layout.xOf(p.years), y: p.yield === null ? null : layout.yOf(p.yield) })) }));
    return { layout, plotted };
  }, [aRes, bRes, def, width, height, useFixed, fullRange]);

  const { layout, plotted } = model;
  const of = (who: "A" | "B", instrument: Instrument): Plotted | undefined => plotted.find((p) => p.who === who && p.instrument === instrument);
  const instruments: Instrument[] = view === "tbill" ? ["tbill"] : view === "pib" ? ["pib"] : ["tbill", "pib"];
  const showGap = view === "both";

  const comparisons: { instrument: Instrument; cmp: CurveComparison; a: AuctionRecord; b: AuctionRecord }[] = [];
  for (const ins of instruments) {
    const a = of("A", ins);
    const b = of("B", ins);
    if (a && b) comparisons.push({ instrument: ins, cmp: compareCurves(a.auction, b.auction, def), a: a.auction, b: b.auction });
  }

  const noData = !bRes.tbill && !bRes.pib;
  const years = useMemo(() => {
    const byYear = new Map<string, string>();
    for (const d of dates) byYear.set(d.slice(0, 4), d);
    return [...byYear.entries()].reverse();
  }, [dates]);

  const tenorColumns = layout.xTicks.filter((t) => (view === "tbill" ? ["1M", "3M", "6M", "12M"] : view === "pib" ? ["2Y", "3Y", "5Y", "10Y", "15Y"] : null)?.includes(t.tenor) ?? true);
  // Every tenor keeps its label. When the chart is narrow and the short tenors sit close together (the maturity axis is square-root scaled, so 1M, 3M and 6M
  // are near each other), the labels are set smaller rather than dropped or overlapped.
  const tickLabels = layout.xTicks.filter((t) => tenorColumns.some((c) => c.tenor === t.tenor));
  const tickGap = tickLabels.reduce((m, t, i) => (i === 0 ? m : Math.min(m, t.x - tickLabels[i - 1].x)), Infinity);
  const tickFont = tickGap < 22 ? 9 : 11;

  const pointFor = (who: "A" | "B", tenor: string): { p: CurvePoint | null; instrument: Instrument | null } => {
    for (const ins of instruments) {
      const pl = of(who, ins);
      const p = pl?.points.find((x) => x.tenor === tenor);
      if (p) return { p, instrument: ins };
    }
    return { p: null, instrument: null };
  };

  const select = (date: string) => {
    tip.hide();
    setPlaying(false);
    setSelected(date);
  };
  const step = (delta: number) => select(dates[Math.min(Math.max(idx + delta, 0), dates.length - 1)]);

  const drawClass = `yc-draw-${uid}`;

  return (
    <div data-testid="yield-curve-explorer" className="flex flex-col gap-4">
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .${drawClass} { stroke-dasharray: 1; stroke-dashoffset: 1; animation: yc-draw-${uid} 0.9s ease-out 0.1s forwards; }
          @keyframes yc-draw-${uid} { to { stroke-dashoffset: 0; } }
        }
      `}</style>

      {/* controls */}
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <Segmented
          label="Securities"
          name={`${uid}-view`}
          value={view}
          onChange={(v) => {
            setPlaying(false);
            setView(v);
          }}
          options={(["both", "tbill", "pib"] as ExplorerView[]).map((v) => ({ value: v, label: VIEW_LABEL[v] }))}
        />
        <Select label="Compare with" id={`${uid}-cmp`} value={choice} onChange={(v) => setChoice(v)} options={(Object.keys(COMPARE_LABEL) as CompareChoice[]).map((c) => ({ value: c, label: COMPARE_LABEL[c] }))} />
        <Segmented label="Yield axis" name={`${uid}-scale`} value={useFixed ? "fixed" : "auto"} onChange={(v) => setScale(v)} options={[{ value: "auto", label: "Fit to curves", disabled: playing }, { value: "fixed", label: "Full history" }]} />
        {years.length > 1 && (
          <Select
            label="Jump to year-end"
            id={`${uid}-year`}
            value={years.find(([, d]) => d === selDate)?.[0] ?? "-"}
            onChange={(y) => {
              const d = years.find(([yy]) => yy === y)?.[1];
              if (d) select(d);
            }}
            options={[{ value: "-", label: "Choose a year", disabled: true }, ...years.map(([y]) => ({ value: y, label: y }))]}
          />
        )}
      </div>

      {/* auction slider */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface-2 px-3 py-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => step(-1)} disabled={idx <= 0} aria-label="Previous auction" className="rounded-[var(--pe-radius-sm)] border border-pe-border px-2 py-1 text-[12px] text-pe-text-2 hover:bg-pe-surface disabled:opacity-40">
            {"◀"}
          </button>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            disabled={reduced || idx >= dates.length - 1}
            aria-pressed={playing}
            title={reduced ? "Playback is off because reduced motion is on" : "Step through the auctions one by one"}
            className="rounded-[var(--pe-radius-sm)] border border-pe-border px-2.5 py-1 text-[12px] font-medium text-pe-text hover:bg-pe-surface disabled:opacity-40"
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button type="button" onClick={() => step(1)} disabled={idx >= dates.length - 1} aria-label="Next auction" className="rounded-[var(--pe-radius-sm)] border border-pe-border px-2 py-1 text-[12px] text-pe-text-2 hover:bg-pe-surface disabled:opacity-40">
            {"▶"}
          </button>
        </div>
        <label className="flex min-w-[180px] flex-1 items-center gap-2 text-[12px] text-pe-text-2">
          <span className="sr-only">Auction date</span>
          <input
            type="range"
            min={0}
            max={Math.max(dates.length - 1, 0)}
            step={1}
            value={Math.max(idx, 0)}
            aria-valuetext={formatDate(selDate)}
            onChange={(e) => select(dates[Number(e.target.value)])}
            className="h-1.5 w-full cursor-pointer accent-[var(--pe-accent)]"
          />
        </label>
        <p className="min-w-[120px] text-right text-[13px] font-semibold tabular-nums text-pe-text" aria-live="polite">
          {formatDate(selDate)}
        </p>
        {idx < dates.length - 1 && (
          <button type="button" onClick={() => step(dates.length - 1 - idx)} className="rounded-[var(--pe-radius-sm)] px-1.5 py-1 text-[12px] text-pe-accent hover:underline">
            Latest
          </button>
        )}
      </div>

      {showGap && bRes.tbill && <p className="text-[12px] text-pe-text-2">{describePairing(bRes.tbill.auctionDate, bRes.pib)}</p>}

      {/* chart */}
      <div ref={attach} className="relative" data-testid="curve-chart">
        {noData ? (
          <p className="px-1 py-12 text-center text-[13px] text-pe-text-3">No auction data for this selection.</p>
        ) : (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="group" aria-label={`Auction yield by maturity, ${YIELD_DEFINITION_LABEL[def]}, percent per annum`} className="block max-w-full" onPointerDown={onBlankPointerDown}>
            <defs>
              <pattern id={`gap-${uid}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="var(--pe-border-strong, var(--pe-border))" strokeWidth="1" />
              </pattern>
            </defs>

            {/* y grid and labels */}
            {layout.yTicks.map((t) => (
              <g key={t}>
                <line x1={layout.margin.left} x2={layout.margin.left + layout.innerWidth} y1={layout.yOf(t)} y2={layout.yOf(t)} stroke="var(--chart-grid)" />
                <text x={layout.margin.left - 6} y={layout.yOf(t)} textAnchor="end" dominantBaseline="central" fontSize={11} fill="var(--chart-axis)" className="tabular-nums">
                  {Number.isInteger(t) ? t.toFixed(0) : t.toFixed(1)}
                </text>
              </g>
            ))}
            <text x={layout.margin.left - 6} y={layout.margin.top - 6} textAnchor="end" fontSize={10} fill="var(--chart-axis)">
              % p.a.
            </text>

            {/* the stretch where no auction exists */}
            {showGap && (
              <g aria-hidden="true">
                <rect x={layout.gap.x0} y={layout.margin.top} width={layout.gap.x1 - layout.gap.x0} height={layout.innerHeight} fill={`url(#gap-${uid})`} opacity={0.5} />
                {layout.gap.x1 - layout.gap.x0 > 28 && (
                  <text x={(layout.gap.x0 + layout.gap.x1) / 2} y={layout.margin.top + 12} textAnchor="middle" fontSize={10} fill="var(--chart-axis)">
                    no auction
                  </text>
                )}
              </g>
            )}

            {/* x axis: maturity */}
            {tickLabels.map((t) => (
              <g key={t.tenor}>
                <line x1={t.x} x2={t.x} y1={layout.margin.top + layout.innerHeight} y2={layout.margin.top + layout.innerHeight + 4} stroke="var(--chart-axis)" />
                <text x={t.x} y={layout.margin.top + layout.innerHeight + 17} textAnchor="middle" fontSize={tickFont} fill="var(--chart-axis)">
                  {t.label}
                </text>
              </g>
            ))}
            <line x1={layout.margin.left} x2={layout.margin.left + layout.innerWidth} y1={layout.margin.top + layout.innerHeight} y2={layout.margin.top + layout.innerHeight} stroke="var(--chart-axis)" />
            {showGap && (
              <g fontSize={10} fill="var(--chart-axis)" aria-hidden="true">
                <text x={(layout.xOf(1 / 12) + layout.xOf(1)) / 2} y={layout.height - 6} textAnchor="middle">
                  T-bills
                </text>
                <text x={(layout.xOf(2) + layout.xOf(15)) / 2} y={layout.height - 6} textAnchor="middle">
                  PIBs
                </text>
              </g>
            )}

            {/* the shaded band between the two curves */}
            {instruments.map((ins) => {
              const a = of("A", ins);
              const b = of("B", ins);
              if (!a || !b) return null;
              return bandRuns(a.plot, b.plot).map((d, i) => <path key={`${ins}-band-${i}`} d={d} fill="var(--pe-accent)" opacity={0.1} stroke="none" />);
            })}

            {/* compare curve (dashed), then the selected curve (solid) */}
            {instruments.map((ins) => {
              const a = of("A", ins);
              return a ? pathRuns(a.plot).map((d, i) => <path key={`${ins}-a-${i}`} d={d} fill="none" stroke={A_COLOR} strokeWidth={2} strokeDasharray="5 4" strokeLinecap="round" strokeLinejoin="round" />) : null;
            })}
            {instruments.map((ins) => {
              const b = of("B", ins);
              return b ? pathRuns(b.plot).map((d, i) => <path key={`${ins}-b-${i}`} d={d} pathLength={1} className={drawClass} fill="none" stroke={B_COLOR} strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" />) : null;
            })}

            {/* points: filled for accepted, a cross on the axis for a tenor that produced no yield */}
            {(["A", "B"] as const).flatMap((who) =>
              instruments.flatMap((ins) => {
                const pl = of(who, ins);
                if (!pl) return [];
                return pl.points.map((p, i) => {
                  const x = pl.plot[i].x;
                  const y = pl.plot[i].y;
                  const color = who === "B" ? B_COLOR : A_COLOR;
                  if (y !== null) return ins === "tbill" ? <circle key={`${who}-${ins}-${p.tenor}`} cx={x} cy={y} r={who === "B" ? 4.5 : 3.5} fill={who === "B" ? color : "var(--pe-surface)"} stroke={color} strokeWidth={2} /> : <rect key={`${who}-${ins}-${p.tenor}`} x={x - (who === "B" ? 4.5 : 3.5)} y={y - (who === "B" ? 4.5 : 3.5)} width={who === "B" ? 9 : 7} height={who === "B" ? 9 : 7} rx={1.5} fill={who === "B" ? color : "var(--pe-surface)"} stroke={color} strokeWidth={2} />;
                  if (p.status === "not-offered") return null;
                  const yy = layout.margin.top + layout.innerHeight - 8 - (who === "A" ? 12 : 0);
                  return (
                    <g key={`${who}-${ins}-${p.tenor}`} stroke={color} strokeWidth={1.75} strokeLinecap="round">
                      <title>{`${p.tenor}: ${STATUS_TEXT[p.status] ?? p.status}`}</title>
                      <line x1={x - 4} y1={yy - 4} x2={x + 4} y2={yy + 4} />
                      <line x1={x - 4} y1={yy + 4} x2={x + 4} y2={yy - 4} />
                    </g>
                  );
                });
              }),
            )}

            {/* one focusable column per tenor: hover, tap or Tab to read the values */}
            {tenorColumns.map((t) => {
              const half = Math.max(Math.min(layout.innerWidth / 20, 22), 10);
              const b = pointFor("B", t.tenor);
              const a = pointFor("A", t.tenor);
              const data: TipData | null = b.p || a.p ? { tenor: t.label, b: b.p, a: a.p, bDate: b.instrument === "pib" ? (bRes.pib?.auction.auctionDate ?? selDate) : (bRes.tbill?.auctionDate ?? selDate), aDate: a.instrument === "pib" ? (aRes?.pib?.auction.auctionDate ?? null) : (aRes?.tbill?.auctionDate ?? null), instrument: (b.instrument ?? a.instrument ?? "tbill") as Instrument } : null;
              if (!data) return null;
              const label = `${t.label}: ${b.p?.yield !== null && b.p?.yield !== undefined ? `${fmtY(b.p.yield)}%` : STATUS_TEXT[b.p?.status ?? "not-offered"]}${a.p ? `, compared ${a.p.yield !== null ? `${fmtY(a.p.yield)}%` : STATUS_TEXT[a.p.status]}` : ""}`;
              return (
                <rect
                  key={`hit-${t.tenor}`}
                  x={t.x - half}
                  y={layout.margin.top}
                  width={half * 2}
                  height={layout.innerHeight}
                  fill="transparent"
                  tabIndex={0}
                  role="img"
                  aria-label={label}
                  className="outline-none focus-visible:[stroke:var(--pe-focus)] focus-visible:[stroke-width:2]"
                  {...hit(data)}
                />
              );
            })}
          </svg>
        )}
        <TooltipBox api={tip}>
          {(d) => (
            <>
              <TipTitle>
                {d.tenor} {d.instrument === "tbill" ? "T-bill" : "PIB"} · {YIELD_DEFINITION_LABEL[def].toLowerCase()}
              </TipTitle>
              <TipRow swatch={B_COLOR} label={shortDate(d.bDate)} value={d.b ? (d.b.yield !== null ? `${fmtY(d.b.yield)}%` : (STATUS_TEXT[d.b.status] ?? "—")) : "—"} />
              {d.a && d.aDate && <TipRow swatch={A_COLOR} label={shortDate(d.aDate)} value={d.a.yield !== null ? `${fmtY(d.a.yield)}%` : (STATUS_TEXT[d.a.status] ?? "—")} />}
              {d.b?.yield !== null && d.b?.yield !== undefined && d.a?.yield !== null && d.a?.yield !== undefined && <TipRow label="Change" value={`${fmtBp((Math.round((d.b.yield - d.a.yield) * 1000) / 10))} bp`} />}
              {d.b && d.b.offered !== null && <p className="mt-1 text-[11px]" style={{ color: "var(--chart-tooltip-label)" }}>Offered Rs {Math.round(d.b.offered / 1000).toLocaleString("en-US")}bn{d.b.accepted !== null ? ` · accepted Rs ${Math.round(d.b.accepted / 1000).toLocaleString("en-US")}bn` : ""}</p>}
            </>
          )}
        </TooltipBox>
      </div>

      {/* key */}
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-pe-text-2" aria-label="Key">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-0.5 w-5 rounded" style={{ background: B_COLOR }} />
          Selected auction ({formatDate(selDate)})
        </li>
        {aDate && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block w-5 border-t-2 border-dashed" style={{ borderColor: A_COLOR }} />
            {COMPARE_LABEL[choice]} ({formatDate(aDate)})
          </li>
        )}
        <li className="flex items-center gap-1.5 text-pe-text-3">
          <span aria-hidden>{"×"}</span> a tenor with no yield (bids rejected or none received)
        </li>
      </ul>

      {/* reading panels */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface p-3.5" data-testid="curve-shape-panel">
          <h4 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-pe-text-3">This curve</h4>
          {instruments.map((ins) => {
            const b = of("B", ins);
            if (!b) return ins === "pib" && view === "pib" ? <p key={ins} className="mt-2 text-[13px] text-pe-text-2">No PIB auction on this date.</p> : null;
            const slope = slopeOf(b.auction, def);
            const sentence = describeShape(slope);
            return (
              <div key={ins} className="mt-2">
                <p className="flex flex-wrap items-center gap-2 text-[13px] text-pe-text">
                  <span className="rounded-[var(--pe-radius-sm)] border border-pe-border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-pe-text-2">{ins === "tbill" ? "T-bills" : "PIBs"}</span>
                  {slope ? (
                    <span className="inline-flex items-center gap-1 font-semibold" style={{ color: SHAPE_COLOR[slope.shape] }}>
                      <span aria-hidden>{SHAPE_GLYPH[slope.shape]}</span>
                      {SHAPE_LABEL[slope.shape]}
                    </span>
                  ) : (
                    <span className="text-pe-text-2">Slope unavailable</span>
                  )}
                  <span className="text-pe-text-3">auction {formatDate(b.auction.auctionDate)} · settled {formatDate(b.auction.settlementDate)}</span>
                </p>
                <p className="mt-1 text-[13px] text-pe-text-2">{sentence ?? "A tenor at one end of the slope had no yield at this auction, so the shape is not stated."}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface p-3.5" data-testid="curve-change-panel">
          <h4 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-pe-text-3">{aDate ? `Change since ${formatDate(aDate)}` : "Change"}</h4>
          {view === "both" && aRes && !aRes.pib && bRes.pib && aDate && <p className="mt-2 text-[13px] text-pe-text-2">No PIB auction within 14 days of {formatDate(aDate)}, so there is no PIB comparison for that date (SBP&apos;s detailed PIB archive starts in July 2024).</p>}
          {comparisons.length === 0 ? (
            <p className="mt-2 text-[13px] text-pe-text-2">{choice === "none" ? "Choose a date to compare with." : "No earlier auction to compare with for this selection."}</p>
          ) : (
            comparisons.map(({ instrument, cmp, a, b }) => {
              const max = Math.max(...cmp.changes.map((c) => Math.abs(c.deltaBp ?? 0)), 1);
              return (
                <div key={instrument} className="mt-2">
                  <p className="text-[13px] text-pe-text-2">{describeComparison(cmp, a.auctionDate, b.auctionDate)}</p>
                  <table className="mt-2 w-full border-collapse text-[12px] tabular-nums">
                    <caption className="sr-only">{`${instrument === "tbill" ? "T-bill" : "PIB"} yields on ${formatDate(a.auctionDate)} and ${formatDate(b.auctionDate)}, and the change in basis points`}</caption>
                    <thead>
                      <tr className="text-pe-text-3">
                        <th scope="col" className="py-1 text-left font-medium">{instrument === "tbill" ? "T-bill" : "PIB"}</th>
                        <th scope="col" className="py-1 text-right font-medium">{shortDate(a.auctionDate)}</th>
                        <th scope="col" className="py-1 text-right font-medium">{shortDate(b.auctionDate)}</th>
                        <th scope="col" className="py-1 pl-3 text-left font-medium">Change, bp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cmp.changes.map((c) => (
                        <tr key={c.tenor} className="border-t border-pe-border">
                          <th scope="row" className="py-1 text-left font-normal text-pe-text-2">{c.tenor}</th>
                          <td className="py-1 text-right">{fmtY(c.a)}</td>
                          <td className="py-1 text-right">{fmtY(c.b)}</td>
                          <td className="py-1 pl-3">
                            <span className="flex items-center gap-2">
                              <span aria-hidden className="relative inline-block h-1.5 w-16 rounded bg-pe-surface-2">
                                {c.deltaBp !== null && <span className="absolute inset-y-0 rounded" style={{ left: c.deltaBp >= 0 ? "50%" : `${50 - (Math.abs(c.deltaBp) / max) * 50}%`, width: `${(Math.abs(c.deltaBp) / max) * 50}%`, background: c.deltaBp >= 0 ? "var(--pe-viz-orange)" : "var(--pe-viz-teal)" }} />}
                                <span className="absolute inset-y-[-2px] left-1/2 w-px bg-pe-border" />
                              </span>
                              <span className="w-12 text-pe-text">{fmtBp(c.deltaBp)}</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
