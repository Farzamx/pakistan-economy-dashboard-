"use client";

// Province Growth Explorer (Phases 2-5 of the Historical Explorer build) —
// lets a user pick any province + any tracked metric + a time range, then
// view it as a Trend line, Growth KPIs, Per-Capita line, or a cross-province
// Ranking for one fiscal year. Built entirely on already-existing,
// already-tested analytics (provincialHistoricalAnalytics.ts,
// provincialComparison.ts) — this component is wiring, not new math.

import { useMemo, useState } from "react";
import type { ProvinceId } from "@/data/provincialBudgetHistorical";
import { PROVINCES, getProvinceMeta } from "@/lib/provincial/provincialBudgetRegistry";
import { getProvinceYears, type ProvincialTrendField } from "@/lib/provincial/provincialBudgetData";
import { COMPARISON_METRICS, rankProvincesByFieldForYear, getAllRankableFiscalYears } from "@/lib/provincial/provincialComparison";
import { getCagr, getYoyGrowthSeries, getPerCapitaHistory } from "@/lib/provincial/provincialHistoricalAnalytics";
import Dropdown from "@/components/Dropdown";
import ProvincialTrendChart from "./ProvincialTrendChart";
import ProvincialRankingBarChart from "./ProvincialRankingBarChart";
import { useLanguage } from "@/components/LanguageProvider";

type ViewMode = "trend" | "growth" | "percapita" | "ranking";
type TimeRange = "full" | "last5" | "last10";

/** "Last N years" means the N most recent entries in THAT province's own array — provinces have different latest years (Balochistan's is FY2025-26, the others FY2026-27) and different earliest years, so a global calendar cutoff would silently drop more years for some provinces than others. */
function applyTimeRange<T>(items: T[], range: TimeRange): T[] {
  if (range === "full") return items;
  const n = range === "last5" ? 5 : 10;
  return items.slice(-n);
}

interface ProvincialHistoricalExplorerProps {
  /** When set, locks the Province selector to this province and hides it — used when embedding the Explorer inside a single province's own workspace page. Omit on the provinces-overview page, where the user picks freely. */
  lockedProvince?: ProvinceId;
}

