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

// Hand-rolled inline SVG rather than mounting recharts for an 18px-tall
// decoration — only renders when a real historical slice was passed in
// (see Kpi.sparkline); cards without one fall back to the trend arrow
// alone instead of a fabricated chart.
function Sparkline({ data, trend }: { data: number[]; trend: Kpi["trend"] }) {
  const width = 48;
  const height = 16;
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
  const stroke = TREND_STROKE_COLOR[trend];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0" aria-hidden="true">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function KpiCard({ title, value, unit, change, trend, source, latestDate, frequency, marketType, expectedReleaseDate, releaseAlreadyReflected, sourceStatus, snapshotDate, sparkline }: Kpi) {
  const { t } = useLanguage();

  const trendColor = TREND_TEXT_COLOR[trend];

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
          <span className={`shrink-0 text-[8px] ${DATA_QUALITY_DOT[quality.state]}`} title={quality.state} aria-hidden="true">
            &#9679;
          </span>
        )}
      </div>

      {/* Row 2 — the number, dominant */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-metric text-white light:text-slate-900">
          <AnimatedValue value={value} />
        </span>
        <span className="text-caption text-white/45 light:text-slate-400">{unit}</span>
      </div>

      {/* Row 3 — trend + compact sparkline */}
      <div className="flex items-center justify-between gap-2">
        <div className={`flex items-center gap-1 text-[11px] font-medium ${trendColor}`}>
          <TrendArrowIcon trend={trend} className="h-3 w-3" />
          <span className="truncate">{change}</span>
        </div>
        {sparkline && sparkline.length >= 2 && <Sparkline data={sparkline} trend={trend} />}
      </div>

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
