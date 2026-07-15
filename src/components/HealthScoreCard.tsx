"use client";

import { motion } from "framer-motion";
import HealthScoreGauge from "@/components/HealthScoreGauge";
import { healthLabelToRiskLevel, type HealthModelResult } from "@/lib/economicHealth";
import type { AiEconomicAnalysis } from "@/lib/data/aiEconomicAnalysis";
import { useLanguage } from "@/components/LanguageProvider";

const SENTIMENT_CLASS: Record<AiEconomicAnalysis["sentiment"], string> = {
  Bullish: "border-emerald-400/20 bg-emerald-400/10 text-emerald-400",
  Neutral: "border-amber-400/20 bg-amber-400/10 text-amber-400",
  Bearish: "border-rose-400/20 bg-rose-400/10 text-rose-400",
};

const RISK_CLASS: Record<"Low" | "Moderate" | "High", string> = {
  Low: "border-emerald-400/20 bg-emerald-400/10 text-emerald-400",
  Moderate: "border-amber-400/20 bg-amber-400/10 text-amber-400",
  High: "border-rose-400/20 bg-rose-400/10 text-rose-400",
};

interface Props {
  health: HealthModelResult;
  ai: AiEconomicAnalysis;
  /** When the Weekly Intelligence Engine last computed this score (PKT) — see weeklyIntelligenceCompute.ts. */
  computedAt?: string;
  /** Estimated next weekly run (PKT) — computedAt + 7 days. */
  nextUpdateAt?: string;
}

export default function HealthScoreCard({ health, ai, computedAt, nextUpdateAt }: Props) {
  const { score, status, topStrengthFactors, topWeaknessFactors } = health;
  const { sentiment, summary, topDrivers, modelDisplayName } = ai;
  const riskLevel = healthLabelToRiskLevel(status.label);
  const { t } = useLanguage();

  const statusMap: Record<string, string> = {
    Strong: t("health.statusStrong"),
    Moderate: t("health.statusModerate"),
    Weak: t("health.statusWeak"),
  };
  const sentimentMap: Record<string, string> = {
    Bullish: t("health.sentBullish"),
    Neutral: t("health.sentNeutral"),
    Bearish: t("health.sentBearish"),
  };
  const riskMap: Record<string, string> = {
    Low: t("health.riskLow"),
    Moderate: t("health.riskModerate"),
    High: t("health.riskHigh"),
  };

  return (
    <motion.section
      className="glass-card mt-8 flex flex-col items-center gap-6 p-6 text-center sm:flex-row sm:p-8 sm:text-left"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <HealthScoreGauge score={score} color={status.ringColor} />

      <div className="flex flex-col items-center sm:items-start">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40 light:text-slate-400">
            {t("health.title")}
          </span>
          <span className="rounded-full border border-neon-blue/20 bg-neon-blue/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-neon-blue/70">
            {modelDisplayName}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${status.badgeClass}`}
          >
            {statusMap[status.label] ?? status.label}
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${SENTIMENT_CLASS[sentiment]}`}
          >
            {sentimentMap[sentiment] ?? sentiment}
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${RISK_CLASS[riskLevel]}`}
          >
            {riskMap[riskLevel] ?? riskLevel} {t("health.risk")}
          </span>
        </div>

        <p className="mt-3 max-w-md text-sm text-white/60 light:text-slate-500">{summary}</p>

        {computedAt && nextUpdateAt && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-[10px] text-white/25 light:text-slate-400">
              <span className="text-white/35 light:text-slate-500">{t("riskIntel.lastComputed")}</span> {computedAt}
            </span>
            <span className="text-[10px] text-white/15 light:text-slate-300">·</span>
            <span className="text-[10px] text-white/25 light:text-slate-400">
              <span className="text-white/35 light:text-slate-500">{t("riskIntel.nextUpdate")}</span> {nextUpdateAt}
            </span>
          </div>
        )}

        {topDrivers.length > 0 && (
          <ul className="mt-3 space-y-1">
            {topDrivers.map((driver, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/45 light:text-slate-500">
                <span className="mt-0.5 text-[8px] text-neon-blue/60">▶</span>
                {driver}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Factor breakdown — fills the wide card's remaining width with the
          same quantitative-model figures already computed for the score,
          instead of leaving it empty next to the gauge + narrative column. */}
      <div className="grid w-full grid-cols-2 gap-4 border-t border-white/5 pt-5 text-left sm:ml-auto sm:w-auto sm:min-w-[200px] sm:shrink-0 sm:border-t-0 sm:border-l sm:border-white/5 sm:pt-0 sm:pl-6 light:border-slate-200">
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-400/60 light:text-emerald-700">
            {t("health.topStrengths")}
          </p>
          <div className="space-y-1.5">
            {topStrengthFactors.map((f, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <span className="text-[10px] text-white/40 light:text-slate-500">{f.label}</span>
                <span className="font-mono text-[10px] text-emerald-400/70 light:text-emerald-700">{f.formattedValue}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-rose-400/60 light:text-rose-600">
            {t("health.topWeaknesses")}
          </p>
          <div className="space-y-1.5">
            {topWeaknessFactors.map((f, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <span className="text-[10px] text-white/40 light:text-slate-500">{f.label}</span>
                <span className="font-mono text-[10px] text-rose-400/70 light:text-rose-600">{f.formattedValue}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
