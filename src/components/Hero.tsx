"use client";

import { motion } from "framer-motion";
import HeroAuthCta from "@/components/HeroAuthCta";
import HealthScoreGauge from "@/components/HealthScoreGauge";
import { useLanguage } from "@/components/LanguageProvider";
import type { HealthModelResult } from "@/lib/economicHealth";
import type { AiEconomicAnalysis } from "@/lib/data/aiEconomicAnalysis";
import type { RiskModelResult } from "@/lib/riskModels";

export interface HeroQuickStat {
  label: string;
  value: string;
  unit: string;
}

export interface HeroLatestRelease {
  title: string;
  date: string;
  actual: string | null;
}

interface Props {
  rightSlot?: React.ReactNode;
  health: HealthModelResult | null;
  aiAnalysis: AiEconomicAnalysis | null;
  recessionResult: RiskModelResult | null;
  defaultResult: RiskModelResult | null;
  latestRelease: HeroLatestRelease | null;
  quickStats: HeroQuickStat[];
  pktTimestamp: string;
}

const HEALTH_LABEL_TONE: Record<string, string> = {
  Strong:   "text-emerald-400 light:text-emerald-700",
  Moderate: "text-amber-400 light:text-amber-700",
  Weak:     "text-rose-400 light:text-rose-700",
};

const RISK_TONE: Record<RiskModelResult["riskCategory"], { dot: string; text: string }> = {
  Low:      { dot: "bg-emerald-400", text: "text-emerald-400 light:text-emerald-700" },
  Elevated: { dot: "bg-amber-400",   text: "text-amber-400 light:text-amber-700" },
  High:     { dot: "bg-rose-400",    text: "text-rose-400 light:text-rose-700" },
  Severe:   { dot: "bg-rose-500",    text: "text-rose-400 light:text-rose-700" },
};

/** "2026-06-30" -> "30 Jun". Calendar dates only, never a full re-format of arbitrary strings. */
function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });
}

export default function Hero({
  rightSlot,
  health,
  aiAnalysis,
  recessionResult,
  defaultResult,
  latestRelease,
  quickStats,
  pktTimestamp,
}: Props) {
  const { t } = useLanguage();

  // The single most urgent thing to surface: whichever of the two risk
  // models is currently worse. "Low" on both reads as an explicit calm
  // state ("No critical alerts") rather than an empty gap where an alert
  // might otherwise go — an intelligence briefing should say "all clear,"
  // not just say nothing.
  const worstRisk = recessionResult && defaultResult
    ? (["Severe", "High", "Elevated", "Low"] as const)
        .map((cat) => [recessionResult, defaultResult].find((r) => r.riskCategory === cat))
        .find((r): r is RiskModelResult => !!r) ?? null
    : null;
  const worstRiskLabel = recessionResult && defaultResult
    ? (recessionResult.riskCategory === worstRisk?.riskCategory ? "Recession" : "Sovereign Default")
    : null;

  const briefingReady = !!(health && aiAnalysis && recessionResult && defaultResult);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="glass-card glow-blue relative overflow-hidden p-5 sm:p-7"
    >
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-neon-purple/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-neon-blue/15 blur-3xl" />

      {/* Top row — brand + live status + optional right-side slot (Data Sources modal) */}
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            <span className="text-label text-neon-blue">{t("hero.eyebrow")}</span>
            <span className="text-caption text-white/35 light:text-slate-400" suppressHydrationWarning>
              &middot; {pktTimestamp}
            </span>
          </div>
          <h1 className="text-headline mt-2 text-white light:text-slate-900">
            {t("hero.title1")}{" "}
            <span className="bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
              {t("hero.title2")}
            </span>
          </h1>
        </div>
        {rightSlot}
      </div>

      {/* Briefing grid — the first-screen "what do I need to know right now"
          summary: health, narrative, most recent release, risk status. Every
          field here is data page.tsx already computes for HealthScoreCard/
          RiskIntelligenceSection/the calendar sections further down — this
          is a second, denser presentation of it, not a new fetch. */}
      {briefingReady ? (
        <div className="relative mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass-card-raised flex items-center gap-3 p-3">
            <HealthScoreGauge score={health!.score} color={health!.status.ringColor} size={64} />
            <div className="min-w-0">
              <p className="text-label text-white/40 light:text-slate-400">{t("health.title")}</p>
              <p className={`text-title mt-0.5 ${HEALTH_LABEL_TONE[health!.status.label] ?? "text-white"}`}>
                {health!.status.label}
              </p>
              <p className="text-caption text-white/45 light:text-slate-500">{aiAnalysis!.sentiment}</p>
            </div>
          </div>

          <div className="glass-card-raised p-3 sm:col-span-1 lg:col-span-2">
            <p className="text-label text-white/40 light:text-slate-400">Today&apos;s Intelligence</p>
            <p className="text-subtitle mt-1 line-clamp-3 text-white/75 light:text-slate-600">
              {aiAnalysis!.summary}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="glass-card-raised p-3">
              <p className="text-label text-white/40 light:text-slate-400">Latest Release</p>
              {latestRelease ? (
                <>
                  <p className="text-subtitle mt-1 truncate font-semibold text-white light:text-slate-900">{latestRelease.title}</p>
                  <p className="text-caption text-white/45 light:text-slate-500">
                    {formatShortDate(latestRelease.date)}{latestRelease.actual ? ` · ${latestRelease.actual}` : ""}
                  </p>
                </>
              ) : (
                <p className="text-caption mt-1 text-white/40 light:text-slate-400">No recent release on record</p>
              )}
            </div>

            <div className="glass-card-raised p-3">
              <p className="text-label text-white/40 light:text-slate-400">Risk Status</p>
              {worstRisk ? (
                <div className="mt-1 flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${RISK_TONE[worstRisk.riskCategory].dot}`} />
                  <span className={`text-subtitle font-semibold ${RISK_TONE[worstRisk.riskCategory].text}`}>
                    {worstRisk.riskCategory === "Low" ? "No critical alerts" : `${worstRiskLabel} risk ${worstRisk.riskCategory.toLowerCase()}`}
                  </span>
                </div>
              ) : (
                <p className="text-caption mt-1 text-white/40 light:text-slate-400">Not yet available</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="relative mt-4 text-sm text-white/50 light:text-slate-500">
          {t("dashboard.healthScoreFallback")}
        </p>
      )}

      {/* Quick stats — the handful of figures an analyst checks first,
          in-line and compact rather than as full KPI cards (those still
          exist in full below, in the main grid). */}
      {quickStats.length > 0 && (
        <div className="relative mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickStats.map((stat) => (
            <div key={stat.label} className="glass-card-raised flex items-baseline justify-between gap-2 px-3 py-2">
              <span className="text-label text-white/40 light:text-slate-400">{stat.label}</span>
              <span className="text-subtitle font-semibold tabular-nums text-white light:text-slate-900">
                {stat.value}<span className="text-white/40 light:text-slate-400">{stat.unit}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="relative mt-4">
        <HeroAuthCta />
      </div>
    </motion.section>
  );
}
