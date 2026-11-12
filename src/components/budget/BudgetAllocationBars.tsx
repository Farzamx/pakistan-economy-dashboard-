import type { AllocationSlice } from "@/lib/budget/budgetData";

interface BudgetAllocationBarsProps {
  data: AllocationSlice[];
  /** Used to replay the grow-in animation when the selected fiscal year changes. */
  fiscalYear: string;
}

function fmtRs(v: number): string {
  return `Rs ${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}bn`;
}

/**
 * Ranked horizontal bars: every row prints its amount and its share of the budget envelope as text, so the exact figures are in the server-rendered
 * HTML and readable without hovering. Bars are scaled to the largest slice. The grow-in is a CSS animation (no JS, so the final width is in the
 * first paint for anyone with reduced motion or without script), keyed by fiscal year so it replays on a year change.
 */
export default function BudgetAllocationBars({ data, fiscalYear }: BudgetAllocationBarsProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div key={fiscalYear} data-testid="budget-allocation-bars">
      <style>{`
        @keyframes budget-bar-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        .budget-bar-fill { transform-origin: left center; animation: budget-bar-grow 0.8s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) { .budget-bar-fill { animation: none; } }
      `}</style>
      <ul className="flex flex-col gap-3" aria-label={`Allocation of the FY${fiscalYear} budget envelope`}>
        {data.map((s, i) => (
          <li key={s.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1">
            <span className="flex min-w-0 items-center gap-2 text-sm text-[var(--text-primary)]">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
              <span className="truncate">{s.label}</span>
              {s.kind !== "itemised" && <span className="shrink-0 rounded border border-[var(--border)] px-1 text-[10px] text-[var(--text-muted)]">{s.kind === "bundled" ? "bundled" : "remainder"}</span>}
            </span>
            <span className="text-right text-sm tabular-nums text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">{fmtRs(s.value)}</span> · {s.pct.toFixed(1)}%
            </span>
            <span className="col-span-2 block h-2 overflow-hidden rounded-full bg-[var(--surface-hover)]" aria-hidden="true">
              <span
                className="budget-bar-fill block h-full rounded-full"
                style={{ width: `${(s.value / max) * 100}%`, background: s.color, animationDelay: `${i * 70}ms` }}
              />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
