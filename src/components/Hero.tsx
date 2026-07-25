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
   * recessionResult/defaultResult — NOT the current render time (see the
   * Hero audit, 2026-07-18: showing render time here misrepresented data
   * that can legitimately be up to 6 days old between weekly runs).
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
 * the large editorial headline and the remainder becomes the briefing body.
 */
function splitHeadline(summary: string): { headline: string; body: string } {
  const match = summary.match(/^([\s\S]+?[.!?])\s+([\s\S]+)$/);
  if (!match) return { headline: summary, body: "" };
  return { headline: match[1], body: match[2] };
}

/**
 * PEIC v4 Phase 2 — the Hero recomposed as the front page of an
 * institutional MORNING ECONOMIC BRIEF (dated masthead band → editorial
 * headline → the signature full-width MACRO PULSE band → briefing columns).
 *
 * The Macro Pulse band is the memorability element: four hairline-divided
 * cells (Health / Recession / Default / Confidence) in tabular mono with
 * thin index bars — a Bloomberg-register figure band no generic dashboard
 * template produces. It also DEDUPLICATES the old layout, which showed the
 * same recession/default numbers twice (left 2×2 grid + right-rail bars);
 * the probabilities now appear exactly once, and the right rail becomes a
 * true briefing sidebar (Latest Release / Next Release / Data Status)
 * instead of a second copy of the risk models.
 */
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

  const briefingReady = !!(health && aiAnalysis && recessionResult && defaultResult);
  const nextRelease = upcomingEvents[0] ?? null;
  const { headline, body } = aiAnalysis ? splitHeadline(aiAnalysis.summary) : { headline: "", body: "" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="px-5 py-6 sm:px-8 sm:py-8"
    >
      {/* ── Masthead band — dated briefing header, newspaper grammar. Fade
          divider (v4 Phase 3) instead of a hard border — the same device a
          broadsheet uses under its masthead, rather than a flat UI rule. ── */}
      <div className="flex flex-wrap items-baseline justify-between gap-3 pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="text-overline text-neon-blue">{t("hero.morningBrief")}</span>
          <span className="text-caption text-mono-num text-white/45 light:text-slate-500" suppressHydrationWarning>
            &middot; {pktTimestamp}
          </span>
        </div>
        {rightSlot}
      </div>
      <div className="divider-fade" />

      {briefingReady ? (
        <>
          {/* Editorial headline — the AI narrative's own first sentence */}
          <h1 className="text-hero-headline mt-5 max-w-4xl text-white light:text-slate-900">
            {headline}
          </h1>

          {/* ── Macro Pulse band — the signature four-figure strip ─────────── */}
          <div className="mt-6 grid grid-cols-2 border-y border-[var(--border-subtle)] sm:grid-cols-4">
            {/* Economic Health */}
            <div className="py-3 pr-4 sm:py-4 sm:pr-6">
              <p className="text-overline text-white/45 light:text-slate-400">{t("health.title")}</p>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-metric metric-emphasis text-white light:text-slate-900">{health!.score}</span>
                <span className="text-caption text-white/45 light:text-slate-500">/ 100 &middot; {health!.status.label}</span>
              </div>
              <HorizontalIndexBar score={health!.score} color={health!.status.ringColor} size="compact" className="mt-2 max-w-[150px]" />
            </div>

            {/* Recession Probability */}
            <div className="border-l border-[var(--border-subtle)] py-3 pl-4 sm:py-4 sm:pl-6 sm:pr-6">
              <p className="text-overline text-white/45 light:text-slate-400">Recession Probability</p>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-metric metric-emphasis text-white light:text-slate-900">{recessionResult!.probability}%</span>
                <span className={`text-caption font-semibold ${RISK_TONE[recessionResult!.riskCategory].text}`}>{recessionResult!.riskCategory}</span>
              </div>
              <div className="mt-2 h-1 max-w-[150px] overflow-hidden rounded-full bg-white/10 light:bg-slate-200">
                <div className={`h-full rounded-full bg-gradient-to-r ${RISK_TONE[recessionResult!.riskCategory].bar}`} style={{ width: `${Math.min(100, Math.max(0, recessionResult!.probability))}%` }} />
              </div>
            </div>

            {/* Sovereign Default Probability */}
            <div className="border-t border-[var(--border-subtle)] py-3 pr-4 sm:border-l sm:border-t-0 sm:py-4 sm:pl-6 sm:pr-6">
              <p className="text-overline text-white/45 light:text-slate-400">Default Probability</p>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-metric metric-emphasis text-white light:text-slate-900">{defaultResult!.probability}%</span>
                <span className={`text-caption font-semibold ${RISK_TONE[defaultResult!.riskCategory].text}`}>{defaultResult!.riskCategory}</span>
              </div>
              <div className="mt-2 h-1 max-w-[150px] overflow-hidden rounded-full bg-white/10 light:bg-slate-200">
                <div className={`h-full rounded-full bg-gradient-to-r ${RISK_TONE[defaultResult!.riskCategory].bar}`} style={{ width: `${Math.min(100, Math.max(0, defaultResult!.probability))}%` }} />
              </div>
            </div>

            {/* Confidence Level */}
            <div className="border-l border-t border-[var(--border-subtle)] py-3 pl-4 sm:border-t-0 sm:py-4 sm:pl-6">
              <p className="text-overline text-white/45 light:text-slate-400">Confidence Level</p>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-metric metric-emphasis text-white light:text-slate-900">{dataConfidence.score}%</span>
                <span className="text-caption text-white/45 light:text-slate-500">{dataConfidence.level}</span>
              </div>
              <div className="mt-2 h-1 max-w-[150px] overflow-hidden rounded-full bg-white/10 light:bg-slate-200">
                <div className="h-full rounded-full bg-white/40 light:bg-slate-400" style={{ width: `${Math.min(100, Math.max(0, dataConfidence.score))}%` }} />
              </div>
            </div>
          </div>

          {/* ── Briefing columns ───────────────────────────────────────────── */}
          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr] lg:items-stretch">
            {/* Left — analyst prose, top risks, drivers, CTA */}
            <div>
              {body && (
                <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-white/80 light:text-slate-600">
                  {body}
                </p>
              )}

              {aiRisk && (
                <div className="section-divider mt-4 pt-3">
                  <p className="text-label text-white/40 light:text-slate-400">{t("hero.topRisks")}</p>
                  <div className="mt-2 flex flex-col gap-2.5">
                    <div className="flex items-start gap-2">
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${RISK_TONE[recessionResult!.riskCategory].dot}`} />
                      <p className="text-caption text-white/70 light:text-slate-600">
                        <span className={`font-semibold ${RISK_TONE[recessionResult!.riskCategory].text}`}>Recession &middot; {recessionResult!.riskCategory}.</span>{" "}
                        {firstSentence(aiRisk.recession.explanation)}
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${RISK_TONE[defaultResult!.riskCategory].dot}`} />
                      <p className="text-caption text-white/70 light:text-slate-600">
                        <span className={`font-semibold ${RISK_TONE[defaultResult!.riskCategory].text}`}>Sovereign Default &middot; {defaultResult!.riskCategory}.</span>{" "}
                        {firstSentence(aiRisk.default.explanation)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Health Score Drivers — two-column compression of the same
                  topStrength/topWeakness teaser HealthScoreCard details below */}
              <div className="section-divider mt-4 pt-3">
                <p className="text-label text-white/40 light:text-slate-400">Health Score Drivers</p>
                <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
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

            {/* Right rail — briefing sidebar: what just happened, what's next,
                whether the desk's feeds are healthy. justify-between spreads
                any extra height from the taller left column as breathing room
                rather than a dead strip at the bottom. */}
            <div className="flex h-full flex-col justify-between gap-4 lg:border-l lg:border-[var(--border-subtle)] lg:pl-8">
              <div>
                <p className="text-label text-white/40 light:text-slate-400">{t("hero.latestRelease")}</p>
                {latestRelease ? (
                  <>
                    <p className="mt-1.5 font-serif text-[1.0625rem] font-semibold leading-snug text-white light:text-slate-900">
                      {latestRelease.title}
                    </p>
                    <p className="text-caption text-mono-num mt-0.5 text-white/45 light:text-slate-500">
                      {formatShortDate(latestRelease.date)}{latestRelease.actual ? ` · ${latestRelease.actual}` : ""}
                    </p>
                  </>
                ) : (
                  <p className="text-caption mt-1.5 text-white/40 light:text-slate-400">No recent release on record</p>
                )}
              </div>

              <div className="section-divider pt-3">
                <p className="text-label text-white/40 light:text-slate-400">{t("hero.nextUp")}</p>
                {nextRelease ? (
                  <div className="mt-1.5 flex items-start gap-2">
                    {nextRelease.importance === "High" && (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" aria-hidden="true" />
                    )}
                    <div>
                      <p className="text-subtitle font-semibold text-white light:text-slate-900">{nextRelease.title}</p>
                      <p className="text-caption text-mono-num mt-0.5 text-white/45 light:text-slate-500">{formatShortDate(nextRelease.date)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-caption mt-1.5 text-white/40 light:text-slate-400">{t("hero.noCriticalAlerts")}</p>
                )}
              </div>

              <div className="section-divider pt-3">
                <p className="text-label text-white/40 light:text-slate-400">Data Status</p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {dataStatus.map((row) => (
                    <div key={row.name} className="flex items-center justify-between gap-2 text-caption">
                      <span className="text-white/70 light:text-slate-600">{row.name}</span>
                      <span className={`inline-flex items-center gap-1 font-medium ${row.live ? "text-emerald-400 light:text-emerald-700" : "text-amber-400 light:text-amber-700"}`}>
                        {row.live ? (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                        ) : (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                        )}
                        {row.label}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-caption text-mono-num mt-2 text-white/45 light:text-slate-500" suppressHydrationWarning>
                  Intelligence computed &middot; {healthComputedAt ?? "—"}
                </p>
                <p className="text-caption text-mono-num mt-0.5 text-white/45 light:text-slate-500" suppressHydrationWarning>
                  Data checked &middot; {pktTimestamp}
                </p>
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
