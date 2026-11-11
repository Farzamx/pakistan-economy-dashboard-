"use client";

// The policy rate over time with its regimes: a stepped line of the rate, shaded behind it wherever SBP was raising or cutting, and a
// strip underneath that names each stretch (tightening, easing or holding). Drawn as SVG so the shading, the strip and the turning points
// share one time axis exactly.
//
// WHAT A "HOLD" IS HERE. SBP's series records only the dates the rate took a value, so a meeting that left the rate alone leaves no row.
// A hold on this chart is therefore a stretch with NO RECORDED CHANGE and no run of increases or cuts around it: before the first
// recorded change, between two runs, and since the latest change. A pause INSIDE a run of same-direction changes belongs to the run
// (the bar chart of how long each level lasted shows every pause).
//
// Hover, tap or keyboard focus opens one tooltip (the shared chart tooltip). The reveal animation is a left-to-right wipe: it plays once
// when the chart scrolls into view, never plays under prefers-reduced-motion, and the finished chart is what the server renders.

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { linearScale, niceTicks, formatValue } from "@/lib/analytics/scales";
import { TipRow, TipTitle, TooltipBox, useChartTooltip } from "@/components/analytics/tooltip";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { dayNumberOf, type RateLevel, type RegimeSegment, type TurningPoint } from "@/lib/policyRate/analytics";
import { MS_PER_DAY, timeTicks, tsToIso } from "@/lib/policyRate/dateSeries";
import { daysText, formatDate, pct, signedPp } from "@/lib/policyRate/format";

const PAD = { l: 44, r: 14, t: 20 };
const PANEL_H = 128;
const STRIP_GAP = 10;
const STRIP_H = 26;
const AXIS_H = 26;
const HEIGHT = PAD.t + PANEL_H + STRIP_GAP + STRIP_H + AXIS_H;

const COLOR: Record<RegimeSegment["kind"], string> = {
  tightening: "var(--pe-viz-orange)",
  easing: "var(--pe-viz-teal)",
  hold: "var(--pe-surface-2)",
};

export function regimeSentence(s: RegimeSegment): string {
  if (s.kind === "hold") {
    return `Holding: no change recorded${s.open ? " since" : " from"} ${formatDate(s.from)}${s.open ? "" : ` to ${formatDate(s.to)}`}; the rate stayed at ${pct(s.startRate)} for ${daysText(s.days)}${s.open ? " so far" : ""}.`;
  }
  const noun = s.kind === "tightening" ? (s.changes === 1 ? "increase" : "increases") : s.changes === 1 ? "cut" : "cuts";
  return `${s.kind === "tightening" ? "Tightening" : "Easing"}: ${s.changes} ${noun}, ${formatDate(s.from)} to ${formatDate(s.to)}; ${pct(s.startRate)} to ${pct(s.endRate)} (${signedPp(s.endRate - s.startRate)} pp).`;
}

interface TipData {
  iso: string;
  seg: RegimeSegment | null;
  level: RateLevel | null;
}

