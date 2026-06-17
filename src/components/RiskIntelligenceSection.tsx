"use client";

import { motion } from "framer-motion";
import HealthScoreGauge from "@/components/HealthScoreGauge";
import ViewportFadeIn from "@/components/ViewportFadeIn";
import {
  getRiskGaugeColor,
  getRiskCategoryClass,
  type RiskModelResult,
  type RiskCategory,
  type DataConfidence,
  type ConfidenceLevel,
} from "@/lib/riskModels";
import type { AiRiskExplanation, AiRiskIntelligence } from "@/lib/data/aiRiskIntelligence";

const CATEGORY_LABEL: Record<RiskCategory, string> = {
  Low:      "Low Risk",
  Elevated: "Elevated Risk",
  High:     "High Risk",
  Severe:   "Severe Risk",
};

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
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
      <p className="mb-2.5 text-[9px] font-semibold uppercase tracking-widest text-white/25">
        Transparency
      </p>
      <div className="grid grid-cols-3 gap-x-4 gap-y-0.5">
        {/* Column 1 — Last Calculated */}
        <div>
          <p className="text-[9px] font-medium uppercase tracking-wider text-white/25">
            Last Calculated
          </p>
          <p className="mt-1 text-[10px] leading-tight text-white/50">
            {/* Split at the · to show date and time on two lines */}
            {confidence.calculatedAt.split(" · ")[0]}
          </p>
          <p className="text-[10px] leading-tight text-white/35">
            {confidence.calculatedAt.split(" · ")[1]}
          </p>
        </div>

        {/* Column 2 — Indicators */}
        <div>
          <p className="text-[9px] font-medium uppercase tracking-wider text-white/25">
            Indicators
          </p>
          <p className="mt-1 text-[10px] leading-tight text-white/50">
            {confidence.currentCount}/{confidence.totalCount} Current
          </p>
          <p className="text-[10px] leading-tight text-white/35">
            {confidence.staleCount === 0
              ? "None stale"
              : `${confidence.staleCount} Stale`}
          </p>
        </div>

        {/* Column 3 — Confidence Score */}
        <div>
          <p className="text-[9px] font-medium uppercase tracking-wider text-white/25">
            Confidence
          </p>
          <p className="mt-1 font-mono text-[10px] leading-tight text-white/50">
            {confidence.score}%
          </p>
          <p className={`text-[10px] leading-tight ${CONFIDENCE_DOT[confidence.level]}`}>
            ● {confidence.level}
          </p>
        </div>
      </div>

      {/* Methodology note */}
      <p className="mt-2.5 text-[9px] text-white/20">
        Model score {modelScore}/100 · −10 pts per fallback indicator · −5 pts per stale indicator · AI explanation via OpenRouter
      </p>
    </div>
  );
}

interface RiskCardProps {
  title: string;
  result: RiskModelResult;
  ai: AiRiskExplanation;
  confidence: DataConfidence;
  modelDisplayName: string;
  delay?: number;
}

function RiskCard({ title, result, ai, confidence, modelDisplayName, delay = 0 }: RiskCardProps) {
  const gaugeColor = getRiskGaugeColor(result.riskCategory);
  const categoryClass = getRiskCategoryClass(result.riskCategory);

  return (
    <motion.div
      className="glass-card flex flex-col gap-5 p-6 sm:p-8"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
    >
      {/* Header row — gauge + title/badges/summary */}
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
        <div className="shrink-0">
          <HealthScoreGauge score={result.probability} color={gaugeColor} />
        </div>

        <div className="flex flex-col items-center sm:items-start">
          {/* Title + methodology badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
              {title}
            </span>
            <span className="rounded-full border border-neon-purple/20 bg-neon-purple/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-neon-purple/70">
              QUANT
            </span>
            <span className="rounded-full border border-neon-blue/20 bg-neon-blue/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-neon-blue/70">
              {modelDisplayName}
            </span>
          </div>

          {/* Risk category badge */}
          <div className="mt-2">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${categoryClass}`}
            >
              {CATEGORY_LABEL[result.riskCategory]}
            </span>
          </div>

          {/* AI narrative */}
          <p className="mt-3 max-w-sm text-sm text-white/60">{ai.explanation}</p>
        </div>
      </div>

      {/* Factor breakdown — risks left, strengths right */}
      <div className="grid gap-4 border-t border-white/5 pt-4 sm:grid-cols-2">
        {/* Key risks column */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-rose-400/60">
            Key Risks
          </p>
          <ul className="space-y-1.5">
            {ai.keyRisks.map((risk, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/50">
                <span className="mt-0.5 shrink-0 text-[8px] text-rose-400/60">▶</span>
                {risk}
              </li>
            ))}
          </ul>
          {/* Top pressure factors from the quantitative model */}
          <div className="mt-3 space-y-1">
            {result.topRiskFactors.map((f, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-white/30">{f.label}</span>
                <span className="font-mono text-[10px] text-rose-400/50">{f.formattedValue}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths column */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-emerald-400/60">
            Strengths
          </p>
          <ul className="space-y-1.5">
            {ai.keyPositives.map((pos, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/50">
                <span className="mt-0.5 shrink-0 text-[8px] text-emerald-400/60">▶</span>
                {pos}
              </li>
            ))}
          </ul>
          {/* Top cushion factors from the quantitative model */}
          <div className="mt-3 space-y-1">
            {result.topCushionFactors.map((f, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-white/30">{f.label}</span>
                <span className="font-mono text-[10px] text-emerald-400/50">{f.formattedValue}</span>
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
}

export default function RiskIntelligenceSection({
  recession,
  defaultRisk,
  ai,
  recessionConfidence,
  defaultConfidence,
}: RiskIntelligenceSectionProps) {
  return (
    <div id="risk-intelligence" className="scroll-mt-8">
      <ViewportFadeIn>
        <h2 className="mt-12 text-xl font-semibold text-white sm:text-2xl">
          Risk Intelligence
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-white/60">
          Deterministic probability estimates derived from live economic indicators.
          AI explains the model output — it never generates the probabilities.
        </p>
      </ViewportFadeIn>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <RiskCard
          title="Recession Probability"
          result={recession}
          ai={ai.recession}
          confidence={recessionConfidence}
          modelDisplayName={ai.modelDisplayName}
          delay={0}
        />
        <RiskCard
          title="Sovereign Default Probability"
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
