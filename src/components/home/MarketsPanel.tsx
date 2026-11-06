// Compact market strip for the homepage (PEIC redesign Phase 3).
// Server-compatible (no hooks).
//
// Renders market quotes the overview page has ALREADY fetched and passes in —
// this component performs no fetching of its own, so it adds no request to
// the page. An instrument whose fetch failed upstream is simply absent from
// `rows`; nothing here substitutes a placeholder or a zero.
//
// Each row carries the quote's own observation date, so a stale weekend
// quote is never silently presented as "now".

import Link from "next/link";
import type { Kpi } from "@/data/kpiData";
import { ChangeValue, SourceStamp } from "./valueDisplay";

export interface MarketRow {
  /** Short display label, e.g. "USD/PKR". */
  label: string;
  kpi: Kpi;
  /** Existing indicator page for this instrument, when one exists. */
  href?: string;
}

export default function MarketsPanel({ rows }: { rows: MarketRow[] }) {
  if (rows.length === 0) {
    return <p className="px-4 py-3 text-[13px] text-pe-text-3">Market data is unavailable right now.</p>;
  }

  return (
    // A wrapping grid, not a horizontal scroller.
    //
    // The scroller this replaces forced every instrument onto one row
    // (`flex min-w-max` with a 148px minimum per cell): 11 instruments
    // needed ~1,628px, so even a 1440px desktop showed a permanent
    // scrollbar and clipped the last cells at the viewport edge. A grid
    // reflows instead — 2 columns on a phone up to 6 on a wide desktop —
    // so every instrument is visible at every width with no scrollbar and
    // nothing hidden. The 1px gap over a border-coloured background draws
    // the separators (no per-cell borders to collapse).
    //
    // COLUMN COUNTS ARE CHOSEN SO ROWS ARE COMPLETE. That same gap trick
    // means an EMPTY grid cell shows the border colour as a solid grey block.
    // With 15 instruments, 6 columns left 3 empty cells (17.5% of the grid at
    // 1440px) and 4 columns left 1, so the counts are now ones that divide 15:
    // 3 from `sm` and 5 from `lg` (15 = 5 x 3), measured to fit with nothing
    // clipped down to 134px cards at 1024px. Two columns cannot divide an odd
    // count, so below `sm` the last card, when it would sit alone, spans both
    // columns instead of leaving a grey cell. Nothing is added, duplicated or
    // reordered to fill space. If the number of instruments ever changes,
    // revisit these counts: they are tuned to 15.
    <ul className="grid grid-cols-2 gap-px bg-pe-border max-sm:[&>li:last-child:nth-child(odd)]:col-span-2 sm:grid-cols-3 lg:grid-cols-5">
      {rows.map(({ label, kpi, href }) => {
        const body = (
          <>
            {/* Long labels (e.g. "KSE-100 proxy") wrap rather than
                stretching the column or being clipped. */}
            <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-pe-text-3">{label}</span>
            <span className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
              <span className="text-[16px] font-semibold tabular-nums text-pe-text">{kpi.value}</span>
              {kpi.unit && <span className="text-[12px] text-pe-text-3">{kpi.unit}</span>}
            </span>
            <ChangeValue change={kpi.change} className="mt-0.5 text-[12px]" />
            <SourceStamp kpi={kpi} className="mt-auto block pt-0.5" />
          </>
        );
        return (
          <li key={label} className="min-w-0 bg-pe-surface">
            {href ? (
              <Link href={href} className="flex h-full flex-col px-3 py-2 hover:bg-pe-surface-2">
                {body}
              </Link>
            ) : (
              <div className="flex h-full flex-col px-3 py-2">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
