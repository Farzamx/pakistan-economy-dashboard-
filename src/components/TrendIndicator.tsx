import type { Trend } from "@/data/kpiData";

// Canonical trend color/glyph — previously duplicated near-identically in
// KpiCard.tsx (TrendArrow) and IndicatorTable.tsx (TrendGlyph), both binary
// (up/down only, no way to render "neutral"). PEIC v2.2 (Indicator
// Navigation & Trend Semantics Fix): every consumer of a Kpi's `trend`
// field should render through here so a color/shape fix only ever needs
// to happen once.
export const TREND_TEXT_COLOR: Record<Trend, string> = {
  up: "text-emerald-400 light:text-emerald-700",
  down: "text-rose-400 light:text-rose-700",
  neutral: "text-white/40 light:text-slate-400",
};

export const TREND_STROKE_COLOR: Record<Trend, string> = {
  up: "#34d399",
  down: "#fb7185",
  neutral: "#94a3b8",
};

/** Canonical trend arrow/dash glyph. `className` controls sizing only (color always comes from TREND_TEXT_COLOR). */
export function TrendArrowIcon({ trend, className = "h-3 w-3" }: { trend: Trend; className?: string }) {
  if (trend === "neutral") {
    return (
      <svg className={`${className} ${TREND_TEXT_COLOR.neutral}`} viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
        <rect x="2" y="5" width="8" height="2" rx="1" />
      </svg>
    );
  }
  return (
    <svg className={`${className} ${TREND_TEXT_COLOR[trend]}`} viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      {trend === "up" ? <path d="M6 2 L10 8 L2 8 Z" /> : <path d="M6 10 L2 4 L10 4 Z" />}
    </svg>
  );
}
