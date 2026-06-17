"use client";

import { motion } from "framer-motion";
import type { Kpi } from "@/data/kpiData";
import AnimatedValue from "@/components/AnimatedValue";
import InfoTooltip from "@/components/InfoTooltip";
import {
  getFreshnessStatus,
  formatLatestDate,
  FRESHNESS_DOT,
  FRESHNESS_LABEL,
} from "@/lib/dataFreshness";

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

const restGlow: Record<Kpi["glow"], string> = {
  blue:   "0 0 24px rgba(56, 189, 248, 0.25)",
  purple: "0 0 24px rgba(168, 85, 247, 0.25)",
};

const hoverGlow: Record<Kpi["glow"], string> = {
  blue:   "0 0 44px rgba(56, 189, 248, 0.5)",
  purple: "0 0 44px rgba(168, 85, 247, 0.5)",
};

// In light mode we suppress neon glow entirely — cards use box-shadow from .glass-card
const lightRestGlow  = "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)";
const lightHoverGlow = "0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)";

export default function KpiCard({ title, value, unit, change, trend, glow, source, latestDate, frequency }: Kpi) {
  const trendColor = trend === "up"
    ? "text-emerald-400 light:text-emerald-700"
    : "text-rose-400 light:text-rose-700";

  const freshnessStatus = getFreshnessStatus(latestDate, frequency);
  const dotClass        = FRESHNESS_DOT[freshnessStatus];
  const freshnessLabel  = FRESHNESS_LABEL[freshnessStatus];
  const displayDate     = formatLatestDate(latestDate, frequency);

  return (
    <motion.div
      style={{ boxShadow: restGlow[glow] }}
      whileHover={{ scale: 1.03 }}
      onHoverStart={(_, info) => {
        // Glow swap is handled via whileHover style — we annotate for dark only.
        void info;
      }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="glass-card flex flex-col gap-3 p-6 h-full group"
    >
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-white/60 light:text-slate-500">{title}</span>
        <InfoTooltip termKey={title} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-white light:text-slate-900">
          <AnimatedValue value={value} />
        </span>
        <span className="text-sm text-white/50 light:text-slate-400">{unit}</span>
      </div>
      <div className={`flex items-center gap-1.5 text-xs font-medium ${trendColor}`}>
        <TrendArrow trend={trend} />
        <span>{change}</span>
      </div>
      {latestDate && (
        <div
          suppressHydrationWarning
          className="flex flex-wrap items-center gap-1.5 text-[10px] text-white/40 light:text-slate-400 border-t border-white/5 light:border-slate-100 pt-2 mt-0.5"
          title={`${freshnessLabel} · ${source ?? "Unknown source"} · ${displayDate}${frequency ? ` · ${frequency}` : ""}`}
        >
          <span className={`text-[8px] ${dotClass}`}>●</span>
          <span className={dotClass}>{freshnessLabel}</span>
          <span className="text-white/20 light:text-slate-300">·</span>
          {source && <span>{source}</span>}
          <span className="text-white/20 light:text-slate-300">·</span>
          <span>{displayDate}</span>
          {frequency && (
            <>
              <span className="text-white/20 light:text-slate-300">·</span>
              <span>{frequency}</span>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
