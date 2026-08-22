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
import { validateSeriesConfigCompatibility } from "@/lib/comparisons/comparisonCompatibility";
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
  // Phase 7: cheap, synchronous, zero-I/O check against the same
  // centralized gate the API route re-validates server-side — rejects an
  // incompatible pair BEFORE rendering, and before ever calling fetch(),
  // per "reject incompatible pairs BEFORE rendering" / "must run through the
  // same compatibility gate". Frequency incompatibility (the only thing this
  // gate hard-rejects — see comparisonCompatibility.ts) disables Compare
  // entirely; a unit-only mismatch is allowed through with an advisory note
  // (unchanged product behavior — the chart already renders differently-
  // unit series on separate axes).
  const compatibility = validateSeriesConfigCompatibility(seriesA, seriesB);

  async function handleCompare() {
    if (!compatibility.compatible) return;
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/comparisons/series?a=${aId}&b=${bId}`);
      if (res.status === 422) {
        setState({ status: "error" });
        return;
      }
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
          disabled={aId === bId || !compatibility.compatible || state.status === "loading"}
          className="rounded-lg bg-neon-blue/15 px-4 py-1.5 text-sm font-medium text-neon-blue transition-colors hover:bg-neon-blue/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state.status === "loading" ? t("comparisons.loading") : t("comparisons.compareBtn")}
        </button>
      </div>

      {aId === bId && (
        <p className="text-xs text-amber-400">{t("comparisons.pickDifferent")}</p>
      )}

      {aId !== bId && !compatibility.compatible && (
        <p className="text-xs text-amber-400">{t("comparisons.incompatibleFrequency")} {compatibility.reason}</p>
      )}

      {aId !== bId && compatibility.compatible && compatibility.requiresNormalization && (
        <p className="text-xs text-[var(--text-muted)]">{t("comparisons.differentUnitsNote")}</p>
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
