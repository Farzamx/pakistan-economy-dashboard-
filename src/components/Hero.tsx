"use client";

import { motion } from "framer-motion";
import HeroAuthCta from "@/components/HeroAuthCta";
import HorizontalIndexBar from "@/components/HorizontalIndexBar";
import { useLanguage } from "@/components/LanguageProvider";
import type { HealthModelResult } from "@/lib/economicHealth";
import type { AiEconomicAnalysis } from "@/lib/data/aiEconomicAnalysis";
import type { AiRiskIntelligence } from "@/lib/data/aiRiskIntelligence";
import type { DataConfidence, RiskModelResult } from "@/lib/riskModels";

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

export interface HeroDataStatusRow {
  name: string;
  label: string;
  live: boolean;
}

interface Props {
  rightSlot?: React.ReactNode;
  health: HealthModelResult | null;
  aiAnalysis: AiEconomicAnalysis | null;
  recessionResult: RiskModelResult | null;
  defaultResult: RiskModelResult | null;
  aiRisk: AiRiskIntelligence | null;
  dataConfidence: DataConfidence;
  dataStatus: HeroDataStatusRow[];
  latestRelease: HeroLatestRelease | null;
  upcomingEvents: HeroUpcomingEvent[];
  pktTimestamp: string;
  /**
   * When the Weekly Intelligence Engine actually computed health/aiAnalysis/
   * recessionResult/defaultResult — NOT the current render time. Production
   * audit (2026-07-18): this tile previously showed `pktTimestamp` (now),
   * which reads as "the Health Score was just computed" when the underlying
   * weekly snapshot can genuinely be up to 6 days old (cron runs Monday).
   * page.tsx already computes this correctly as `intelligenceComputedAt` for
   * HealthScoreCard/RiskIntelligenceSection further down the same page —
   * this just reuses that same value instead of a second, wrong one.
   * Null only before the very first weekly cron run has ever completed.
   */
  healthComputedAt: string | null;
}

const RISK_TONE: Record<RiskModelResult["riskCategory"], { dot: string; text: string; bar: string }> = {
  Low:      { dot: "bg-emerald-400", text: "text-emerald-400 light:text-emerald-700", bar: "from-emerald-500/70 to-emerald-400" },
  Elevated: { dot: "bg-amber-400",   text: "text-amber-400 light:text-amber-700",   bar: "from-amber-500/70 to-amber-400" },
  High:     { dot: "bg-rose-400",    text: "text-rose-400 light:text-rose-700",     bar: "from-rose-500/70 to-rose-400" },
  Severe:   { dot: "bg-rose-500",    text: "text-rose-400 light:text-rose-700",     bar: "from-rose-600/70 to-rose-500" },
};

/** First sentence only — same "punchy one-liner from a longer real narrative" pattern as splitHeadline() below. */
function firstSentence(text: string): string {
  const match = text.match(/^([\s\S]+?[.!?])(\s|$)/);
  return match ? match[1] : text;
}

interface RiskProbabilityRowProps {
  label: string;
  result: RiskModelResult;
  explanation: string;
}

