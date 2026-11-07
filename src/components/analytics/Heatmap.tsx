"use client";

// Heatmap as a real <table>: row and column headers are <th scope>, every cell
// carries its value as TEXT, so a screen reader reads "Transport, Oct 26, 28.6"
// without any chart-specific work.
//
// Colour comes from a class-break scale (src/lib/analytics/vizPalette.ts), never
// a continuous gradient: a cell's colour names a range a legend can state, and
// no shade implies a value that was not observed. A MISSING observation has no
// colour class at all — it is hatched and reads "no data" — and is never drawn
// as zero. The table scrolls inside its own container (first column sticky), so
// a wide matrix never widens the page.

import { useId, useState } from "react";
import { classify, type HeatScale } from "@/lib/analytics/vizPalette";
import { formatValue } from "@/lib/analytics/scales";

export interface HeatRow {
  key: string;
  label: string;
  /** One entry per column; null = no observation. */
  cells: (number | null)[];
}

export interface HeatColumn {
  key: string;
  /** Header text, e.g. "Oct 26" or "2024". */
  label: string;
}

export const HATCH =
  "repeating-linear-gradient(45deg, transparent 0 4px, var(--pe-border-strong) 4px 5px)";

export function Heatmap({
  rows,
  columns,
  scale,
  caption,
  decimals = 1,
  cellTitle,
  minCellWidth = 40,
  labelWidth = 150,
}: {
  rows: HeatRow[];
  columns: HeatColumn[];
  scale: HeatScale;
  /** Accessible table caption: what the cells are and their unit. */
  caption: string;
  decimals?: number;
  /** Full sentence for a cell, e.g. "Transport, Oct 2026: 28.6% YoY". */
  cellTitle: (row: HeatRow, col: HeatColumn, value: number | null) => string;
  minCellWidth?: number;
  labelWidth?: number;
}) {
  const [readout, setReadout] = useState<string | null>(null);
  const readoutId = useId();
  const nulls = rows.reduce((n, r) => n + r.cells.filter((v) => v === null).length, 0);

  return (
    <div>
      {/* `relative` makes this the containing block for the absolutely-positioned sr-only labels inside the table, so they are clipped by the scroller instead of stretching the page. */}
      <div className="relative overflow-x-auto rounded-[var(--pe-radius)] border border-pe-border" tabIndex={0} role="region" aria-label={`${caption} (scrolls sideways)`}>
        <table className="border-separate border-spacing-px text-[11px] tabular-nums" style={{ background: "var(--pe-border)" }}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-pe-surface px-2 py-1.5 text-left font-medium text-pe-text-3" style={{ minWidth: labelWidth, width: labelWidth }}>
                <span className="sr-only">Row</span>
              </th>
              {columns.map((c) => (
                <th key={c.key} scope="col" className="bg-pe-surface px-1 py-1.5 text-center font-medium text-pe-text-3" style={{ minWidth: minCellWidth }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <th scope="row" className="sticky left-0 z-10 whitespace-nowrap bg-pe-surface px-2 py-1 text-left text-[12px] font-normal text-pe-text-2" style={{ minWidth: labelWidth, width: labelWidth }}>
                  {r.label}
                </th>
                {r.cells.map((v, ci) => {
                  const col = columns[ci];
                  const text = cellTitle(r, col, v);
                  if (v === null) {
                    return (
                      <td
                        key={col.key}
                        title={text}
                        onMouseEnter={() => setReadout(text)}
                        onClick={() => setReadout(text)}
                        className="h-7 bg-pe-surface text-center text-pe-text-3"
                        style={{ backgroundImage: HATCH }}
                      >
                        <span className="sr-only">no data</span>
                      </td>
                    );
                  }
                  const cls = classify(scale, v);
                  return (
                    <td
                      key={col.key}
                      title={text}
                      onMouseEnter={() => setReadout(text)}
                      onClick={() => setReadout(text)}
                      className="h-7 cursor-default px-0.5 text-center"
                      style={{ background: `var(--pe-heat-${cls.id})`, color: `var(--pe-heat-${cls.id}-ink)` }}
                    >
                      {formatValue(v, decimals)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tap/hover readout: native title tooltips do not exist on touch screens. */}
      <p id={readoutId} aria-live="polite" className="mt-1.5 min-h-[1.25rem] text-[12px] text-pe-text-2">
        {readout ?? <span className="text-pe-text-3">Tap or hover a cell for its exact value.</span>}
      </p>

      <HeatLegend scale={scale} showMissing={nulls > 0} />
    </div>
  );
}

export function HeatLegend({ scale, showMissing }: { scale: HeatScale; showMissing: boolean }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-pe-text-2" aria-label={`Colour key, ${scale.unit}`} role="group">
      <span className="font-medium text-pe-text-3">{scale.unit}:</span>
      {scale.classes.map((c) => (
        <span key={c.id} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-3.5 w-5 rounded-[2px] border border-pe-border" style={{ background: `var(--pe-heat-${c.id})` }} />
          {c.label}
        </span>
      ))}
      {showMissing && (
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-3.5 w-5 rounded-[2px] border border-pe-border bg-pe-surface" style={{ backgroundImage: HATCH }} />
          no observation
        </span>
      )}
    </div>
  );
}
