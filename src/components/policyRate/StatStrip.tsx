// A row of figures that belong to the chart below them: each says what it is, gives the number (which counts up once when it scrolls into
// view) and says which dates it is for. Server component; the count-up is the one client island inside it.

import type { ReactNode } from "react";
import AnimatedFigure from "@/components/policyRate/AnimatedFigure";

export interface StatItem {
  label: string;
  /** The finished figure as text, with its sign and unit: "12.00%", "+0.39 pp". */
  value: string;
  /** Which dates it is for, and where it comes from. */
  detail?: ReactNode;
}

export default function StatStrip({ items, label }: { items: StatItem[]; label: string }) {
  if (items.length === 0) return null;
  return (
    <dl aria-label={label} className="grid grid-cols-[repeat(auto-fit,minmax(168px,1fr))] gap-3">
      {items.map((it) => (
        <div key={it.label} className="min-w-0 rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface px-3 py-2.5">
          <dt className="text-[12px] text-pe-text-2">{it.label}</dt>
          <dd className="mt-0.5 text-[18px] font-semibold tabular-nums text-pe-text">
            <AnimatedFigure value={it.value} />
          </dd>
          {it.detail ? <dd className="mt-0.5 text-[11.5px] leading-snug text-pe-text-2">{it.detail}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
