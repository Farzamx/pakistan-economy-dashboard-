"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Kpi } from "@/data/kpiData";
import AnimatedValue from "@/components/AnimatedValue";
import InfoTooltip from "@/components/InfoTooltip";
import DataQualityBadge from "@/components/DataQualityBadge";
import { getDataQuality, DATA_QUALITY_DOT } from "@/lib/dataQuality";
import { getActiveTier, SOURCE_CHAINS } from "@/lib/marketDataSources";
import { KPI_SEO_SLUG } from "@/lib/seoConfig";
import { TrendArrowIcon, TREND_TEXT_COLOR, TREND_STROKE_COLOR } from "@/components/TrendIndicator";
import { useLanguage } from "@/components/LanguageProvider";
import { useValueFlash, valueFlashClass } from "@/hooks/useValueFlash";

// Hand-rolled inline SVG rather than mounting recharts for a tiny
// decoration — only renders when a real historical slice was passed in
// (see Kpi.sparkline); cards without one fall back to the trend arrow
// alone instead of a fabricated chart.
//
// v4 Phase 2: grew from a 48×16 corner glyph into a full-width 28px-tall
// trend rail across the card's bottom, with a dotted baseline at the
// series' own first value and an emphasized endpoint dot — each KPI now
// shows "where this number came from" as a real (if small) chart rather
// than a decorative squiggle. Preserve-aspect none + viewBox lets one
// path serve every card width responsively.
function Sparkline({ data, trend }: { data: number[]; trend: Kpi["trend"] }) {
  const width = 100;
  const height = 28;
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
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-7 w-full"
      aria-hidden="true"
    >
      <line x1={pad} y1={baselineY} x2={width - pad} y2={baselineY} stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={end.x} cy={end.y} r="2" fill={stroke} />
    </svg>
  );
}

export default function KpiCard({ title, value, unit, change, trend, source, latestDate, frequency, marketType, expectedReleaseDate, releaseAlreadyReflected, sourceStatus, snapshotDate, sparkline }: Kpi) {
  const { t } = useLanguage();

  const trendColor = TREND_TEXT_COLOR[trend];
  const flash = useValueFlash(title, value, trend === "down" ? "down" : "up");

  // Source transparency — gated on `marketType` (not just title) because a
  // few SBP EasyData indicators happen to share a display title with a
  // Yahoo/FRED/Twelve-Data-sourced one (e.g. both have a "USD / PKR" card);
  // marketType is only ever set on the latter, so it disambiguates which
  // redundancy chain — if any — actually applies to this specific card.
  const chain = marketType ? SOURCE_CHAINS[title] : undefined;
  const activeTier = chain ? getActiveTier(title, source) : "unknown";
  const sourceChainNote = chain
    ? `${t("kpi.sourcePrimary")} ${chain.primary}, ${t("kpi.sourceSecondary")} ${chain.secondary ?? t("kpi.sourceNone")}, ${t("kpi.sourceFallback")} ${chain.fallback}. ${t("kpi.sourceCurrently")} ${activeTier}.`
    : null;

  const seoSlug = KPI_SEO_SLUG[title];

  // Header status dot — the same Verified/Delayed/Cached/Fallback/
  // Unavailable classification DataQualityBadge already computes, surfaced
  // a second time (cheap, synchronous, no fetch) right next to the title
  // so freshness reads at a glance instead of only in the small footer text.
  const quality = latestDate
    ? getDataQuality({ sourceStatus: sourceStatus ?? "live", latestDate, frequency, marketType, expectedReleaseDate, releaseAlreadyReflected, snapshotDate })
    : null;

  return (
    <motion.div
      whileHover={{ borderColor: "var(--border-emphasis)" }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="panel-flat group flex h-full flex-col gap-2 p-3.5"
    >
      {/* Row 1 — label + freshness status dot */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="text-label truncate text-white/50 light:text-slate-500">{title}</span>
          <InfoTooltip termKey={title} />
        </div>
        {quality && (
          // v4 accessibility: dot grown 8px→10px and given a real accessible
          // name (sr-only text) instead of aria-hidden + title-only — the
          // freshness state is information, not decoration, so it must be
          // reachable by screen readers and not color-only.
          <span className={`shrink-0 text-[10px] ${DATA_QUALITY_DOT[quality.state]}`} title={quality.state}>
            <span aria-hidden="true">&#9679;</span>
            <span className="sr-only">Data status: {quality.state}</span>
          </span>
        )}
      </div>

      {/* Row 2 — the number, dominant. v4 Phase 3: flashes once (green/red)
          when this value has changed since the browser last rendered this
          card — see the shared useValueFlash hook. */}
      <div className={`-mx-1 flex items-baseline gap-1.5 px-1 ${valueFlashClass(flash)}`}>
        <span className="text-metric text-white light:text-slate-900">
          <AnimatedValue value={value} />
        </span>
        <span className="text-caption text-white/45 light:text-slate-400">{unit}</span>
      </div>

      {/* Row 3 — the delta, in words */}
      <div className={`flex items-center gap-1 text-[11px] font-medium ${trendColor}`}>
        <TrendArrowIcon trend={trend} className="h-3 w-3" />
        <span className="truncate">{change}</span>
      </div>

      {/* Row 4 — full-width trend rail (v4 Phase 2): the same real history
          slice, now a legible mini-chart with baseline + endpoint instead
          of a 48px corner glyph. text color drives the baseline's
          currentColor so it adapts per theme automatically. */}
      {sparkline && sparkline.length >= 2 && (
        <div className="text-white light:text-slate-900">
          <Sparkline data={sparkline} trend={trend} />
        </div>
      )}

      {/* Row 4 — source/frequency/updated footer, always visible (the
          data-provenance floor every card guarantees) */}
      {latestDate && (
        <DataQualityBadge
          kpi={{ source, latestDate, frequency, marketType, expectedReleaseDate, releaseAlreadyReflected, sourceStatus, snapshotDate }}
          extraTooltip={sourceChainNote ?? undefined}
          className="section-divider pt-2"
        />
      )}

      {/* Hover-revealed action — was always-visible pale text before;
          now a genuine "hover action" per the v2 KPI spec, not permanent chrome. */}
      {seoSlug && (
        <Link
          href={`/${seoSlug}`}
          className="mt-auto text-[11px] font-medium text-neon-blue underline-offset-2 opacity-0 transition-opacity duration-150 hover:underline group-hover:opacity-100 group-focus-within:opacity-100"
        >
          {t("common.learnMore")} →
        </Link>
      )}
    </motion.div>
  );
}
