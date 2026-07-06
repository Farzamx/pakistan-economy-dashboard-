"use client";

import { useMemo, useRef } from "react";
import ComparisonChart from "./ComparisonChart";
import { exportChartAsCsv, exportChartAsPng } from "@/lib/comparisons/exportUtils";
import { useLanguage } from "@/components/LanguageProvider";
import {
  applyChartMode,
  applyTimeRange,
  generateInsights,
  type ChartMode,
  type MergedPoint,
  type TimeRange,
} from "@/lib/comparisons/comparisonData";
import type { ComparisonDef } from "@/lib/comparisons/comparisonRegistry";

interface ComparisonCardProps {
  def: ComparisonDef;
  merged: MergedPoint[];
  sourceA: string;
  sourceB: string;
  hasError: boolean;
  timeRange: TimeRange;
  chartMode: ChartMode;
}

export default function ComparisonCard({
  def,
  merged,
  sourceA,
  sourceB,
  hasError,
  timeRange,
  chartMode,
}: ComparisonCardProps) {
  const { t } = useLanguage();
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const windowed = useMemo(() => applyTimeRange(merged, timeRange), [merged, timeRange]);
  const chartData = useMemo(() => applyChartMode(windowed, chartMode), [windowed, chartMode]);
  const insights = useMemo(() => generateInsights(windowed, def.seriesA, def.seriesB), [windowed, def]);

  const isEmpty = !hasError && windowed.length === 0;

  return (
    <div className="glass-card flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{def.title}</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{def.description}</p>
        </div>
        {!hasError && !isEmpty && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => chartContainerRef.current && exportChartAsPng(chartContainerRef.current, `${def.slug}.png`, "#05060f")}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              {t("budget.exportPng")}
            </button>
            <button
              type="button"
              onClick={() => exportChartAsCsv(chartData, def.seriesA, def.seriesB, `${def.slug}.csv`)}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              {t("budget.exportCsv")}
            </button>
          </div>
        )}
      </div>

      {hasError && (
        <div className="flex h-[320px] flex-col items-center justify-center gap-2 rounded-xl border border-red-500/15 bg-red-500/[0.04] text-center">
          <p className="text-sm font-medium text-red-400">{t("comparisons.dataUnavailable")}</p>
          <p className="max-w-xs text-xs text-[var(--text-muted)]">
            {t("comparisons.dataUnavailableDesc")}
          </p>
        </div>
      )}

      {isEmpty && (
        <div className="flex h-[320px] items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <p className="text-sm text-[var(--text-muted)]">{t("comparisons.noOverlap")}</p>
        </div>
      )}

      {!hasError && !isEmpty && (
        <>
          <div ref={chartContainerRef}>
            <ComparisonChart data={chartData} seriesA={def.seriesA} seriesB={def.seriesB} mode={chartMode} />
          </div>

          {insights.length > 0 && (
            <div className="flex flex-col gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
              {insights.map((insight, i) => (
                <p key={i} className="text-xs leading-relaxed text-[var(--text-secondary)]">
                  <span className="mr-1.5 text-neon-blue">▸</span>
                  {insight.text}
                </p>
              ))}
            </div>
          )}

          <p className="text-[11px] text-[var(--text-muted)]">
            {t("comparisons.sourcesLabel")}: {sourceA}
            {sourceB !== sourceA ? ` & ${sourceB}` : ""}
          </p>
        </>
      )}
    </div>
  );
}
