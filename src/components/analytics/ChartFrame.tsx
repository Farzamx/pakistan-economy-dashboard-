// The wrapper every analytical chart sits in: title, one-line "how to read it",
// the chart, a source line, and an accessible TEXT ALTERNATIVE (the chart's
// underlying numbers as a real table, behind a native <details> so it costs
// nothing until opened and works without JavaScript).
//
// Server-compatible (no hooks).

import type { ReactNode } from "react";
import { LeadMore, splitLead } from "@/components/shell/Disclosure";

export { splitLead };

export interface DataTable {
  caption: string;
  head: string[];
  rows: (string | number | null)[][];
}

export function ChartFrame({
  title,
  howToRead,
  children,
  legend,
  source,
  table,
  className = "",
}: {
  title: string;
  /** What a mark means and what the chart does NOT show. A plain string leads with its first sentence; the remaining sentences sit behind "More". */
  howToRead?: ReactNode;
  children: ReactNode;
  legend?: ReactNode;
  source?: ReactNode;
  table?: DataTable;
  className?: string;
}) {
  return (
    <figure className={`min-w-0 ${className}`}>
      <figcaption className="mb-2">
        <h3 className="text-[14px] font-semibold text-pe-text">{title}</h3>
        {howToRead && <HowToRead>{howToRead}</HowToRead>}
      </figcaption>
      {legend && <div className="mb-2">{legend}</div>}
      {children}
      {source && <p className="mt-2 font-mono text-[11px] leading-relaxed text-pe-text-3">{source}</p>}
      {table && table.rows.length > 0 && (
        <details className="group mt-2">
          <summary className="inline-flex cursor-pointer select-none items-center gap-1 rounded-[var(--pe-radius-sm)] py-1 text-[12px] font-medium text-pe-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pe-focus)]">
            View the numbers as a table
          </summary>
          <div className="relative mt-1 max-h-72 overflow-auto rounded-[var(--pe-radius)] border border-pe-border" tabIndex={0} role="region" aria-label={`${table.caption} (scrolls)`}>
            <table className="w-full border-collapse text-left text-[12px] tabular-nums">
              <caption className="sr-only">{table.caption}</caption>
              <thead className="sticky top-0 bg-pe-surface-2 text-pe-text-2">
                <tr>
                  {table.head.map((h, i) => (
                    <th key={i} scope="col" className={`px-2.5 py-1.5 font-medium ${i === 0 ? "" : "text-right"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-pe-text">
                {table.rows.map((r, ri) => (
                  <tr key={ri} className="border-t border-pe-border">
                    {r.map((cell, ci) =>
                      ci === 0 ? (
                        <th key={ci} scope="row" className="whitespace-nowrap px-2.5 py-1 text-left font-normal text-pe-text-2">
                          {cell}
                        </th>
                      ) : (
                        <td key={ci} className="whitespace-nowrap px-2.5 py-1 text-right">
                          {cell === null ? <span className="text-pe-text-3">no data</span> : cell}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </figure>
  );
}

function HowToRead({ children }: { children: ReactNode }) {
  return (
    <LeadMore className="mt-0.5 max-w-3xl text-[13px] leading-relaxed text-pe-text-2">{children}</LeadMore>
  );
}

/** Info / limitation callout. `tone="limit"` for what the data cannot show. */
export function Callout({ tone = "info", title, children }: { tone?: "info" | "limit"; title?: string; children: ReactNode }) {
  const limit = tone === "limit";
  return (
    <div
      className="rounded-[var(--pe-radius)] border p-3"
      style={{
        background: limit ? "var(--pe-warn-bg)" : "var(--pe-surface-2)",
        borderColor: limit ? "var(--pe-warn-border)" : "var(--pe-border)",
      }}
    >
      {title && (
        <p className="text-[13px] font-medium" style={{ color: limit ? "var(--pe-warn-text)" : "var(--pe-text)" }}>
          {title}
        </p>
      )}
      <div className={`${title ? "mt-1 " : ""}text-[13px] leading-relaxed text-pe-text-2`}>{children}</div>
    </div>
  );
}
