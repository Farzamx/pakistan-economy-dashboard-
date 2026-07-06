import type { ReactNode } from "react";
import type { BudgetInsight } from "@/lib/budget/budgetData";

interface BudgetInsightsPanelProps {
  insights: BudgetInsight[];
  title?: ReactNode;
}

export default function BudgetInsightsPanel({ insights, title = "Budget Insights" }: BudgetInsightsPanelProps) {
  if (insights.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
      {title && <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">{title}</p>}
      {insights.map((insight, i) => (
        <p key={i} className="text-xs leading-relaxed text-[var(--text-secondary)]">
          <span className="mr-1.5 text-neon-blue">▸</span>
          {insight.text}
        </p>
      ))}
    </div>
  );
}
