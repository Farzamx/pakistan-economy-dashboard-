"use client";

import { useMemo, useRef, useState } from "react";
import BudgetTrendChart from "./BudgetTrendChart";
import { exportChartAsPng, exportTrendAsCsv } from "@/lib/budget/exportUtils";
import {
  getBudgetEnvelope,
  getCategorySummary,
  getCategoryTrendSeries,
  isFieldAvailableInMode,
  type BudgetTrendField,
  type TrendValueMode,
} from "@/lib/budget/budgetData";
import type { BudgetYearRecord } from "@/data/budgetHistorical";
import { useLanguage } from "@/components/LanguageProvider";

interface BudgetDetailViewProps {
  /** Plain data only — never pass the BudgetCategoryDef object itself (its getValue function can't cross the server/client boundary). */
  slug: string;
  shortTitle: string;
  disclaimer?: string;
  years: BudgetYearRecord[];
  field: BudgetTrendField;
}

const rs = (v: number) => `Rs ${v.toLocaleString("en-US", { maximumFractionDigits: v >= 1000 ? 0 : 1 })}bn`;

// Federal education/health are genuinely a tiny sliver of GDP — toFixed(1) rounds anything under 0.05% to a misleading-looking "0.0%". More decimals for small values keeps it truthful instead of looking like a broken calculation.
const formatPct = (pct: number) => `${pct.toFixed(pct < 1 ? 2 : 1)}%`;

export default function BudgetDetailView({ slug, shortTitle, disclaimer, years, field }: BudgetDetailViewProps) {
  const { t } = useLanguage();
  const chartRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<TrendValueMode>("nominal");
  const latest = years[years.length - 1];
  const summary = useMemo(() => getCategorySummary(field, years), [field, years]);
  const value = summary?.latestValue ?? null;

  // Provincial Transfers is deducted on the revenue side in Budget in Brief and is not a component of Total Outlay, so its share is taken on the wider
  // budget envelope; every outlay component is taken on total outlay; revenue lines and the deficit have no share of outlay (null).
  const shareBasis: { label: string; pct: number | null } =
    field === "provincialTransfer"
      ? { label: "Share of the budget envelope", pct: value !== null ? (value / getBudgetEnvelope(latest)) * 100 : null }
      : { label: "Share of total outlay", pct: summary?.shareOfOutlay ?? null };

  const availableModes: { mode: TrendValueMode; label: string }[] = [
    { mode: "nominal", label: "Nominal Rs bn" },
    ...(isFieldAvailableInMode(field, "shareOutlay") ? [{ mode: "shareOutlay" as const, label: "% of total outlay" }] : []),
    { mode: "pctGdp", label: "% of GDP" },
  ];
  const trendPoints = useMemo(() => getCategoryTrendSeries([field], mode, years), [field, mode, years]);
  const yoy = summary?.yoy ?? null;
  const cagr = summary?.cagr ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-card flex flex-col gap-1 rounded-xl p-4">
          <span className="text-xs text-[var(--text-muted)]">FY{latest.fiscalYear} Budget Estimate</span>
          <span className="text-2xl font-semibold text-[var(--text-primary)]">{value !== null ? rs(value) : "—"}</span>
          {yoy && (
            <span className="text-[11px] text-[var(--text-muted)]">
              {yoy.pct >= 0 ? "+" : ""}
              {yoy.pct.toFixed(1)}% on the previous year (nominal)
            </span>
          )}
        </div>
        <div className="glass-card flex flex-col gap-1 rounded-xl p-4">
          <span className="text-xs text-[var(--text-muted)]">{shareBasis.label}</span>
          <span className="text-2xl font-semibold text-[var(--text-primary)]">{shareBasis.pct !== null ? formatPct(shareBasis.pct) : "—"}</span>
          {shareBasis.pct === null && <span className="text-[11px] text-[var(--text-muted)]">Not a component of total outlay, so it has no share of it.</span>}
          {summary?.rank && (
            <span className="text-[11px] text-[var(--text-muted)]">
              Rank {summary.rank.position} of {summary.rank.of} itemised allocations
            </span>
          )}
        </div>
        <div className="glass-card flex flex-col gap-1 rounded-xl p-4">
          <span className="text-xs text-[var(--text-muted)]">{t("budget.shareOfGdp")}</span>
          <span className="text-2xl font-semibold text-[var(--text-primary)]">{summary?.pctOfGdp ? formatPct(summary.pctOfGdp.value) : "—"}</span>
          {summary?.pctOfGdp && (
            <span className="text-[11px] text-[var(--text-muted)]">
              {summary.pctOfGdp.basis === "stated" ? "On the nominal GDP printed in Budget in Brief" : "On a GDP implied from the printed deficit (approximate)"}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
          <span className="text-xs text-[var(--text-muted)]">Compound annual growth (nominal)</span>
          <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{cagr ? `${cagr.pct.toFixed(1)}% a year` : "—"}</p>
          {cagr && (
            <p className="text-[11px] text-[var(--text-muted)]">
              FY{cagr.fromFy} ({rs(cagr.startValue)}) to FY{cagr.toFy} ({rs(cagr.endValue)}). Includes inflation; not real growth.
            </p>
          )}
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
          <span className="text-xs text-[var(--text-muted)]">Highest budgeted amount</span>
          <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{summary?.peak ? rs(summary.peak.value) : "—"}</p>
          {summary?.peak && <p className="text-[11px] text-[var(--text-muted)]">FY{summary.peak.fiscalYear}</p>}
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
          <span className="text-xs text-[var(--text-muted)]">Coverage</span>
          <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
            {years.length - (summary?.missingYears.length ?? 0)} of {years.length} years
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {summary && summary.missingYears.length > 0 ? `Not itemised in ${summary.missingYears.map((y) => `FY${y}`).join(", ")}; left blank, not zero.` : "A figure is printed in every year."}
          </p>
        </div>
      </div>

      {disclaimer && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm text-amber-200">
          <strong>{t("budget.note")}</strong> {disclaimer}
        </div>
      )}

      <div className="glass-card flex flex-col gap-4 rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">FY{years[0].fiscalYear} — FY{latest.fiscalYear} {t("budget.trendTitle")}</h3>
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1" role="group" aria-label="Value basis">
              {availableModes.map((m) => (
                <button
                  key={m.mode}
                  type="button"
                  aria-pressed={mode === m.mode}
                  onClick={() => setMode(m.mode)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${mode === m.mode ? "bg-neon-blue/15 text-neon-blue" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => chartRef.current && exportChartAsPng(chartRef.current, `${slug}.png`, "#05060f")}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              {t("budget.exportPng")}
            </button>
            <button
              type="button"
              onClick={() => exportTrendAsCsv(trendPoints, { [field]: shortTitle }, `${slug}.csv`)}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              {t("budget.exportCsv")}
            </button>
          </div>
        </div>
        <div ref={chartRef}>
          <BudgetTrendChart points={trendPoints} fields={[field]} mode={mode} />
        </div>
        <p className="text-[11px] text-[var(--text-muted)]">
          {mode === "nominal" ? "Nominal rupees at each year's own prices, not adjusted for inflation. " : ""}
          {mode === "pctGdp" ? "Nominal GDP is printed in Budget in Brief from FY2019-20; earlier years use an implied GDP (±~1.4%). " : ""}
          {t("budget.sourceNote")}
        </p>
      </div>
    </div>
  );
}
