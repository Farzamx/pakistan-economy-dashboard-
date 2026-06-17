"use client";

import { motion } from "framer-motion";
import HealthScoreGauge from "@/components/HealthScoreGauge";
import { getHealthStatus } from "@/lib/economicHealth";
import type { AiEconomicAnalysis } from "@/lib/data/aiEconomicAnalysis";

const SENTIMENT_CLASS: Record<AiEconomicAnalysis["sentiment"], string> = {
  Bullish: "border-emerald-400/20 bg-emerald-400/10 text-emerald-400",
  Neutral: "border-amber-400/20 bg-amber-400/10 text-amber-400",
  Bearish: "border-rose-400/20 bg-rose-400/10 text-rose-400",
};

const RISK_CLASS: Record<AiEconomicAnalysis["riskLevel"], string> = {
  Low: "border-emerald-400/20 bg-emerald-400/10 text-emerald-400",
  Moderate: "border-amber-400/20 bg-amber-400/10 text-amber-400",
  High: "border-rose-400/20 bg-rose-400/10 text-rose-400",
};

export default function HealthScoreCard({
  economicHealthScore,
  sentiment,
  riskLevel,
  summary,
  topDrivers,
  modelDisplayName,
}: AiEconomicAnalysis) {
  const status = getHealthStatus(economicHealthScore);

  return (
    <motion.section
      className="glass-card mt-8 flex flex-col items-center gap-6 p-6 text-center sm:flex-row sm:p-8 sm:text-left"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <HealthScoreGauge score={economicHealthScore} color={status.ringColor} />

      <div className="flex flex-col items-center sm:items-start">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
            Economic Health Score
          </span>
          <span className="rounded-full border border-neon-blue/20 bg-neon-blue/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-neon-blue/70">
            {modelDisplayName}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${status.badgeClass}`}
          >
            {status.label}
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${SENTIMENT_CLASS[sentiment]}`}
          >
            {sentiment}
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${RISK_CLASS[riskLevel]}`}
          >
            {riskLevel} Risk
          </span>
        </div>

        <p className="mt-3 max-w-md text-sm text-white/60">{summary}</p>

        {topDrivers.length > 0 && (
          <ul className="mt-3 space-y-1">
            {topDrivers.map((driver, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/45">
                <span className="mt-0.5 text-[8px] text-neon-blue/60">▶</span>
                {driver}
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.section>
  );
}
