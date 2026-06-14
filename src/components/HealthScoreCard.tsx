"use client";

import { motion } from "framer-motion";
import HealthScoreGauge from "@/components/HealthScoreGauge";
import { getHealthStatus } from "@/lib/economicHealth";

interface HealthScoreCardProps {
  score: number;
  explanation: string;
}

export default function HealthScoreCard({ score, explanation }: HealthScoreCardProps) {
  const status = getHealthStatus(score);

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
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
          Economic Health Score
        </span>
        <span
          className={`mt-2 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${status.badgeClass}`}
        >
          {status.label}
        </span>
        <p className="mt-3 max-w-md text-sm text-white/60">{explanation}</p>
      </div>
    </motion.section>
  );
}
