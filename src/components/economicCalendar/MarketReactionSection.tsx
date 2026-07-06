"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { MarketReaction, MarketReactionScenario } from "@/lib/economicCalendar/marketReactionEngine";

interface ReactionCardProps {
  label: string;
  reaction: MarketReaction;
  accent: "neutral" | "positive" | "negative";
}

const ACCENT_CLASS: Record<ReactionCardProps["accent"], string> = {
  neutral: "border-white/10 light:border-slate-200",
  positive: "border-emerald-400/25",
  negative: "border-rose-400/25",
};

function ReactionCard({ label, reaction, accent }: ReactionCardProps) {
  return (
    <div className={`rounded-xl border ${ACCENT_CLASS[accent]} bg-white/[0.02] light:bg-slate-50 p-4`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-white/40 light:text-slate-500">{label}</p>
      <p className="mt-1.5 text-sm font-semibold text-white light:text-slate-900">{reaction.headline}</p>
      <ul className="mt-2 space-y-1">
        {reaction.points.map((point, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs leading-relaxed text-white/60 light:text-slate-600">
            <span className="mt-0.5 shrink-0 text-neon-blue/60">•</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MarketReactionPreview({ scenarios }: { scenarios: MarketReactionScenario[] }) {
  const { t } = useLanguage();
  if (scenarios.length === 0) return null;
  return (
    <section className="glass-card mt-6 p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-white light:text-slate-900">{t("calendar.marketReaction")}</h2>
      <p className="mt-1 text-xs text-white/40 light:text-slate-500">{t("calendar.marketNotReleased")}</p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {scenarios.map((s) => (
          <ReactionCard key={s.scenarioLabel} label={s.scenarioLabel} reaction={s.reaction} accent="neutral" />
        ))}
      </div>
    </section>
  );
}

export function MarketReactionActual({ reaction, accent }: { reaction: MarketReaction | null; accent: "neutral" | "positive" | "negative" }) {
  const { t } = useLanguage();
  if (!reaction) return null;
  return (
    <section className="glass-card mt-6 p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-white light:text-slate-900">{t("calendar.marketReaction")}</h2>
      <div className="mt-4">
        <ReactionCard label={t("calendar.basedOnRelease")} reaction={reaction} accent={accent} />
      </div>
    </section>
  );
}
