"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { MARKET_IMPACT_RANKING } from "@/lib/economicCalendar/marketImpactScore";

const BAR_COLOR_BY_SCORE = (score: number) => {
  if (score >= 8) return "bg-rose-400";
  if (score >= 4) return "bg-amber-400";
  return "bg-emerald-400";
};

export default function MarketImpactRanking({ limit }: { limit?: number }) {
  const { t } = useLanguage();
  const entries = limit ? MARKET_IMPACT_RANKING.slice(0, limit) : MARKET_IMPACT_RANKING;
  const maxScore = MARKET_IMPACT_RANKING[0]?.score ?? 10;

  return (
    <section className="glass-card flex flex-col gap-4 rounded-2xl p-6 sm:p-8">
      <div>
        <h2 className="text-xl font-semibold text-white light:text-slate-900">{t("calendar.marketImpactTitle")}</h2>
        <p className="mt-1 text-sm text-white/50 light:text-slate-500">{t("calendar.marketImpactDesc")}</p>
      </div>

      <ol className="flex flex-col gap-2">
        {entries.map((entry, i) => (
          <li key={entry.slug} className="flex items-center gap-3">
            <span className="w-5 shrink-0 text-right text-xs font-semibold text-white/35 light:text-slate-400">{i + 1}.</span>
            <span className="flex-1 truncate text-sm text-white/85 light:text-slate-800">{entry.title}</span>
            <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-white/5 light:bg-slate-100 sm:block">
              <div className={`h-full rounded-full ${BAR_COLOR_BY_SCORE(entry.score)}`} style={{ width: `${(entry.score / maxScore) * 100}%` }} />
            </div>
            <span className="w-10 shrink-0 text-right text-sm font-bold text-white light:text-slate-900">{entry.score}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
