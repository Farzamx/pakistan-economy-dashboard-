import { T } from "@/components/T";
import type { Insight } from "@/lib/decisionSupportLab/insightEngine";

const TONE_STYLE: Record<Insight["tone"], string> = {
  positive: "border-emerald-400/25 bg-emerald-500/10",
  warning: "border-amber-400/25 bg-amber-500/10",
  neutral: "border-[var(--border-subtle)] bg-[var(--surface-2)]",
};

const TONE_DOT: Record<Insight["tone"], string> = {
  positive: "bg-emerald-400",
  warning: "bg-amber-400",
  neutral: "bg-white/30",
};

interface Props {
  insights: Insight[];
}

/**
 * Renders whatever generatePersonalInsights() produced — a deterministic,
 * rule-based list (see insightEngine.ts), never an LLM call. Renders
 * nothing at all when the engine found nothing worth surfacing, rather
 * than padding the page with a generic "no notable insights" message.
 */
export default function PersonalInsightsPanel({ insights }: Props) {
  if (insights.length === 0) return null;

  return (
    <section className="glass-card flex flex-col gap-3 rounded-xl p-5 sm:p-6">
      <h2 className="text-base font-semibold text-white light:text-slate-900">
        <T tKey="decisionSupportLab.insightsTitle" />
      </h2>
      <ul className="flex flex-col gap-2">
        {insights.map((insight) => (
          <li key={insight.id} className={`flex items-start gap-2.5 rounded-lg border p-3 text-sm ${TONE_STYLE[insight.tone]}`}>
            <span aria-hidden="true" className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[insight.tone]}`} />
            <span className="text-white/80 light:text-slate-700">{insight.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
