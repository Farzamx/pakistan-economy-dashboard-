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
import { useTheme } from "@/components/ThemeProvider";
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
  const stroke = trend === "up" ? "#34d399" : "#fb7185";

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0" aria-hidden="true">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendArrow({ trend }: { trend: Kpi["trend"] }) {
  const isUp = trend === "up";
  return (
    <svg
      className={`h-3 w-3 ${isUp ? "text-emerald-400 light:text-emerald-600" : "text-rose-400 light:text-rose-600"}`}
      viewBox="0 0 12 12"
      fill="currentColor"
      aria-hidden="true"
    >
      {isUp ? <path d="M6 2 L10 8 L2 8 Z" /> : <path d="M6 10 L2 4 L10 4 Z" />}
    </svg>
  );
}

// PEIC v2: a single restrained hover treatment for every card, regardless
// of `glow`. The old design gave each card its own 24px→44px neon glow
// purely for visual variety — exactly the "cards compete for attention"
// problem the v2 redesign exists to fix. `glow` is still respected (kept
// for data-layer compatibility — no Kpi type change), just as a much
// quieter tint so it reads as "this card is focused" rather than a light
// show. Light mode keeps its existing flat elevation shadow.
const restShadow: Record<Kpi["glow"], string> = {
  blue:   "0 0 0 rgba(56, 189, 248, 0)",
  purple: "0 0 0 rgba(168, 85, 247, 0)",
};

const hoverShadow: Record<Kpi["glow"], string> = {
  blue:   "0 0 20px rgba(56, 189, 248, 0.12)",
  purple: "0 0 20px rgba(168, 85, 247, 0.12)",
};

const lightRestShadow  = "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)";
const lightHoverShadow = "0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)";

export default function KpiCard({ title, value, unit, change, trend, glow, source, latestDate, frequency, marketType, expectedReleaseDate, releaseAlreadyReflected, sourceStatus, snapshotDate, sparkline }: Kpi) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isLight = theme === "light";

  const trendColor = trend === "up"
    ? "text-emerald-400 light:text-emerald-700"
    : "text-rose-400 light:text-rose-700";

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

  const cardShadow = isLight ? lightRestShadow : restShadow[glow];
  const cardHoverShadow = isLight ? lightHoverShadow : hoverShadow[glow];
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
      style={{ boxShadow: cardShadow, borderColor: "var(--border)" }}
      whileHover={{ y: -2, boxShadow: cardHoverShadow, borderColor: "var(--border-emphasis)" }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className="glass-card group flex h-full flex-col gap-2.5 p-4"
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
        <span className="text-display text-white light:text-slate-900">
          <AnimatedValue value={value} />
        </span>
        <span className="text-caption text-white/45 light:text-slate-400">{unit}</span>
      </div>

      {/* Row 3 — trend + compact sparkline */}
      <div className="flex items-center justify-between gap-2">
        <div className={`flex items-center gap-1 text-[11px] font-medium ${trendColor}`}>
          <TrendArrow trend={trend} />
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
