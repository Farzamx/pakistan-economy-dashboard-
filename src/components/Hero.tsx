"use client";

import { motion } from "framer-motion";
import HeroAuthCta from "@/components/HeroAuthCta";
import HorizontalIndexBar from "@/components/HorizontalIndexBar";
import { useLanguage } from "@/components/LanguageProvider";
import type { HealthModelResult } from "@/lib/economicHealth";
import type { AiEconomicAnalysis } from "@/lib/data/aiEconomicAnalysis";
import type { RiskModelResult } from "@/lib/riskModels";

export interface HeroLatestRelease {
  title: string;
  date: string;
  actual: string | null;
}

export interface HeroUpcomingEvent {
  title: string;
  date: string;
  importance: "High" | "Medium" | "Low";
}

interface Props {
  rightSlot?: React.ReactNode;
  health: HealthModelResult | null;
  aiAnalysis: AiEconomicAnalysis | null;
  recessionResult: RiskModelResult | null;
  defaultResult: RiskModelResult | null;
  latestRelease: HeroLatestRelease | null;
  upcomingEvents: HeroUpcomingEvent[];
  pktTimestamp: string;
}

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

/**
 * Splits the AI narrative into a headline (its first sentence) and a body
 * (everything after) — no new AI call, no invented copy. The existing
 * `aiAnalysis.summary` is a 2-3 sentence paragraph; the first sentence
 * already reads as a synthesized "what happened" statement, so it becomes
 * the large editorial headline and the remainder becomes the briefing body,
 * matching the reference design's headline-then-paragraph structure.
 */
function splitHeadline(summary: string): { headline: string; body: string } {
  const match = summary.match(/^([\s\S]+?[.!?])\s+([\s\S]+)$/);
  if (!match) return { headline: summary, body: "" };
  return { headline: match[1], body: match[2] };
}

export default function Hero({
  rightSlot,
  health,
  aiAnalysis,
  recessionResult,
  defaultResult,
  latestRelease,
  upcomingEvents,
  pktTimestamp,
}: Props) {
  const { t } = useLanguage();

  // The single most urgent thing to surface: whichever of the two risk
  // models is currently worse. "Low" on both reads as an explicit calm
  // state rather than an empty gap where an alert might otherwise go.
  const worstRisk = recessionResult && defaultResult
    ? (["Severe", "High", "Elevated", "Low"] as const)
        .map((cat) => [recessionResult, defaultResult].find((r) => r.riskCategory === cat))
        .find((r): r is RiskModelResult => !!r) ?? null
    : null;
  const worstRiskLabel = recessionResult && defaultResult
    ? (recessionResult.riskCategory === worstRisk?.riskCategory ? "Recession" : "Sovereign Default")
    : null;

  const briefingReady = !!(health && aiAnalysis && recessionResult && defaultResult);

  // Risk Status's secondary line: the nearest High-importance release still
  // ahead, when one exists — folds what was a separate "Critical Alerts"
  // tile into the single Risk Status panel the reference design uses,
  // rather than adding a widget the reference doesn't have.
  const nearTermHighImportance = upcomingEvents.find((e) => e.importance === "High") ?? null;
  const nextEvent = upcomingEvents[0] ?? null;

  const { headline, body } = aiAnalysis ? splitHeadline(aiAnalysis.summary) : { headline: "", body: "" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="px-5 py-6 sm:px-8 sm:py-8"
    >
      {/* Top row — live status + optional right-side slot (Data Sources modal) */}
      <div className="flex flex-wrap items-start justify-between gap-3">
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
        {rightSlot}
      </div>

      {briefingReady ? (
        <>
          {/* Large editorial headline — the AI narrative's own first sentence */}
          <h1 className="text-hero-headline mt-4 max-w-4xl text-white light:text-slate-900">
            {headline}
          </h1>

          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1.3fr_1fr]">
            {/* Left column — briefing body + Health Index / Risk Status pair */}
            <div>
              {body && (
                <p className="max-w-2xl font-serif text-base leading-relaxed text-white/80 light:text-slate-600">
                  {body}
                </p>
              )}

              <div className="section-divider mt-5 flex flex-col gap-5 pt-5 sm:flex-row sm:gap-0">
                {/* Economic Health Index — horizontal index, not a gauge, matching the reference's editorial register */}
                <div className="flex-1 sm:border-r sm:border-[var(--border-subtle)] sm:pr-6">
                  <p className="text-label text-white/40 light:text-slate-400">{t("health.title")}</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-display text-white light:text-slate-900">{health!.score}</span>
                    <span className="text-caption text-white/45 light:text-slate-500">/ 100 &middot; {health!.status.label}</span>
                  </div>
                  <HorizontalIndexBar score={health!.score} color={health!.status.ringColor} size="compact" className="mt-2 max-w-[220px]" />
                </div>

                {/* Risk Status */}
                <div className="flex-1 sm:pl-6">
                  <p className="text-label text-white/40 light:text-slate-400">{t("hero.riskStatus")}</p>
                  {worstRisk ? (
                    <>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${RISK_TONE[worstRisk.riskCategory].dot}`} />
                        <span className={`text-subtitle font-semibold ${RISK_TONE[worstRisk.riskCategory].text}`}>
                          {worstRisk.riskCategory === "Low" ? t("hero.noCriticalAlerts") : `${worstRiskLabel} risk ${worstRisk.riskCategory.toLowerCase()}`}
                        </span>
                      </div>
                      <p className="text-caption mt-1 text-white/45 light:text-slate-500">
                        {nearTermHighImportance
                          ? `${nearTermHighImportance.title} · ${formatShortDate(nearTermHighImportance.date)}`
                          : t("hero.noCriticalAlerts")}
                      </p>
                    </>
                  ) : (
                    <p className="text-caption mt-2 text-white/40 light:text-slate-400">Not yet available</p>
                  )}
                </div>
              </div>

              <HeroAuthCta />
            </div>

            {/* Right column — Latest Release / Next Scheduled Release, border-left on desktop */}
            <div className="flex flex-col gap-5 lg:border-l lg:border-[var(--border-subtle)] lg:pl-8">
              <div>
                <p className="text-label text-white/40 light:text-slate-400">{t("hero.latestRelease")}</p>
                {latestRelease ? (
                  <>
                    <p className="text-headline mt-2 text-white light:text-slate-900">{latestRelease.title}</p>
                    <p className="text-caption mt-1 text-white/45 light:text-slate-500">
                      {formatShortDate(latestRelease.date)}{latestRelease.actual ? ` · ${latestRelease.actual}` : ""}
                    </p>
                  </>
                ) : (
                  <p className="text-caption mt-2 text-white/40 light:text-slate-400">No recent release on record</p>
                )}
              </div>

              <div>
                <p className="text-label text-white/40 light:text-slate-400">{t("hero.nextRelease")}</p>
                {nextEvent ? (
                  <>
                    <p className="text-headline mt-2 text-white light:text-slate-900">{nextEvent.title}</p>
                    <p className="text-caption mt-1 text-white/45 light:text-slate-500">{formatShortDate(nextEvent.date)}</p>
                  </>
                ) : (
                  <p className="text-caption mt-2 text-white/40 light:text-slate-400">No releases scheduled</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-white/50 light:text-slate-500">
          {t("dashboard.healthScoreFallback")}
        </p>
      )}
    </motion.div>
  );
}
