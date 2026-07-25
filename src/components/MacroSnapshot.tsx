"use client";

import type { Kpi } from "@/data/kpiData";
import AnimatedValue from "@/components/AnimatedValue";
import DataQualityBadge from "@/components/DataQualityBadge";
import InfoTooltip from "@/components/InfoTooltip";
import { TrendArrowIcon, TREND_TEXT_COLOR, TREND_STROKE_COLOR } from "@/components/TrendIndicator";
import { useLanguage } from "@/components/LanguageProvider";
import { useValueFlash, valueFlashClass } from "@/hooks/useValueFlash";

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

// v4 Phase 2/3: full-width trend rail with a dotted baseline (at the
// series' own first value) and an emphasized endpoint dot — was a 56×18
// corner glyph. Matches the same upgrade applied to KpiCard's own
// Sparkline; kept as a separate small component here (rather than a shared
// import) only because MacroSnapshot's cell chrome around it differs
// enough that sharing the wrapper wasn't worth a cross-component prop
// contract for one SVG — the drawing logic itself is identical.
function Sparkline({ data, trend }: { data: number[]; trend: Kpi["trend"] }) {
  const width = 100;
  const height = 24;
  const pad = 3;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (width - pad * 2),
    y: height - pad - ((v - min) / range) * (height - pad * 2),
  }));
  const points = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const stroke = TREND_STROKE_COLOR[trend];
  const baselineY = pts[0].y;
  const end = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-6 w-full text-white light:text-slate-900" aria-hidden="true">
      <line x1={pad} y1={baselineY} x2={width - pad} y2={baselineY} stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={end.x} cy={end.y} r="2" fill={stroke} />
    </svg>
  );
}

function Tier1Cell({ kpi }: { kpi: Kpi }) {
  const flash = useValueFlash(kpi.title, kpi.value, kpi.trend === "down" ? "down" : "up");

  return (
    <div className="flex flex-col gap-2 px-4 py-4 first:pl-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <span className="text-label text-white/40 light:text-slate-400">{kpi.title}</span>
          <InfoTooltip termKey={kpi.title} size="xs" />
        </div>
        {kpi.frequency && <span className="text-[9px] uppercase tracking-widest text-white/25 light:text-slate-400">{kpi.frequency}</span>}
      </div>

      {/* v4 Phase 3: flashes once (green/red) when this value has changed
          since the browser last rendered this card. */}
      <div className={`-mx-1 flex items-baseline gap-1 px-1 ${valueFlashClass(flash)}`}>
        <span className="text-metric text-white light:text-slate-900">
          <AnimatedValue value={kpi.value} />
        </span>
        <span className="text-caption text-white/40 light:text-slate-400">{kpi.unit}</span>
      </div>

      {kpi.sparkline && kpi.sparkline.length >= 2 && <Sparkline data={kpi.sparkline} trend={kpi.trend} />}

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
