"use client";

import { animate, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

const DEFAULT_SIZE = 160;

interface HealthScoreGaugeProps {
  score: number;
  color: string;
  /** Diameter in px. Defaults to 160 (every existing call site's exact
   * prior behavior — HealthScoreCard, RiskCard). PEIC v2's CommandCenterHero
   * passes a smaller size for its compact briefing tile. */
  size?: number;
}

export default function HealthScoreGauge({ score, color, size = DEFAULT_SIZE }: HealthScoreGaugeProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const { theme } = useTheme();

  useEffect(() => {
    const controls = animate(0, score, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (value) => setDisplayScore(Math.round(value)),
    });
    return () => controls.stop();
  }, [score]);

  const trackStroke = theme === "light"
    ? "rgba(0, 0, 0, 0.08)"
    : "rgba(255, 255, 255, 0.08)";

  // Stroke width and font sizes scale down proportionally for compact
  // instances rather than staying fixed at the 160px-tuned values.
  const stroke = size >= 140 ? 12 : Math.max(6, Math.round(size * 0.075));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const scoreFontSize = size >= 140 ? "2.25rem" : `${Math.max(1, size * 0.22)}px`;
  const suffixFontSize = size >= 140 ? "0.75rem" : `${Math.max(0.6, size * 0.075)}px`;

  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ height: size, width: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackStroke}
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - score / 100) }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-bold text-white light:text-slate-900" style={{ fontSize: scoreFontSize, lineHeight: 1 }}>{displayScore}</span>
        <span className="text-white/40 light:text-slate-400" style={{ fontSize: suffixFontSize }}>/ 100</span>
      </div>
    </div>
  );
}
