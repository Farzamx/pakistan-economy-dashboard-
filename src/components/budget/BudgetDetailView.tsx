"use client";

import { useMemo, useRef } from "react";
import BudgetTrendChart from "./BudgetTrendChart";
import { exportChartAsPng, exportTrendAsCsv } from "@/lib/budget/exportUtils";
import { getBudgetEnvelope, getCategoryTrendSeries, getImpliedNominalGdp, type BudgetTrendField } from "@/lib/budget/budgetData";
import type { BudgetYearRecord } from "@/data/budgetHistorical";

interface BudgetDetailViewProps {
  /** Plain data only — never pass the BudgetCategoryDef object itself (its getValue function can't cross the server/client boundary). */
  slug: string;
  shortTitle: string;
  disclaimer?: string;
  years: BudgetYearRecord[];
  field: BudgetTrendField;
}

export default function BudgetDetailView({ slug, shortTitle, disclaimer, years, field }: BudgetDetailViewProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const latest = years[years.length - 1];
  const value = latest[field] as number | null;
  // Provincial Transfers is deducted on the revenue side in Budget in Brief,
  // not a component of Total Outlay/Expenditure — comparing it against
  // totalOutlay alone would overstate its share. Use the wider budget
  // envelope (see getBudgetEnvelope) for that one field; every other field
  // genuinely is a sub-component of Total Outlay, so that stays the base.
  const shareBase = field === "provincialTransfer" ? getBudgetEnvelope(latest) : latest.totalOutlay;
  const shareOfBudget = value !== null && shareBase > 0 ? (value / shareBase) * 100 : null;
  const gdp = getImpliedNominalGdp(latest);
  const shareOfGdp = value !== null && gdp > 0 ? (value / gdp) * 100 : null;

  const trendPoints = useMemo(() => getCategoryTrendSeries([field], "nominal", years), [field, years]);

  // Federal-only categories (education/health) are genuinely a tiny sliver
  // of GDP — toFixed(1) rounds anything under 0.05% to a misleading-looking
  // "0.0%". More decimals for small values keeps it truthful instead of
  // looking like a broken calculation.
  function formatPct(pct: number): string {
    return `${pct.toFixed(pct < 1 ? 2 : 1)}%`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-card flex flex-col gap-1 rounded-xl p-4">
          <span className="text-xs text-[var(--text-muted)]">FY{latest.fiscalYear} Value</span>
          <span className="text-2xl font-semibold text-[var(--text-primary)]">
            {value !== null ? `Rs ${value.toFixed(value >= 1000 ? 0 : 1)}bn` : "—"}
          </span>
        </div>
        <div className="glass-card flex flex-col gap-1 rounded-xl p-4">
          <span className="text-xs text-[var(--text-muted)]">Share of Total Budget</span>
          <span className="text-2xl font-semibold text-[var(--text-primary)]">
            {shareOfBudget !== null ? formatPct(shareOfBudget) : "—"}
          </span>
        </div>
        <div className="glass-card flex flex-col gap-1 rounded-xl p-4">
          <span className="text-xs text-[var(--text-muted)]">Share of GDP</span>
          <span className="text-2xl font-semibold text-[var(--text-primary)]">
            {shareOfGdp !== null ? formatPct(shareOfGdp) : "—"}
          </span>
        </div>
      </div>

      {disclaimer && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm text-amber-200">
          <strong>Note:</strong> {disclaimer}
        </div>
      )}

      <div className="glass-card flex flex-col gap-4 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">FY2010-11 — FY2026-27 Trend</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => chartRef.current && exportChartAsPng(chartRef.current, `${slug}.png`, "#05060f")}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              PNG
            </button>
            <button
              type="button"
              onClick={() => exportTrendAsCsv(trendPoints, { [field]: shortTitle }, `${slug}.csv`)}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              CSV
            </button>
          </div>
        </div>
        <div ref={chartRef}>
          <BudgetTrendChart points={trendPoints} fields={[field]} mode="nominal" />
        </div>
        <p className="text-[11px] text-[var(--text-muted)]">Source: Budget in Brief, each fiscal year&apos;s own Budget Estimate.</p>
      </div>
    </div>
  );
}
