"use client";

import { useMemo, useState } from "react";
import {
  calculatePerformance,
  type AssetTimelinePoint,
} from "@/lib/comparisons/performanceCalculator";
import { useLanguage } from "@/components/LanguageProvider";

interface PerformanceCalculatorProps {
  timeline: AssetTimelinePoint[];
}

function formatPkr(n: number): string {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function formatKeyLabel(key: string): string {
  const [year, month] = key.split("-");
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

export default function PerformanceCalculator({ timeline }: PerformanceCalculatorProps) {
  const { t } = useLanguage();
  // Offer one start-date option per year, to keep the dropdown short rather
  // than listing all ~120 months. Each asset has its own real start date
  // (e.g. Gold's Yahoo Finance history is a rolling 10-year window, while
  // USD/PKR and T-Bill's SBP history can reach back further) — starting the
  // option list from the first point *before* all three overlap would offer
  // dates where one or more assets silently has no data yet. Restricting to
  // points from the first full-overlap month onward guarantees every option
  // in the dropdown produces all three results.
  const startOptions = useMemo(() => {
    const firstFullOverlapIdx = timeline.findIndex(
      (p) => p.gold !== null && p.usdPkr !== null && p.tbillYieldPct !== null,
    );
    if (firstFullOverlapIdx === -1) return [];

    const byYear = new Map<string, string>();
    for (const point of timeline.slice(firstFullOverlapIdx)) {
      const year = point.key.slice(0, 4);
      if (!byYear.has(year)) byYear.set(year, point.key);
    }
    return Array.from(byYear.values());
  }, [timeline]);

  const [startKey, setStartKey] = useState(startOptions[0] ?? "");

  const results = useMemo(
    () => (startKey ? calculatePerformance(timeline, startKey) : []),
    [timeline, startKey],
  );

  if (startOptions.length === 0) {
    return null;
  }

  return (
    <div className="glass-card flex flex-col gap-5 rounded-2xl p-6">
      <div>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          {t("comparisons.perfTitle")}
        </h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {t("comparisons.perfDesc")}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <label htmlFor="perf-start-date" className="text-sm text-[var(--text-secondary)]">
          {t("comparisons.startFrom")}
        </label>
        <select
          id="perf-start-date"
          value={startKey}
          onChange={(e) => setStartKey(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--space-700)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
        >
          {startOptions.map((key) => (
            <option
              key={key}
              value={key}
              className="bg-[var(--space-700)] text-[var(--text-primary)] checked:bg-[var(--neon-blue)] checked:text-[var(--background)] checked:font-semibold"
            >
              {formatKeyLabel(key)}
            </option>
          ))}
        </select>
      </div>

      {results.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">{t("comparisons.noOverlap")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {results.map((r) => (
            <div key={r.asset} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-sm font-medium text-[var(--text-primary)]">{r.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                {formatPkr(r.endValue)} <span className="text-xs font-normal text-[var(--text-muted)]">PKR</span>
              </p>
              <p className={`mt-1 text-sm font-medium ${r.returnPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {r.returnPct >= 0 ? "+" : ""}{r.returnPct.toFixed(1)}%
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-muted)]">{r.methodology}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-[var(--text-muted)]">
        {t("comparisons.perfKseNote")}
      </p>
    </div>
  );
}