export default function ProvincialHistoricalExplorer({ lockedProvince }: ProvincialHistoricalExplorerProps) {
  const { t } = useLanguage();
  const VIEW_MODES: { id: ViewMode; label: string }[] = [
    { id: "trend", label: t("provincial.trendMode") },
    { id: "growth", label: t("provincial.growthMode") },
    { id: "percapita", label: t("provincial.perCapitaMode") },
    { id: "ranking", label: t("provincial.rankingMode") },
  ];
  const TIME_RANGES: { id: TimeRange; label: string }[] = [
    { id: "full", label: t("provincial.fullHistory") },
    { id: "last5", label: t("provincial.last5Years") },
    { id: "last10", label: t("provincial.last10Years") },
  ];
  const [province, setProvince] = useState<ProvinceId>(lockedProvince ?? "punjab");
  const [metric, setMetric] = useState<ProvincialTrendField>("totalOutlay");
  const [timeRange, setTimeRange] = useState<TimeRange>("full");
  const [viewMode, setViewMode] = useState<ViewMode>("trend");
  const rankableYears = useMemo(() => getAllRankableFiscalYears(), []);
  const [rankingYear, setRankingYear] = useState<string>(rankableYears[rankableYears.length - 1]);

  const metricMeta = COMPARISON_METRICS.find((m) => m.field === metric) ?? COMPARISON_METRICS[0];
  const provinceMeta = getProvinceMeta(province);

  const allYears = getProvinceYears(province);
  const visibleYears = applyTimeRange(allYears, timeRange);
  const trendPoints = visibleYears.map((y) => ({ fiscalYear: y.fiscalYear, values: { [metric]: y[metric] } }));

  const cagr = useMemo(() => getCagr(province, metric), [province, metric]);
  const yoySeries = useMemo(() => getYoyGrowthSeries(province, metric), [province, metric]);
  const visibleYoy = applyTimeRange(yoySeries, timeRange);
  const perCapitaSeries = useMemo(() => getPerCapitaHistory(province, metric), [province, metric]);
  const visiblePerCapita = applyTimeRange(perCapitaSeries, timeRange);
  const perCapitaTrendPoints = visiblePerCapita.map((p) => ({ fiscalYear: p.fiscalYear, values: { perCapita: p.rsPerCitizen } }));

  const rankingYearOptions = useMemo(() => applyTimeRange(rankableYears, timeRange), [rankableYears, timeRange]);
  const rankingEntries = useMemo(() => rankProvincesByFieldForYear(metric, rankingYear), [metric, rankingYear]);

  const largestIncrease = visibleYoy.reduce<typeof visibleYoy[number] | null>((best, p) => (p.pctChange !== null && (!best || p.pctChange > (best.pctChange ?? -Infinity)) ? p : best), null);
  const largestDecline = visibleYoy.reduce<typeof visibleYoy[number] | null>((worst, p) => (p.pctChange !== null && (!worst || p.pctChange < (worst.pctChange ?? Infinity)) ? p : worst), null);

  return (
    <div className="glass-card flex flex-col gap-6 rounded-2xl p-6 sm:p-8">
      <div>
        <h2 className="text-xl font-semibold text-white light:text-slate-900">{t("provincial.growthExplorerTitle")}</h2>
        <p className="mt-1 text-sm text-white/60 light:text-slate-500">
          {t("provincial.growthExplorerDesc")}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3">
        {!lockedProvince && (
          <div className="flex flex-wrap gap-1.5">
            {PROVINCES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProvince(p.id)}
                aria-pressed={province === p.id}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  province === p.id ? "border-transparent text-white" : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
                style={province === p.id ? { backgroundColor: p.color } : undefined}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {COMPARISON_METRICS.map((m) => (
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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
            {TIME_RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setTimeRange(r.id)}
                aria-pressed={timeRange === r.id}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  timeRange === r.id ? "bg-neon-blue/15 text-neon-blue" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
            {VIEW_MODES.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setViewMode(v.id)}
                aria-pressed={viewMode === v.id}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === v.id ? "bg-neon-blue/15 text-neon-blue" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Views */}
      {viewMode === "trend" && (
        <div>
          <p className="mb-2 text-sm text-[var(--text-muted)]">
            {provinceMeta.name} — {metricMeta.label} ({visibleYears[0]?.fiscalYear ?? "—"} to {visibleYears[visibleYears.length - 1]?.fiscalYear ?? "—"})
          </p>
          <ProvincialTrendChart points={trendPoints} field={metric} label={metricMeta.label} color={provinceMeta.color} />
        </div>
      )}

      {viewMode === "growth" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <GrowthKpi
              title={`${metricMeta.label} ${t("provincial.growthSince")}${cagr?.fromYear ?? "—"}`}
              value={cagr ? `${(((cagr.toValue - cagr.fromValue) / cagr.fromValue) * 100).toFixed(0)}%` : t("provincial.notAvailable")}
            />
            <GrowthKpi title={t("provincial.cagrFull")} value={cagr ? `${cagr.cagrPct.toFixed(1)}%/yr` : t("provincial.notAvailable")} />
            <GrowthKpi
              title={t("provincial.largestIncrease")}
              value={largestIncrease?.pctChange != null ? `+${largestIncrease.pctChange.toFixed(1)}% (FY${largestIncrease.fiscalYear})` : t("provincial.notAvailable")}
            />
            <GrowthKpi
              title={t("provincial.largestDecline")}
              value={largestDecline?.pctChange != null && largestDecline.pctChange < 0 ? `${largestDecline.pctChange.toFixed(1)}% (FY${largestDecline.fiscalYear})` : t("provincial.noDecline")}
            />
          </div>
          <div>
            <p className="mb-2 text-sm text-[var(--text-muted)]">{t("provincial.yoyChangeDesc")} — {provinceMeta.name}, {metricMeta.label}</p>
            {visibleYoy.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">{t("provincial.noData")}</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {visibleYoy.map((p) => (
                  <div key={p.fiscalYear} className="flex items-center justify-between rounded-lg border border-white/5 light:border-slate-100 bg-white/[0.02] light:bg-slate-50 px-3 py-2 text-sm">
                    <span className="text-[var(--text-secondary)]">FY{p.fiscalYear}</span>
                    <span className="tabular-nums text-[var(--text-primary)]">Rs {p.value.toFixed(1)}bn</span>
                    <span className={`tabular-nums text-xs ${p.pctChange === null ? "text-[var(--text-muted)]" : p.pctChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {p.pctChange === null ? "— (gap year)" : `${p.pctChange >= 0 ? "+" : ""}${p.pctChange.toFixed(1)}%`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === "percapita" && (
        <div>
          <p className="mb-2 text-sm text-[var(--text-muted)]">
            {provinceMeta.name} — {metricMeta.label} per citizen (population estimated from the 2023 census; see Per Citizen Spending tooltip)
          </p>
          {perCapitaSeries.every((p) => p.rsPerCitizen === null) ? (
            <p className="text-sm text-[var(--text-muted)]">Not Available — no verified {metricMeta.label.toLowerCase()} figure exists for {provinceMeta.name} in any year.</p>
          ) : (
            <ProvincialTrendChart points={perCapitaTrendPoints} field="perCapita" label={`${metricMeta.label} per citizen (Rs)`} color={provinceMeta.color} unit="Rs" />
          )}
        </div>
      )}

      {viewMode === "ranking" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
            {t("provincial.fiscalYear")}
            <Dropdown label={t("provincial.fiscalYear")} value={rankingYear} onChange={setRankingYear} options={rankingYearOptions.map((y) => ({ value: y, label: `FY${y}` }))} />
          </div>
          <p className="text-sm text-[var(--text-muted)]">{metricMeta.label} — all 4 provinces, FY{rankingYear}</p>
          <ProvincialRankingBarChart entries={rankingEntries} />
        </div>
      )}

      <p className="text-[11px] text-[var(--text-muted)]">
        Source: each province&apos;s own official budget documents — see the {provinceMeta.name} Budget Workshop for full per-year citations. Years without a verified figure are never estimated or interpolated.
      </p>
    </div>
  );
}

function GrowthKpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-white/5 light:border-slate-100 bg-white/[0.02] light:bg-slate-50 p-4">
      <p className="text-[11px] text-[var(--text-muted)]">{title}</p>
      <p className="text-lg font-bold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
