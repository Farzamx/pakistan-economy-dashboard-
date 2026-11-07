"use client";

// Treemap of the CPI basket: AREA = a group's fixed 2015-16 basket weight
// (the share of the average household's spending PBS assigns it), COLOUR = that
// group's latest YoY inflation (class-break scale, same as the heatmaps).
// Two quantities, deliberately NOT blended: size says how much of the basket the
// group is, colour says how fast its prices are rising. A large dark box is
// where weight and inflation coincide.

import { useMemo } from "react";
import { squarify } from "@/lib/analytics/treemapLayout";
import { classify, YOY_SCALE } from "@/lib/analytics/vizPalette";
import { formatPercent, formatValue } from "@/lib/analytics/scales";
import { HeatLegend } from "@/components/analytics/Heatmap";
import { TipRow, TipTitle, TooltipBox, useChartTooltip } from "@/components/analytics/tooltip";

export interface TreemapDatum {
  id: string;
  label: string;
  /** Basket weight, % — sets the area. */
  weight: number;
  /** Latest YoY %, sets the colour; null = no reading (drawn neutral, hatched in the legend). */
  yoy: number | null;
}

export function Treemap({ items, height = 340, ariaLabel }: { items: TreemapDatum[]; height?: number; ariaLabel: string }) {
  const [api, attach] = useChartTooltip<TreemapDatum>();
  const W = api.width;
  const cells = useMemo(() => squarify(items.map((i) => ({ id: i.id, value: i.weight })), { x: 0, y: 0, w: W, h: height }), [items, W, height]);
  const byId = new Map(items.map((i) => [i.id, i]));

  return (
    <div>
      <div ref={attach} className="relative w-full overflow-hidden rounded-[var(--pe-radius)]" style={{ height }} role="group" aria-label={ariaLabel} onPointerLeave={(e) => e.pointerType === "mouse" && api.hide()}>
        {cells.map((cell) => {
          const d = byId.get(cell.id) as TreemapDatum;
          const cls = d.yoy === null ? null : classify(YOY_SCALE, d.yoy);
          const roomy = cell.w > 110 && cell.h > 56;
          const longestWord = Math.max(...d.label.split(/\s+/).map((w) => w.length));
          const tiny = cell.h < 30 || longestWord * (roomy ? 6.8 : 6.2) + 14 > cell.w; // never clip a word mid-label
          return (
            <button
              key={cell.id}
              type="button"
              aria-label={`${d.label}: ${formatValue(d.weight, 2)}% of the basket, ${d.yoy === null ? "no inflation reading" : `${formatValue(d.yoy, 1)}% year on year`}`}
              onPointerEnter={(e) => api.showAtPointer(e, d)}
              onPointerMove={(e) => api.showAtPointer(e, d)}
              onClick={(e) => api.showAtPointer(e, d)}
              onFocus={(e) => api.showAtElement(e.currentTarget, d)}
              onBlur={api.hide}
              className="absolute overflow-hidden border border-[var(--pe-surface)] p-1.5 text-left leading-tight focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--pe-focus)]"
              style={{
                left: cell.x,
                top: cell.y,
                width: cell.w,
                height: cell.h,
                background: cls ? `var(--pe-heat-${cls.id})` : "var(--pe-surface-2)",
                color: cls ? `var(--pe-heat-${cls.id}-ink)` : "var(--pe-text-2)",
              }}
            >
              {!tiny && <span className={`block font-medium ${roomy ? "text-[12px]" : "text-[11px]"}`}>{d.label}</span>}
              {roomy && (
                <span className="mt-0.5 block text-[11px] tabular-nums">
                  {formatValue(d.weight, 1)}% of basket
                  <br />
                  {d.yoy === null ? "no reading" : `${formatPercent(d.yoy, 1)} YoY`}
                </span>
              )}
            </button>
          );
        })}
        <TooltipBox api={api}>
          {(d) => (
            <>
              <TipTitle>{d.label}</TipTitle>
              <TipRow label="Share of basket" value={`${formatValue(d.weight, 2)}%`} />
              <TipRow label="Latest YoY" value={d.yoy === null ? "no reading" : formatPercent(d.yoy, 1)} />
            </>
          )}
        </TooltipBox>
      </div>
      <div className="mt-2">
        <p className="mb-1 text-[11px] text-pe-text-3">Box size = share of the basket (fixed 2015-16 weight). Box colour = latest year-on-year inflation:</p>
        <HeatLegend scale={YOY_SCALE} showMissing={false} />
      </div>
    </div>
  );
}
