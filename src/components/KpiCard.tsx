"use client";

import { motion, type Variants } from "framer-motion";
import type { Kpi } from "@/data/kpiData";
import InfoTooltip from "@/components/InfoTooltip";

function TrendArrow({ trend }: { trend: Kpi["trend"] }) {
  const isUp = trend === "up";
  return (
    <svg
      className={`h-3 w-3 ${isUp ? "text-emerald-400" : "text-rose-400"}`}
      viewBox="0 0 12 12"
      fill="currentColor"
      aria-hidden="true"
    >
      {isUp ? <path d="M6 2 L10 8 L2 8 Z" /> : <path d="M6 10 L2 4 L10 4 Z" />}
    </svg>
  );
}

// Matches the parent KpiGrid's "hidden"/"visible" stagger.
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const restGlow: Record<Kpi["glow"], string> = {
  blue: "0 0 24px rgba(56, 189, 248, 0.25)",
  purple: "0 0 24px rgba(168, 85, 247, 0.25)",
};

const hoverGlow: Record<Kpi["glow"], string> = {
  blue: "0 0 44px rgba(56, 189, 248, 0.5)",
  purple: "0 0 44px rgba(168, 85, 247, 0.5)",
};

export default function KpiCard({ title, value, unit, change, trend, glow }: Kpi) {
  const trendColor = trend === "up" ? "text-emerald-400" : "text-rose-400";

  return (
    <motion.div
      variants={cardVariants}
      style={{ boxShadow: restGlow[glow] }}
      whileHover={{ scale: 1.03, boxShadow: hoverGlow[glow] }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="glass-card flex flex-col gap-3 p-6"
    >
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-white/60">{title}</span>
        <InfoTooltip termKey={title} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-white">{value}</span>
        <span className="text-sm text-white/50">{unit}</span>
      </div>
      <div className={`flex items-center gap-1.5 text-xs font-medium ${trendColor}`}>
        <TrendArrow trend={trend} />
        <span>{change}</span>
      </div>
    </motion.div>
  );
}
