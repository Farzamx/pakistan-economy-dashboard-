"use client";

import { useMemo, useState } from "react";
import ComparisonChart from "./ComparisonChart";
import { ALL_SERIES_OPTIONS, getSeriesOption } from "@/lib/comparisons/seriesOptions";
import { useLanguage } from "@/components/LanguageProvider";
import {
  applyChartMode,
  applyTimeRange,
  generateInsights,
  type ChartMode,
  type MergedPoint,
  type TimeRange,
} from "@/lib/comparisons/comparisonTransforms";
import type { SeriesProviderId } from "@/lib/comparisons/comparisonRegistry";
import ComparisonControls from "./ComparisonControls";

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; merged: MergedPoint[]; sourceA: string; sourceB: string };

export default function CustomComparisonBuilder() {
  const { t } = useLanguage();
  const [aId, setAId] = useState<SeriesProviderId>(ALL_SERIES_OPTIONS[0].id);
  const [bId, setBId] = useState<SeriesProviderId>(ALL_SERIES_OPTIONS[1].id);
  const [timeRange, setTimeRange] = useState<TimeRange>("5y");
  const [chartMode, setChartMode] = useState<ChartMode>("raw");
  const [state, setState] = useState<FetchState>({ status: "idle" });

  const seriesA = getSeriesOption(aId);
  const seriesB = getSeriesOption(bId);

  async function handleCompare() {
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/comparisons/series?a=${aId}&b=${bId}`);
      if (!res.ok) {
        setState({ status: "error" });
        return;
      }
      const json = await res.json();
      setState({ status: "success", merged: json.merged, sourceA: json.sourceA, sourceB: json.sourceB });
    } catch {
      setState({ status: "error" });
    }
  }

  const windowed = useMemo(
    () => (state.status === "success" ? applyTimeRange(state.merged, timeRange) : []),
    [state, timeRange],
  );
  const chartData = useMemo(() => applyChartMode(windowed, chartMode), [windowed, chartMode]);
  const insights = useMemo(
    () => (windowed.length > 0 ? generateInsights(windowed, seriesA, seriesB) : []),
    [windowed, seriesA, seriesB],
  );

  return (
    <div className="glass-card flex flex-col gap-5 rounded-2xl p-6">
      <div>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">{t("comparisons.buildTitle")}</h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {t("comparisons.buildDesc")}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="custom-series-a" className="text-xs text-[var(--text-muted)]">{t("comparisons.indicatorA")}</label>
          <select
            id="custom-series-a"
            value={aId}
            onChange={(e) => setAId(e.target.value as SeriesProviderId)}
            className="rounded-lg border border-[var(--border)] bg-[var(--space-700)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
          >
            {ALL_SERIES_OPTIONS.map((opt) => (
              <option
                key={opt.id}
                value={opt.id}
                className="bg-[var(--space-700)] text-[var(--text-primary)] checked:bg-[var(--neon-blue)] checked:text-[var(--background)] checked:font-semibold"
              >
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="custom-series-b" className="text-xs text-[var(--text-muted)]">{t("comparisons.indicatorB")}</label>
          <select
            id="custom-series-b"
            value={bId}
            onChange={(e) => setBId(e.target.value as SeriesProviderId)}
            className="rounded-lg border border-[var(--border)] bg-[var(--space-700)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
          >
            {ALL_SERIES_OPTIONS.map((opt) => (
              <option
                key={opt.id}
                value={opt.id}
                className="bg-[var(--space-700)] text-[var(--text-primary)] checked:bg-[var(--neon-blue)] checked:text-[var(--background)] checked:font-semibold"
              >
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleCompare}
          disabled={aId === bId || state.status === "loading"}
          className="rounded-lg bg-neon-blue/15 px-4 py-1.5 text-sm font-medium text-neon-blue transition-colors hover:bg-neon-blue/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state.status === "loading" ? t("comparisons.loading") : t("comparisons.compareBtn")}
        </button>
      </div>

      {aId === bId && (
        <p className="text-xs text-amber-400">{t("comparisons.pickDifferent")}</p>
      )}

      {state.status === "error" && (
        <p className="text-sm text-red-400">{t("comparisons.unavailableError")}</p>
      )}

      {state.status === "success" && windowed.length > 0 && (
        <>
          <ComparisonControls
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            chartMode={chartMode}
            onChartModeChange={setChartMode}
          />
          <ComparisonChart data={chartData} seriesA={seriesA} seriesB={seriesB} mode={chartMode} />
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
            {t("comparisons.sourcesLabel")}: {state.sourceA}{state.sourceB !== state.sourceA ? ` & ${state.sourceB}` : ""}
          </p>
        </>
      )}

      {state.status === "success" && windowed.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">{t("comparisons.noOverlapDetailed")}</p>
      )}
    </div>
  );
}