/** One row of the Institutional Risk Summary — thin Bloomberg-style bar, no radial/donut chart. */
function RiskProbabilityRow({ label, result, explanation }: RiskProbabilityRowProps) {
  const tone = RISK_TONE[result.riskCategory];
  return (
    <div>
      <p className="text-label text-white/40 light:text-slate-400">{label}</p>
      <span className="text-display text-white light:text-slate-900">{result.probability}%</span>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10 light:bg-slate-200">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`}
          style={{ width: `${Math.min(100, Math.max(0, result.probability))}%` }}
        />
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
        <span className={`text-subtitle font-semibold ${tone.text}`}>{result.riskCategory} Risk</span>
      </div>
      <p className="text-caption mt-1 text-white/45 light:text-slate-500">{explanation}</p>
    </div>
  );
}

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
  aiRisk,
  dataConfidence,
  dataStatus,
  latestRelease,
  upcomingEvents,
  pktTimestamp,
  healthComputedAt,
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

          {/* 12-column editorial grid (PEIC v3 fold-density pass): left ~8/12
              carries the executive narrative + 2x2 status grid, right ~4/12
              stays a compact decision-support column. lg:items-stretch (the
              grid default) so both columns' boxes span the full row height —
              since the Key Risk Signals removal (Hero refinement pass,
              2026-07-18) the LEFT column now typically runs longer than the
              right, and the right column's own justify-between (below)
              distributes its content across that full stretched height
              instead of leaving a bare gap under a divider line that stops
              short of the left column's actual bottom. */}
          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr] lg:items-stretch">
            {/* Left column — briefing body + Health Index / Risk Status pair */}
            <div>
              {body && (
                <p className="max-w-2xl font-serif text-base leading-relaxed text-white/80 light:text-slate-600">
                  {body}
                </p>
              )}

              {/* Compact 2x2 metrics grid — replaces the old single-row
                  Health/Risk pair. Adding Confidence Level and Last Updated
                  turns the leftover space below it into a fourth and fifth
                  real data point instead of blank margin (PEIC v3 density pass). */}
              <div className="section-divider mt-3 grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-3">
                {/* Economic Health Index — horizontal index, not a gauge, matching the reference's editorial register */}
                <div className="sm:border-r sm:border-[var(--border-subtle)] sm:pr-6">
                  <p className="text-label text-white/40 light:text-slate-400">{t("health.title")}</p>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-display text-white light:text-slate-900">{health!.score}</span>
                    <span className="text-caption text-white/45 light:text-slate-500">/ 100 &middot; {health!.status.label}</span>
                  </div>
                  <HorizontalIndexBar score={health!.score} color={health!.status.ringColor} size="compact" className="mt-1.5 max-w-[180px]" />
                </div>

                {/* Risk Status */}
                <div className="sm:pl-6">
                  <p className="text-label text-white/40 light:text-slate-400">{t("hero.riskStatus")}</p>
                  {worstRisk ? (
                    <>
                      <div className="mt-1.5 flex items-center gap-1.5">
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
                    <p className="text-caption mt-1.5 text-white/40 light:text-slate-400">Not yet available</p>
                  )}
                </div>

                {/* Confidence Level — worse of the two existing recession/default confidence readings */}
                <div className="border-t border-[var(--border-subtle)] pt-3 sm:border-r sm:pr-6">
                  <p className="text-label text-white/40 light:text-slate-400">Confidence Level</p>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-display text-white light:text-slate-900">{dataConfidence.score}%</span>
                    <span className="text-caption text-white/45 light:text-slate-500">{dataConfidence.level}</span>
                  </div>
                </div>

                {/* Last Updated — the weekly snapshot's own compute time, not
                    the current render time (see healthComputedAt prop doc). */}
                <div className="border-t border-[var(--border-subtle)] pt-3 sm:pl-6">
                  <p className="text-label text-white/40 light:text-slate-400">Last Updated</p>
                  <p className="text-title mt-1.5 text-white light:text-slate-900" suppressHydrationWarning>{healthComputedAt ?? pktTimestamp}</p>
                </div>
              </div>

              {/* Health Score Drivers — same topStrengthFactors/topWeaknessFactors
                  HealthScoreCard shows in full further down the page; this is
                  the same teaser-then-detail pattern already used for the
                  Health Score number itself, condensed to the top 2 of each. */}
              <div className="border-t border-[var(--border-subtle)] pt-3">
                <p className="text-label text-white/40 light:text-slate-400">Health Score Drivers</p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {health!.topStrengthFactors.slice(0, 2).map((f) => (
                    <li key={f.label} className="flex items-center gap-2 text-caption text-white/70 light:text-slate-600">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                      {f.label}
                    </li>
                  ))}
                  {health!.topWeaknessFactors.slice(0, 2).map((f) => (
                    <li key={f.label} className="flex items-center gap-2 text-caption text-white/70 light:text-slate-600">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                      {f.label}
                    </li>
                  ))}
                </ul>
              </div>

              <HeroAuthCta />
            </div>

            {/* Right column — compact decision-support panel: Latest Release,
                then the Institutional Risk Summary (thin horizontal
                probability bars, no radial gauges). Border-left on desktop.
                Hero refinement pass (2026-07-18): flattened into 4 direct
                flex children (was 2, with Recession/Default/Data Status
                nested inside one shared wrapper) with `justify-between` and
                no flex `gap` — each child keeps its own compact `border-t
                pt-3` divider (avoids the gap+padding stacking a shared flex
                gap would add), while justify-between distributes any extra
                height from the taller left column as breathing room between
                sections instead of leaving it as one dead strip at the
                bottom. Net effect: denser per-section spacing, but the
                column as a whole still fills to match the left column at
                any content length or breakpoint. */}
            <div className="flex h-full flex-col justify-between lg:border-l lg:border-[var(--border-subtle)] lg:pl-8">
              <div>
                <p className="text-label text-white/40 light:text-slate-400">{t("hero.latestRelease")}</p>
                {latestRelease ? (
                  <>
                    <p className="mt-1.5 font-serif text-[1.0625rem] font-semibold leading-snug text-white light:text-slate-900">
                      {latestRelease.title}
                    </p>
                    <p className="text-caption mt-0.5 text-white/45 light:text-slate-500">
                      {formatShortDate(latestRelease.date)}{latestRelease.actual ? ` · ${latestRelease.actual}` : ""}
                    </p>
                  </>
                ) : (
                  <p className="text-caption mt-1.5 text-white/40 light:text-slate-400">No recent release on record</p>
                )}
              </div>

              {recessionResult && defaultResult && aiRisk ? (
                <>
                  <div className="section-divider pt-3">
                    <RiskProbabilityRow
                      label="Recession Probability"
                      result={recessionResult}
                      explanation={firstSentence(aiRisk.recession.explanation)}
                    />
                  </div>

                  <div className="border-t border-[var(--border-subtle)] pt-3">
                    <RiskProbabilityRow
                      label="Sovereign Default Probability"
                      result={defaultResult}
                      explanation={firstSentence(aiRisk.default.explanation)}
                    />
                  </div>

                  {/* Data Status — one representative live indicator per upstream provider */}
                  <div className="border-t border-[var(--border-subtle)] pt-3">
                    <p className="text-label text-white/40 light:text-slate-400">Data Status</p>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {dataStatus.map((row) => (
                        <div key={row.name} className="flex items-center justify-between gap-2 text-caption">
                          <span className="text-white/70 light:text-slate-600">{row.name}</span>
                          <span className={`font-medium ${row.live ? "text-emerald-400 light:text-emerald-700" : "text-amber-400 light:text-amber-700"}`}>
                            {row.live ? "✓" : "⚠"} {row.label}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-caption mt-2 text-white/45 light:text-slate-500" suppressHydrationWarning>
                      Last update &middot; {pktTimestamp}
                    </p>
                  </div>
                </>
              ) : null}
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
