"use client";

import Link from "next/link";
import type { Recommendation } from "@/lib/decisionSupportLab/recommendationEngine";

interface Props {
  recommendations: Recommendation[];
}

const IMPACT_STYLE: Record<Recommendation["expectedImpact"], string> = {
  high: "bg-rose-500/15 text-rose-300",
  medium: "bg-amber-500/15 text-amber-300",
  low: "bg-white/10 text-white/50",
};

/** Card-style rendering of recommendationEngine.ts's ranked output — a fuller treatment than the inline list EconomicDashboard.tsx uses for its 3-item summary, since a goal planner's recommendations are the primary "what should I do" answer on the page, not a secondary summary widget. */
export default function GoalRecommendationCards({ recommendations }: Props) {
  if (recommendations.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-white light:text-slate-900">Recommendations</h3>
      {recommendations.map((rec) => (
        <div key={rec.title} className="glass-card flex items-start justify-between gap-3 rounded-xl p-4">
          <div>
            <p className="text-sm font-medium text-white/90 light:text-slate-800">{rec.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/55 light:text-slate-500">{rec.reason}</p>
            {rec.relatedToolHref && (
              <Link href={rec.relatedToolHref} className="mt-2 inline-block text-xs font-medium text-neon-blue hover:underline">
                Open related tool →
              </Link>
            )}
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${IMPACT_STYLE[rec.expectedImpact]}`}>
            {rec.expectedImpact}
          </span>
        </div>
      ))}
    </div>
  );
}
