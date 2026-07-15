"use client";

import { motion } from "framer-motion";
import AnimatedValue from "@/components/AnimatedValue";
import HorizontalIndexBar from "@/components/HorizontalIndexBar";
import ViewportFadeIn from "@/components/ViewportFadeIn";
import InfoTooltip from "@/components/InfoTooltip";
import {
  getRiskGaugeColor,
  getRiskCategoryClass,
  type RiskModelResult,
  type RiskCategory,
  type DataConfidence,
  type ConfidenceLevel,
} from "@/lib/riskModels";
import type { AiRiskExplanation, AiRiskIntelligence } from "@/lib/data/aiRiskIntelligence";
import { useLanguage } from "@/components/LanguageProvider";


const CONFIDENCE_DOT: Record<ConfidenceLevel, string> = {
  High:     "text-emerald-400",
  Moderate: "text-amber-400",
  Low:      "text-rose-400",
};

interface ConfidencePanelProps {
  confidence: DataConfidence;
  modelScore: number;
}

function ConfidencePanel({ confidence, modelScore }: ConfidencePanelProps) {
  const { t } = useLanguage();
  return (
    <div className="rounded-lg border border-white/5 light:border-slate-200 bg-white/[0.02] light:bg-slate-50 px-4 py-3">
      <p className="mb-2.5 text-[9px] font-semibold uppercase tracking-widest text-white/25 light:text-slate-400">
        {t("riskIntel.transparency")}
      </p>
      <div className="grid grid-cols-3 gap-x-4 gap-y-0.5">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-wider text-white/25 light:text-slate-400">
            {t("riskIntel.lastCalculated")}
          </p>
          <p className="mt-1 text-[10px] leading-tight text-white/50 light:text-slate-500">
            {confidence.calculatedAt.split(" · ")[0]}
          </p>
          <p className="text-[10px] leading-tight text-white/35 light:text-slate-400">
            {confidence.calculatedAt.split(" · ")[1]}
          </p>
        </div>

        <div>
          <p className="text-[9px] font-medium uppercase tracking-wider text-white/25 light:text-slate-400">
            {t("riskIntel.indicators")}
          </p>
          <p className="mt-1 text-[10px] leading-tight text-white/50 light:text-slate-500">
            {confidence.currentCount}/{confidence.totalCount} {t("riskIntel.currentSuffix")}
          </p>
          <p className="text-[10px] leading-tight text-white/35 light:text-slate-400">
            {confidence.staleCount === 0 ? t("riskIntel.noneStale") : `${confidence.staleCount} ${t("riskIntel.stale")}`}
          </p>
        </div>

        <div>
          <p className="text-[9px] font-medium uppercase tracking-wider text-white/25 light:text-slate-400">
            {t("riskIntel.confidence")}
          </p>
          <p className="mt-1 font-mono text-[10px] leading-tight text-white/50 light:text-slate-500">
            {confidence.score}%
          </p>
          <p className={`text-[10px] leading-tight ${CONFIDENCE_DOT[confidence.level]}`}>
            ● {confidence.level}
          </p>
        </div>
      </div>

      <p className="mt-2.5 text-[9px] text-white/20 light:text-slate-400">
        {t("riskIntel.modelScore")} {modelScore}/100 {t("riskIntel.modelScoreNote")}
      </p>
    </div>
  );
}

interface RiskCardProps {
  title: string;
  termKey: string;
  result: RiskModelResult;
  ai: AiRiskExplanation;
  confidence: DataConfidence;
  modelDisplayName: string;
  delay?: number;
}

