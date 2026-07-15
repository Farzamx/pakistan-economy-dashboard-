"use client";

import type { Kpi } from "@/data/kpiData";
import AnimatedValue from "@/components/AnimatedValue";
import DataQualityBadge from "@/components/DataQualityBadge";
import InfoTooltip from "@/components/InfoTooltip";
import { TrendArrowIcon, TREND_TEXT_COLOR, TREND_STROKE_COLOR } from "@/components/TrendIndicator";
import { useLanguage } from "@/components/LanguageProvider";

export interface MacroDriver {
  label: string;
  value: string;
  unit: string;
  change: string;
  trend: Kpi["trend"];
}

interface Props {
  updatedAt: string;
  tier1: Kpi[];
  tier2: MacroDriver[];
}

function Sparkline({ data, trend }: { data: number[]; trend: Kpi["trend"] }) {
  const width = 56;
  const height = 18;
  const pad = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (width - pad * 2);
      const y = height - pad - ((v - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0" aria-hidden="true">
      <polyline points={points} fill="none" stroke={TREND_STROKE_COLOR[trend]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Tier1Cell({ kpi }: { kpi: Kpi }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-4 first:pl-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <span className="text-label text-white/40 light:text-slate-400">{kpi.title}</span>
          <InfoTooltip termKey={kpi.title} size="xs" />
        </div>
        {kpi.frequency && <span className="text-[9px] uppercase tracking-widest text-white/25 light:text-slate-400">{kpi.frequency}</span>}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <span className="text-metric text-white light:text-slate-900">
            <AnimatedValue value={kpi.value} />
          </span>
          <span className="text-caption text-white/40 light:text-slate-400">{kpi.unit}</span>
        </div>
        {kpi.sparkline && kpi.sparkline.length >= 2 && <Sparkline data={kpi.sparkline} trend={kpi.trend} />}
      </div>

      <div className={`flex items-center gap-1 text-[11px] font-medium ${TREND_TEXT_COLOR[kpi.trend]}`}>
        <TrendArrowIcon trend={kpi.trend} className="h-2.5 w-2.5" />
        <span className="truncate">{kpi.change}</span>
      </div>

      {kpi.latestDate && <DataQualityBadge kpi={kpi} />}
    </div>
  );
}

function Tier2Cell({ driver }: { driver: MacroDriver }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-3 first:pl-0">
      <span className="text-[10px] font-medium uppercase tracking-wider text-white/35 light:text-slate-400">{driver.label}</span>
      <span className="text-mono-num text-base font-semibold text-white light:text-slate-900">
        {driver.value}{driver.unit}
      </span>
      <span className={`flex items-center gap-1 text-[10px] font-medium ${TREND_TEXT_COLOR[driver.trend]}`}>
        <TrendArrowIcon trend={driver.trend} className="h-2 w-2" />
        {driver.change}
      </span>
    </div>
  );
}

/**
 * The reference design's tiered institutional KPI hierarchy (PEIC v3
 * information-architecture restructure) — replaces the homepage's
 * previously separate Hero quick-stats row, headline KpiGrid section, and
 * standalone MarketTicker with ONE consolidated panel: Tier 1 (full
 * editorial treatment — sparkline, verification, source), Tier 2 (denser
 * "why" drivers), Tier 3 (a Bloomberg-style market ribbon). No new data —
 * every field here is a Kpi/TickerItem page.tsx already fetches.
 */
export default function MacroSnapshot({ updatedAt, tier1, tier2 }: Props) {
  const { t } = useLanguage();

  return (
    <div>
      <h2 className="text-headline text-white light:text-slate-900">{t("macroSnapshot.title")}</h2>
      <p className="text-caption mt-1 text-white/45 light:text-slate-500" suppressHydrationWarning>
        {updatedAt} &middot; {t("macroSnapshot.liveFrom")}
      </p>

      <div className="section-divider mt-4 grid grid-cols-2 divide-x divide-[var(--border-subtle)] pt-1 sm:grid-cols-4">
        {tier1.map((kpi) => (
          <Tier1Cell key={kpi.title} kpi={kpi} />
        ))}
      </div>

      <div className="section-divider mt-2 pt-3">
        <p className="text-label text-white/30 light:text-slate-400">{t("macroSnapshot.driversTitle")}</p>
        <div className="mt-2 grid grid-cols-2 divide-x divide-[var(--border-subtle)] sm:grid-cols-4 lg:grid-cols-7">
          {tier2.map((driver) => (
            <Tier2Cell key={driver.label} driver={driver} />
          ))}
        </div>
      </div>
    </div>
  );
}