export default function RegimeTimeline({
  decisions,
  regimes,
  levels,
  turningPoints,
  asOf,
  ariaLabel,
  animate = false,
}: {
  decisions: { date: string; value: number }[];
  regimes: RegimeSegment[];
  levels: RateLevel[];
  turningPoints: TurningPoint[];
  asOf: string;
  ariaLabel: string;
  animate?: boolean;
}) {
  const [api, attach] = useChartTooltip<TipData>();
  const reduced = useSafeReducedMotion();
  const clipId = `regime-clip-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const width = api.width;

  // Reveal: "static" (the finished chart, also the server render) -> "armed" (hidden, only ever set while off screen or for one frame)
  // -> "play" (wipes in). Nothing changes under reduced motion.
  const [stage, setStage] = useState<"static" | "armed" | "play">("static");
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  // One STABLE callback ref for both the tooltip's container and the reveal's observer (a new function each render would re-run it every render).
  const hostRef = useCallback(
    (el: HTMLDivElement | null) => {
      attach(el);
      setContainer(el);
    },
    [attach],
  );
  useEffect(() => {
    if (!animate || reduced || !container || typeof IntersectionObserver === "undefined") return;
    let armed = false;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries[entries.length - 1].isIntersecting;
        if (!armed) {
          armed = true;
          setStage("armed");
          if (visible) {
            raf = requestAnimationFrame(() => {
              raf = requestAnimationFrame(() => {
                setStage("play");
                io.disconnect();
              });
            });
          }
          return;
        }
        if (visible) {
          setStage("play");
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(container);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [animate, reduced, container]);

  const geo = useMemo(() => {
    if (decisions.length === 0) return null;
    const d0 = dayNumberOf(decisions[0].date);
    const d1 = Math.max(dayNumberOf(asOf), dayNumberOf(decisions[decisions.length - 1].date));
    const plotW = Math.max(120, width - PAD.l - PAD.r);
    const rates = decisions.map((d) => d.value);
    const yTicks = niceTicks(Math.min(...rates), Math.max(...rates) + 1, 4);
    const x = linearScale([d0, d1], [PAD.l, PAD.l + plotW]);
    const y = linearScale([yTicks[0], yTicks[yTicks.length - 1]], [PAD.t + PANEL_H, PAD.t]);
    const xTicks = timeTicks(d0 * MS_PER_DAY, d1 * MS_PER_DAY, Math.max(3, Math.floor(plotW / 78)));
    // the stepped line: hold the level until the date of the next observation, then out to the as-of date
    let path = `M ${x(d0).toFixed(1)} ${y(decisions[0].value).toFixed(1)}`;
    for (let i = 1; i < decisions.length; i++) path += ` H ${x(dayNumberOf(decisions[i].date)).toFixed(1)} V ${y(decisions[i].value).toFixed(1)}`;
    path += ` H ${x(d1).toFixed(1)}`;
    const changeDays = decisions.filter((d, i) => i > 0 && d.value !== decisions[i - 1].value).map((d) => dayNumberOf(d.date));
    // Which turning points get a text label: left to right, skipping any that would sit within 46 px of the previous label.
    const labelled = new Set<string>();
    let lastLabelX = Number.NEGATIVE_INFINITY;
    for (const tp of turningPoints) {
      const tx = x(dayNumberOf(tp.date));
      if (tx - lastLabelX >= 46) {
        labelled.add(`${tp.date}-${tp.kind}`);
        lastLabelX = tx;
      }
    }
    return { d0, d1, plotW, yTicks, x, y, xTicks, path, changeDays, labelled };
  }, [decisions, asOf, width, turningPoints]);

  if (!geo) return <p className="px-1 py-10 text-center text-[13px] text-pe-text-3">No policy-rate history to draw.</p>;
  const { d0, d1, plotW, yTicks, x, y, xTicks, path, changeDays, labelled } = geo;
  const stripY = PAD.t + PANEL_H + STRIP_GAP;
  const clipW = stage === "armed" ? 0 : width; // the reveal wipes the WHOLE drawing in; the finished chart is clipped to nothing
  const transition = stage === "play" ? "width 1100ms cubic-bezier(0.22, 0.61, 0.36, 1)" : "none";

  const segmentAt = (iso: string): RegimeSegment | null => {
    let found: RegimeSegment | null = null;
    for (const s of regimes) if (s.from <= iso) found = s;
    return found && iso <= found.to ? found : null;
  };
  const levelAt = (iso: string): RateLevel | null => levels.find((l) => l.from <= iso && (l.until === null || iso < l.until)) ?? null;
  const dataFor = (iso: string): TipData => ({ iso, seg: segmentAt(iso), level: levelAt(iso) });

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / Math.max(1, r.width)));
    api.showAtPointer(e, dataFor(tsToIso(Math.round(d0 + frac * (d1 - d0)) * MS_PER_DAY)));
  };

  const guideX = api.tip ? Math.min(PAD.l + plotW, Math.max(PAD.l, api.tip.x)) : null;

  return (
    <div
      ref={hostRef}
      className="relative w-full"
      onPointerLeave={(e) => e.pointerType === "mouse" && api.hide()}
    >
      <svg width={width} height={HEIGHT} role="group" aria-label={ariaLabel} className="block max-w-full select-none">
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} height={HEIGHT} style={{ width: clipW, transition }} />
          </clipPath>
        </defs>

        <g aria-hidden>
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={PAD.l + plotW} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" />
              <text x={PAD.l - 6} y={y(t)} textAnchor="end" dominantBaseline="central" fontSize={11} fill="var(--chart-axis)" className="tabular-nums">
                {formatValue(t, t % 1 === 0 ? 0 : 1)}%
              </text>
            </g>
          ))}
          {xTicks.map((t) => {
            const tx = x(t.ts / MS_PER_DAY);
            return (
              <g key={t.ts}>
                <line x1={tx} x2={tx} y1={stripY + STRIP_H} y2={stripY + STRIP_H + 4} stroke="var(--chart-axis)" />
                <text x={tx} y={stripY + STRIP_H + 17} textAnchor="middle" fontSize={11} fill="var(--chart-axis)">
                  {t.label}
                </text>
              </g>
            );
          })}
        </g>

        <g clipPath={`url(#${clipId})`}>
          {/* shading behind the line: only where the rate was being raised or cut */}
          <g aria-hidden>
            {regimes
              .filter((s) => s.kind !== "hold")
              .map((s) => (
                <rect key={`band-${s.from}`} x={x(dayNumberOf(s.from))} y={PAD.t} width={Math.max(3, x(dayNumberOf(s.to)) - x(dayNumberOf(s.from)))} height={PANEL_H} fill={COLOR[s.kind]} opacity={0.14} />
              ))}
          </g>
          <path d={path} fill="none" stroke="var(--pe-viz-purple)" strokeWidth={2} strokeLinejoin="round" aria-hidden />

          {/* the strip: one block per regime */}
          {regimes.map((s) => {
            const sx = x(dayNumberOf(s.from));
            const sw = Math.max(3, x(dayNumberOf(s.to)) - sx);
            return (
              <rect
                key={`seg-${s.from}`}
                x={sx}
                y={stripY}
                width={sw}
                height={STRIP_H}
                fill={COLOR[s.kind]}
                stroke={s.kind === "hold" ? "var(--pe-border-strong)" : "none"}
                rx={2}
                tabIndex={0}
                role="img"
                aria-label={regimeSentence(s)}
                style={{ outline: "none" }}
                className="cursor-default focus-visible:[stroke:var(--pe-focus)] focus-visible:[stroke-width:2]"
                onPointerEnter={(e) => api.showAtPointer(e, dataFor(s.from))}
                onPointerMove={(e) => api.showAtPointer(e, dataFor(s.from))}
                onPointerDown={(e) => api.showAtPointer(e, dataFor(s.from))}
                onFocus={(e) => api.showAtElement(e.currentTarget, dataFor(s.from))}
                onBlur={api.hide}
              />
            );
          })}
          {/* each recorded change, as a tick inside the strip */}
          <g aria-hidden>
            {changeDays.map((d) => (
              <line key={d} x1={x(d)} x2={x(d)} y1={stripY + 3} y2={stripY + STRIP_H - 3} stroke="var(--pe-surface)" strokeWidth={1} opacity={0.9} />
            ))}
          </g>

          {/* turning points: the rate where a run ends and the next change goes the other way */}
          <g aria-hidden>
            {turningPoints.map((tp) => {
              const tx = x(dayNumberOf(tp.date));
              const ty = y(tp.rate);
              const showLabel = labelled.has(`${tp.date}-${tp.kind}`);
              return (
                <g key={`${tp.date}-${tp.kind}`}>
                  <circle cx={tx} cy={ty} r={4} fill={tp.confirmed ? "var(--pe-viz-purple)" : "var(--pe-surface)"} stroke="var(--pe-viz-purple)" strokeWidth={1.75} />
                  {showLabel && (
                    <text x={tx} y={tp.kind === "peak" ? ty - 9 : ty + 17} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--pe-text)" className="tabular-nums">
                      {formatValue(tp.rate, 2)}%
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </g>

        {/* hover / tap target over the line panel */}
        <rect
          x={PAD.l}
          y={PAD.t}
          width={plotW}
          height={PANEL_H}
          fill="transparent"
          onPointerEnter={onMove}
          onPointerMove={onMove}
          onPointerDown={onMove}
          className="cursor-crosshair"
          aria-hidden
        />
        {guideX !== null && <line x1={guideX} x2={guideX} y1={PAD.t} y2={stripY + STRIP_H} stroke="var(--chart-axis)" strokeDasharray="3 3" pointerEvents="none" aria-hidden />}
      </svg>
      <TooltipBox api={api}>
        {(d) => (
          <>
            <TipTitle>{formatDate(d.iso)}</TipTitle>
            {d.level ? <TipRow label="Policy rate" value={pct(d.level.rate)} /> : null}
            {d.level ? (
              <p className="text-[11px]" style={{ color: "var(--chart-tooltip-label)" }}>
                {d.level.current ? `since ${formatDate(d.level.from)} (${daysText(d.level.days)} so far)` : `in effect ${formatDate(d.level.from)} to ${d.level.until ? formatDate(d.level.until) : ""} (${daysText(d.level.days)})`}
              </p>
            ) : null}
            {d.seg ? (
              <p className="mt-1 text-[11px] leading-snug" style={{ color: "var(--chart-tooltip-value)" }}>
                {regimeSentence(d.seg)}
              </p>
            ) : null}
          </>
        )}
      </TooltipBox>
    </div>
  );
}