function RiskCard({ title, termKey, result, ai, confidence, modelDisplayName, delay = 0 }: RiskCardProps) {
  const gaugeColor = getRiskGaugeColor(result.riskCategory);
  const categoryClass = getRiskCategoryClass(result.riskCategory);
  const { t } = useLanguage();
  const categoryLabel: Record<RiskCategory, string> = {
    Low: t("riskIntel.lowRisk"),
    Elevated: t("riskIntel.elevatedRisk"),
    High: t("riskIntel.highRisk"),
    Severe: t("riskIntel.severeRisk"),
  };

  return (
    <motion.div
      className="glass-card flex flex-col gap-5 p-6 sm:p-8"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
    >
      {/* Header row — horizontal index + title/badges/summary */}
      <div className="flex flex-col gap-5 sm:flex-row sm:text-left">
        <div className="w-full shrink-0 sm:w-[160px]">
          <div className="flex items-baseline gap-1">
            <span className="text-display tabular-nums text-white light:text-slate-900">
              <AnimatedValue value={String(result.probability)} />
            </span>
            <span className="text-caption text-white/40 light:text-slate-400">%</span>
          </div>
          <HorizontalIndexBar score={result.probability} color={gaugeColor} className="mt-2" />
        </div>

        <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
          {/* Title + methodology badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40 light:text-slate-500">
              {title}
            </span>
            <InfoTooltip termKey={termKey} size="xs" />
            <span className="rounded-full border border-neon-blue/20 bg-neon-blue/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-neon-blue/70">
              {t("riskIntel.quant")}
            </span>
            <span className="rounded-full border border-neon-purple/20 bg-neon-purple/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-neon-purple/70">
              {modelDisplayName}
            </span>
          </div>

          {/* Risk category badge */}
          <div className="mt-2">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${categoryClass}`}
            >
              {categoryLabel[result.riskCategory]}
            </span>
          </div>

          {/* AI narrative */}
          <p className="mt-3 max-w-sm text-sm text-white/60 light:text-slate-600">{ai.explanation}</p>
        </div>
      </div>

      {/* Factor breakdown — risks left, strengths right */}
      <div className="grid gap-4 border-t border-white/5 light:border-slate-200 pt-4 sm:grid-cols-2">
        {/* Key risks column */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-rose-400/60 light:text-rose-600">
            {t("riskIntel.keyRisks")}
          </p>
          <ul className="space-y-1.5">
            {ai.keyRisks.map((risk, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/50 light:text-slate-600">
                <span className="mt-0.5 shrink-0 text-[8px] text-rose-400/60 light:text-rose-500">▶</span>
                {risk}
              </li>
            ))}
          </ul>
          {/* Top pressure factors from the quantitative model */}
          <div className="mt-3 space-y-1">
            {result.topRiskFactors.map((f, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-white/30 light:text-slate-400">{f.label}</span>
                <span className="font-mono text-[10px] text-rose-400/50 light:text-rose-600">{f.formattedValue}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths column */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-emerald-400/60 light:text-emerald-700">
            {t("riskIntel.strengths")}
          </p>
          <ul className="space-y-1.5">
            {ai.keyPositives.map((pos, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/50 light:text-slate-600">
                <span className="mt-0.5 shrink-0 text-[8px] text-emerald-400/60 light:text-emerald-600">▶</span>
                {pos}
              </li>
            ))}
          </ul>
          {/* Top cushion factors from the quantitative model */}
          <div className="mt-3 space-y-1">
            {result.topCushionFactors.map((f, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-white/30 light:text-slate-400">{f.label}</span>
                <span className="font-mono text-[10px] text-emerald-400/50 light:text-emerald-700">{f.formattedValue}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transparency panel */}
      <ConfidencePanel confidence={confidence} modelScore={result.modelScore} />
    </motion.div>
  );
}

interface RiskIntelligenceSectionProps {
  recession: RiskModelResult;
  defaultRisk: RiskModelResult;
  ai: AiRiskIntelligence;
  recessionConfidence: DataConfidence;
  defaultConfidence: DataConfidence;
  /** When the Weekly Intelligence Engine last computed this snapshot (PKT) — see weeklyIntelligenceCompute.ts. */
  computedAt: string;
  /** Estimated next weekly run (PKT) — computedAt + 7 days. */
  nextUpdateAt: string;
}

export default function RiskIntelligenceSection({
  recession,
  defaultRisk,
  ai,
  recessionConfidence,
  defaultConfidence,
  computedAt,
  nextUpdateAt,
}: RiskIntelligenceSectionProps) {
  const { t } = useLanguage();
  return (
    <div id="risk-intelligence" className="scroll-mt-[100px] sm:scroll-mt-[160px]">
      <ViewportFadeIn>
        <h2 className="text-headline mt-10 text-white light:text-slate-900">
          {t("riskIntel.title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-white/60 light:text-slate-500">
          {t("riskIntel.description")}
        </p>
        {/* Weekly Intelligence Engine — updated every Monday, not on page load */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[10px] text-white/25 light:text-slate-400">
            <span className="text-white/35 light:text-slate-500">{t("riskIntel.lastComputed")}</span>{" "}
            {computedAt}
          </span>
          <span className="text-[10px] text-white/15 light:text-slate-300">·</span>
          <span className="text-[10px] text-white/25 light:text-slate-400">
            <span className="text-white/35 light:text-slate-500">{t("riskIntel.nextUpdate")}</span>{" "}
            {nextUpdateAt}
          </span>
          <span className="text-[10px] text-white/15 light:text-slate-300">·</span>
          <span className="text-[10px] text-white/25 light:text-slate-400">
            {t("riskIntel.updateNote")}
          </span>
        </div>
      </ViewportFadeIn>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <RiskCard
          title={t("riskIntel.recession")}
          termKey="Recession Probability"
          result={recession}
          ai={ai.recession}
          confidence={recessionConfidence}
          modelDisplayName={ai.modelDisplayName}
          delay={0}
        />
        <RiskCard
          title={t("riskIntel.default")}
          termKey="Sovereign Default Probability"
          result={defaultRisk}
          ai={ai.default}
          confidence={defaultConfidence}
          modelDisplayName={ai.modelDisplayName}
          delay={0.1}
        />
      </div>
    </div>
  );
}
