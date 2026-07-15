"use client";

import { motion } from "framer-motion";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";

interface Props {
  /** 0-100 (or 0-maxScore) */
  score: number;
  maxScore?: number;
  /** Fill color — a semantic hex (health/risk status color), never decorative. */
  color: string;
  /** "compact" for inline/dense placements (Hero briefing), "default" for full-size cards. */
  size?: "compact" | "default";
  className?: string;
}

/**
 * Replaces the radial HealthScoreGauge (PEIC v3 "remove circular gauges"
 * pass) with the reference design's horizontal index — a filled bar that
 * sweeps in once, same animated-on-first-view feel as the gauge it
 * replaces, just institutional-register instead of a dashboard dial.
 */
export default function HorizontalIndexBar({ score, maxScore = 100, color, size = "default", className = "" }: Props) {
  const prefersReducedMotion = useSafeReducedMotion();
  const pct = Math.max(0, Math.min(100, (score / maxScore) * 100));
  const height = size === "compact" ? "h-1.5" : "h-2";

  return (
    <div className={`w-full overflow-hidden rounded-full bg-white/[0.08] light:bg-slate-200 ${height} ${className}`}>
      <motion.div
        className="h-full rounded-full"
        initial={{ width: prefersReducedMotion ? `${pct}%` : 0 }}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true }}
        transition={{ duration: prefersReducedMotion ? 0 : 1.1, ease: "easeOut" }}
        style={{ background: `linear-gradient(90deg, ${color}, ${color}99)` }}
      />
    </div>
  );
}
