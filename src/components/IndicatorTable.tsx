"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Kpi } from "@/data/kpiData";
import InfoTooltip from "@/components/InfoTooltip";
import { getDataQuality, DATA_QUALITY_DOT } from "@/lib/dataQuality";
import { KPI_SEO_SLUG } from "@/lib/seoConfig";

// PEIC v2.1 — the dense "watchlist" presentation for reference-tier
// indicators (global markets, real economy, secondary monetary/external
// figures). A grid of big glowing cards for 8-9 similar small metrics is
// exactly the "everything is a card" pattern that reads as a generic
// dashboard template; a real trading/research terminal lists these as
// rows — name, value, change, a thumbnail trend, done. Reserves the big
// KpiCard treatment for the handful of true headline metrics instead.

function Sparkline({ data, trend }: { data: number[]; trend: Kpi["trend"] }) {
  const width = 56;
  const height = 20;
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

function TrendGlyph({ trend }: { trend: Kpi["trend"] }) {
  const isUp = trend === "up";
  return (
    <svg
      className={`h-2.5 w-2.5 ${isUp ? "text-emerald-400 light:text-emerald-600" : "text-rose-400 light:text-rose-600"}`}
      viewBox="0 0 12 12"
      fill="currentColor"
      aria-hidden="true"
    >
      {isUp ? <path d="M6 2 L10 8 L2 8 Z" /> : <path d="M6 10 L2 4 L10 4 Z" />}
    </svg>
  );
}

function Row({ kpi, index }: { kpi: Kpi; index: number }) {
  const trendColor = kpi.trend === "up"
    ? "text-emerald-400 light:text-emerald-700"
    : "text-rose-400 light:text-rose-700";
  const quality = kpi.latestDate
    ? getDataQuality({
        sourceStatus: kpi.sourceStatus ?? "live",
        latestDate: kpi.latestDate,
        frequency: kpi.frequency,
        marketType: kpi.marketType,
        expectedReleaseDate: kpi.expectedReleaseDate,
        releaseAlreadyReflected: kpi.releaseAlreadyReflected,
        snapshotDate: kpi.snapshotDate,
      })
    : null;
  const seoSlug = KPI_SEO_SLUG[kpi.title];

  const content = (
    <div className="panel-row flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.02] light:hover:bg-slate-50">
      {quality && (
        <span className={`shrink-0 text-[7px] ${DATA_QUALITY_DOT[quality.state]}`} title={quality.state} aria-hidden="true">
          &#9679;
        </span>
      )}
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="truncate text-sm text-white/75 light:text-slate-700">{kpi.title}</span>
        <InfoTooltip termKey={kpi.title} size="xs" />
      </div>
      {kpi.sparkline && kpi.sparkline.length >= 2 && (
        <Sparkline data={kpi.sparkline} trend={kpi.trend} />
      )}
      <div className={`flex w-24 shrink-0 items-center justify-end gap-1 text-xs font-medium ${trendColor}`}>
        <TrendGlyph trend={kpi.trend} />
        <span className="truncate">{kpi.change}</span>
      </div>
      <div className="flex w-28 shrink-0 items-baseline justify-end gap-1 font-mono text-sm tabular-nums text-white light:text-slate-900">
        <span className="font-semibold">{kpi.value}</span>
        <span className="text-[11px] text-white/40 light:text-slate-400">{kpi.unit}</span>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
    >
      {seoSlug ? (
        <Link href={`/${seoSlug}`} className="block">
          {content}
        </Link>
      ) : content}
    </motion.div>
  );
}

interface Props {
  items: Kpi[];
}

export default function IndicatorTable({ items }: Props) {
  return (
    <div className="panel-flat overflow-hidden">
      {items.map((kpi, i) => (
        <Row key={`${i}-${kpi.title}`} kpi={kpi} index={i} />
      ))}
    </div>
  );
}
