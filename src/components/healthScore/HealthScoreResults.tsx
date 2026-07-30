"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { CATEGORY_TOOL_HREF, type HealthCategoryId, type HealthScoreResult } from "@/lib/decisionSupportLab/healthScoreEngine";

interface Props {
  result: HealthScoreResult;
}

const CATEGORY_LABEL_KEY: Record<HealthCategoryId, string> = {
  personalInflation: "healthScore.categoryPersonalInflation",
  inflationExposure: "healthScore.categoryInflationExposure",
  budgetBalance: "healthScore.categoryBudgetBalance",
  purchasingPower: "healthScore.categoryPurchasingPower",
  salaryGrowth: "healthScore.categorySalaryGrowth",
  savingsProtection: "healthScore.categorySavingsProtection",
};

function toneForScore(score: number): "good" | "warning" | "poor" {
  if (score >= 70) return "good";
  if (score >= 50) return "warning";
  return "poor";
}

const TONE_BAR: Record<"good" | "warning" | "poor", string> = {
  good: "bg-emerald-400",
  warning: "bg-amber-400",
  poor: "bg-rose-400",
};

const TONE_TEXT: Record<"good" | "warning" | "poor", string> = {
  good: "text-emerald-400",
  warning: "text-amber-400",
  poor: "text-rose-400",
};

function overallTone(score: number): "good" | "warning" | "poor" {
  return toneForScore(score);
}

export default function HealthScoreResults({ result }: Props) {
  const { t } = useLanguage();
  const tone = overallTone(result.overallScore);

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card-raised flex flex-col items-center gap-3 rounded-2xl p-8 text-center sm:p-10">
        <span className="text-label text-white/40 light:text-slate-400">{t("healthScore.overallScoreLabel")}</span>
        <span className={`text-mono-num tabular-nums ${TONE_TEXT[tone]}`} style={{ fontSize: "4rem", fontWeight: 700, lineHeight: 1 }}>
          {result.overallScore}
        </span>
        <span className="text-sm text-white/40 light:text-slate-400">/ 100</span>
        {result.dataCompleteness < 1 && (
          <div className="mt-2 max-w-md rounded-lg border border-amber-400/25 bg-amber-500/10 p-3 text-xs text-amber-300">
            <p className="font-semibold">{t("healthScore.dataIncompleteTitle")}</p>
            <p className="mt-1 text-amber-200/80">{t("healthScore.dataIncompleteDesc")}</p>
          </div>
        )}
      </div>

      <div className="glass-card rounded-xl p-5 sm:p-6">
        <h2 className="text-base font-semibold text-white light:text-slate-900">{t("healthScore.categoryScoresTitle")}</h2>
        <div className="mt-4 flex flex-col gap-4">
          {result.categories.map((cat) => {
            const catTone = toneForScore(cat.score);
            return (
              <div key={cat.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70 light:text-slate-600">{t(CATEGORY_LABEL_KEY[cat.id])}</span>
                  <span className={`text-mono-num tabular-nums font-semibold ${cat.available ? TONE_TEXT[catTone] : "text-white/25 light:text-slate-300"}`}>
                    {cat.available ? cat.score : "—"}
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                  {cat.available && <div className={`h-full rounded-full ${TONE_BAR[catTone]}`} style={{ width: `${cat.score}%` }} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {result.strengths.length > 0 && (
        <div className="glass-card rounded-xl border-emerald-400/20 p-5 sm:p-6">
          <h2 className="text-base font-semibold text-emerald-400">{t("healthScore.strengthsTitle")}</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {result.strengths.map((id) => (
              <li key={id} className="flex items-center gap-2 text-sm text-white/75 light:text-slate-700">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {t(CATEGORY_LABEL_KEY[id])}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.weaknesses.length > 0 && (
        <div className="glass-card rounded-xl border-rose-400/20 p-5 sm:p-6">
          <h2 className="text-base font-semibold text-rose-400">{t("healthScore.weaknessesTitle")}</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {result.weaknesses.map((id) => (
              <li key={id} className="flex items-center gap-2 text-sm text-white/75 light:text-slate-700">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                {t(CATEGORY_LABEL_KEY[id])}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="glass-card rounded-xl p-5 sm:p-6">
        <h2 className="text-base font-semibold text-white light:text-slate-900">{t("healthScore.suggestedNextTitle")}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {result.categories
            .filter((c) => !c.available)
            .map((c) => (
              <Link
                key={c.id}
                href={CATEGORY_TOOL_HREF[c.id]}
                className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:border-neon-blue hover:text-white light:text-slate-600"
              >
                {t(CATEGORY_LABEL_KEY[c.id])}
              </Link>
            ))}
          {result.weaknesses.map((id) => (
            <Link
              key={`weak-${id}`}
              href={CATEGORY_TOOL_HREF[id]}
              className="rounded-lg border border-neon-blue/30 bg-neon-blue/10 px-3 py-1.5 text-xs font-medium text-neon-blue transition-colors hover:border-neon-blue/50"
            >
              {t(CATEGORY_LABEL_KEY[id])}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
