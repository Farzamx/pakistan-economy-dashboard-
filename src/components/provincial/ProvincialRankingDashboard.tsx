"use client";

// Province Ranking Dashboard (Phase 6 of the Historical Explorer build) —
// a focused Metric + Year picker over rankProvincesByFieldForYear, distinct
// from the full Growth Explorer (which also has Province/TimeRange/ViewMode
// controls). Reused as-is on the provinces overview page and on each of the
// Phase 9 dedicated ranking SEO pages, optionally pre-locked to one metric.

import { useMemo, useState } from "react";
import { COMPARISON_METRICS, rankProvincesByFieldForYear, getAllRankableFiscalYears, type ProvincialComparisonMetric } from "@/lib/provincial/provincialComparison";
import type { ProvincialTrendField } from "@/lib/provincial/provincialBudgetData";
import Dropdown from "@/components/Dropdown";
import ProvincialRankingBarChart from "./ProvincialRankingBarChart";

/** Phase 6 explicitly lists 8 of the 11 tracked metrics as rankable — Current Expenditure and Infrastructure are left out of the default set (still reachable via the Growth Explorer's Ranking view) since the audit found their basis varies most across provinces, making a flat cross-province rank more likely to mislead. */
const RANKING_METRICS: ProvincialComparisonMetric[] = COMPARISON_METRICS.filter(
  (m) => !["currentExpenditure", "infrastructure"].includes(m.field),
);

interface ProvincialRankingDashboardProps {
  /** Pre-selects and hides the Metric picker — used by the dedicated single-metric SEO pages (e.g. /provincial-budget/debt-burden-rankings). */
  lockedMetric?: ProvincialTrendField;
  title?: string;
}

export default function ProvincialRankingDashboard({ lockedMetric, title }: ProvincialRankingDashboardProps) {
  const rankableYears = useMemo(() => getAllRankableFiscalYears(), []);
  const [metric, setMetric] = useState<ProvincialTrendField>(lockedMetric ?? "totalOutlay");
  const [year, setYear] = useState<string>(rankableYears[rankableYears.length - 1]);

  const metricMeta = RANKING_METRICS.find((m) => m.field === metric) ?? COMPARISON_METRICS.find((m) => m.field === metric);
  const entries = useMemo(() => rankProvincesByFieldForYear(metric, year), [metric, year]);

  return (
    <section className="glass-card flex flex-col gap-5 rounded-2xl p-6 sm:p-8">
      <div>
        <h2 className="text-xl font-semibold text-white light:text-slate-900">{title ?? "Province Ranking Dashboard"}</h2>
        <p className="mt-1 text-sm text-white/60 light:text-slate-500">
          Rank Punjab, Sindh, Khyber Pakhtunkhwa, and Balochistan against each other for any fiscal year both provinces have a verified record for.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {!lockedMetric && (
          <div className="flex flex-wrap gap-1.5">
            {RANKING_METRICS.map((m) => (
              <button
                key={m.field}
                type="button"
                onClick={() => setMetric(m.field)}
                aria-pressed={metric === m.field}
                className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                  metric === m.field ? "border-neon-blue/40 bg-neon-blue/15 text-neon-blue" : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
          Fiscal Year
          <Dropdown label="Fiscal Year" value={year} onChange={setYear} options={rankableYears.map((y) => ({ value: y, label: `FY${y}` }))} />
        </div>
      </div>

      <p className="text-sm text-[var(--text-muted)]">{metricMeta?.label ?? metric} — FY{year}</p>
      <ProvincialRankingBarChart entries={entries} />

      <p className="text-[11px] text-[var(--text-muted)]">
        Rankings update automatically when the year or metric changes. A province with no verified figure for the selected year is listed as not available rather than ranked at zero.
      </p>
    </section>
  );
}
