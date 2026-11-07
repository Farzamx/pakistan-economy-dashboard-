"use client";

// Small multiples: one small trend chart per category, all on the SAME vertical
// scale (by default), so a glance across the grid compares how much each
// category moved, not just its shape. A flat line on a shared scale really is
// flat. Months with no observation break the line instead of being bridged.

import { useMemo, useState } from "react";
import { linearScale, formatValue, niceTicks } from "@/lib/analytics/scales";
import { monthIndex, shortMonthLabel, type MonthlyPoint } from "@/lib/inflation/periods";

export interface MultipleItem {
  key: string;
  label: string;
  points: MonthlyPoint[];
}

const W = 220;
const H = 70;
const PAD = { l: 4, r: 6, t: 6, b: 6 };

function Mini({ item, domain, unit, showRange }: { item: MultipleItem; domain: [number, number]; unit: string; showRange: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const pts = item.points;
  const first = pts[0];
  const last = pts[pts.length - 1];
  const shown = hover !== null ? pts[hover] : last;

  const geo = useMemo(() => {
    if (pts.length === 0) return null;
    const x = linearScale([monthIndex(first.month), monthIndex(last.month)], [PAD.l, W - PAD.r]);
    const y = linearScale(domain, [H - PAD.b, PAD.t]);
    // Break the path wherever consecutive points are not adjacent months.
    let d = "";
    pts.forEach((p, i) => {
      const gap = i === 0 || monthIndex(p.month) - monthIndex(pts[i - 1].month) !== 1;
      d += `${gap ? "M" : "L"}${x(monthIndex(p.month)).toFixed(1)},${y(p.value).toFixed(1)}`;
    });
    return { x, y, d };
  }, [pts, domain, first, last]);

  return (
    <li className="min-w-0 rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface p-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="min-w-0 truncate text-[12px] font-medium text-pe-text" title={item.label}>{item.label}</h4>
        {shown && <span className="shrink-0 text-[13px] font-semibold tabular-nums text-pe-text">{formatValue(shown.value, 1)}{unit}</span>}
      </div>
      <p className="flex h-4 justify-between gap-2 text-[11px] text-pe-text-3">
        <span>{shown ? shortMonthLabel(shown.month) : "no data"}</span>
        {showRange && pts.length > 0 && <span className="tabular-nums">scale {formatValue(domain[0], 0)} to {formatValue(domain[1], 0)}{unit}</span>}
      </p>
      {geo ? (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mt-0.5 block w-full touch-pan-y"
          role="img"
          aria-label={`${item.label}: ${formatValue(first.value, 1)}${unit} in ${shortMonthLabel(first.month)} to ${formatValue(last.value, 1)}${unit} in ${shortMonthLabel(last.month)}`}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - r.left) / r.width) * W;
            let best = 0;
            let bestD = Infinity;
            pts.forEach((p, i) => {
              const dd = Math.abs(geo.x(monthIndex(p.month)) - px);
              if (dd < bestD) { bestD = dd; best = i; }
            });
            setHover(best);
          }}
          onPointerLeave={() => setHover(null)}
          onPointerDown={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - r.left) / r.width) * W;
            let best = 0;
            let bestD = Infinity;
            pts.forEach((p, i) => { const dd = Math.abs(geo.x(monthIndex(p.month)) - px); if (dd < bestD) { bestD = dd; best = i; } });
            setHover(best);
          }}
        >
          {domain[0] < 0 && domain[1] > 0 && <line x1={PAD.l} x2={W - PAD.r} y1={geo.y(0)} y2={geo.y(0)} stroke="var(--chart-axis)" strokeWidth={1} strokeDasharray="3 3" />}
          <path d={geo.d} fill="none" stroke="var(--pe-viz-blue)" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
          {shown && <circle cx={geo.x(monthIndex(shown.month))} cy={geo.y(shown.value)} r={3.5} fill="var(--pe-viz-blue)" stroke="var(--pe-surface)" strokeWidth={1.5} />}
        </svg>
      ) : (
        <p className="py-6 text-center text-[12px] italic text-pe-text-3">no data</p>
      )}
    </li>
  );
}

export function SmallMultiples({ items, unit = "%", sharedScale = true }: { items: MultipleItem[]; unit?: string; sharedScale?: boolean }) {
  const all = items.flatMap((i) => i.points.map((p) => p.value));
  const valuesKey = all.join("|");
  const sharedDomain = useMemo<[number, number]>(() => {
    const t = niceTicks(all.length ? Math.min(...all) : 0, all.length ? Math.max(...all) : 1, 4);
    return [t[0], t[t.length - 1]];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valuesKey]);
  return (
    <ul className="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Trend by category">
      {items.map((it) => {
        const vals = it.points.map((p) => p.value);
        const own: [number, number] = vals.length ? [Math.min(...vals), Math.max(...vals)] : [0, 1];
        return <Mini key={it.key} item={it} domain={sharedScale ? sharedDomain : (() => { const t = niceTicks(own[0], own[1], 3); return [t[0], t[t.length - 1]] as [number, number]; })()} unit={unit} showRange />;
      })}
    </ul>
  );
}
