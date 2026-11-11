// A KPI tile that always says WHAT KIND of number it is (a year-on-year rate, a
// month-on-month rate, an index level), WHEN it is for, and where it came from.
// Server-compatible (no hooks).

import type { ReactNode } from "react";

export function KpiTile({
  label,
  kind,
  value,
  previous,
  change,
  period,
  source,
  badge,
  note,
  warning,
}: {
  label: string;
  /** The type of quantity: "Year on year", "Month on month", "Index level" … */
  kind: string;
  /** The figure as text, or an element that renders that same text (for example a count-up). */
  value: ReactNode;
  /** e.g. "10.3% in Sep 2026" */
  previous?: string | null;
  /** e.g. "−0.7 pp vs Sep 2026" */
  change?: string | null;
  /** Observation period, e.g. "Oct 2026". */
  period: string;
  source: string;
  /** The freshness badge, when the series has an authoritative verdict. */
  badge?: ReactNode;
  note?: ReactNode;
  /** Shown prominently when this observation is older than the headline's. */
  warning?: string | null;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface p-3.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12px] font-medium text-pe-text-2">{label}</span>
        <span className="shrink-0 rounded-[var(--pe-radius-sm)] border border-pe-border bg-pe-surface-2 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.05em] text-pe-text-2">{kind}</span>
      </div>
      <p className="mt-1.5 text-[30px] font-semibold leading-none tabular-nums tracking-[-0.01em] text-pe-text">{value}</p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12px]">
        <dt className="text-pe-text-3">Period</dt>
        <dd className="tabular-nums text-pe-text-2">{period}</dd>
        {previous && (
          <>
            <dt className="text-pe-text-3">Previous</dt>
            <dd className="tabular-nums text-pe-text-2">{previous}</dd>
          </>
        )}
        {change && (
          <>
            <dt className="text-pe-text-3">Change</dt>
            <dd className="tabular-nums text-pe-text-2">{change}</dd>
          </>
        )}
      </dl>
      {warning && (
        <p className="mt-2 rounded-[var(--pe-radius-sm)] border px-2 py-1 text-[11px] leading-snug" style={{ background: "var(--pe-warn-bg)", borderColor: "var(--pe-warn-border)", color: "var(--pe-warn-text)" }}>
          {warning}
        </p>
      )}
      {badge && <div className="mt-2">{badge}</div>}
      {note && <p className="mt-2 text-[11px] leading-relaxed text-pe-text-3">{note}</p>}
      <p className="mt-auto pt-2 font-mono text-[10.5px] leading-snug text-pe-text-3">{source}</p>
    </div>
  );
}
