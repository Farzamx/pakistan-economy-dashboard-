import type { ReactNode } from "react";
import type { InsightEvidence } from "@/lib/budget/budgetData";

/**
 * Structural, so both the federal insights (which carry evidence and a caveat) and the provincial page's text-only insights render here.
 * Where evidence exists it is shown behind a native <details>, so a reader can reproduce the sentence from the figures it was computed from.
 */
export interface PanelInsight {
  id?: string;
  text: string;
  evidence?: InsightEvidence[];
  caveat?: string;
}

interface BudgetInsightsPanelProps {
  insights: PanelInsight[];
  title?: ReactNode;
}

function formatEvidence(e: InsightEvidence): string {
  if (e.unit === "Rs bn") return `Rs ${e.value.toLocaleString("en-US", { maximumFractionDigits: 0 })}bn`;
  if (e.unit === "pp") return `${e.value >= 0 ? "+" : ""}${e.value.toFixed(1)} pp`;
  return `${e.value.toFixed(2)}%`;
}

export default function BudgetInsightsPanel({ insights, title = "Budget Insights" }: BudgetInsightsPanelProps) {
  if (insights.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
      {title && <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">{title}</p>}
      {insights.map((insight, i) => (
        <div key={insight.id ?? i} className="text-xs leading-relaxed text-[var(--text-secondary)]">
          <p>
            <span className="mr-1.5 text-neon-blue">▸</span>
            {insight.text}
          </p>
          {insight.caveat && <p className="ml-4 mt-0.5 text-[11px] text-[var(--text-muted)]">{insight.caveat}</p>}
          {insight.evidence && insight.evidence.length > 0 && (
            <details className="ml-4 mt-0.5 text-[11px] text-[var(--text-muted)]">
              <summary className="cursor-pointer select-none hover:text-[var(--text-secondary)]">Show the figures behind this</summary>
              <ul className="mt-1 grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
                {insight.evidence.map((e, j) => (
                  <li key={j} className="flex justify-between gap-3 tabular-nums">
                    <span>
                      {e.label} · FY{e.fiscalYear}
                    </span>
                    <span className="text-[var(--text-secondary)]">{formatEvidence(e)}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}
