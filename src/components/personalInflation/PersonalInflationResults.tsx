"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { PersonalInflationResult } from "@/lib/personalInflation/engine";
import { personalInflationVerdict, generatePersonalInflationExplanation } from "@/lib/personalInflation/engine";

interface Props {
  result: PersonalInflationResult;
}

function KpiTile({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" | "neutral" }) {
  const toneColor = tone === "up" ? "text-rose-400" : tone === "down" ? "text-emerald-400" : "text-white light:text-slate-900";
  return (
    <div className="glass-card-raised flex flex-col gap-1.5 rounded-xl p-4 sm:p-5">
      <span className="text-label text-white/40 light:text-slate-400">{label}</span>
      <span className={`text-metric text-mono-num tabular-nums ${toneColor}`}>{value}</span>
    </div>
  );
}

export default function PersonalInflationResults({ result }: Props) {
  const { t } = useLanguage();
  const verdict = personalInflationVerdict(result.differencePct);
  const explanation = generatePersonalInflationExplanation(result);

  const verdictStyle =
    verdict.tone === "higher"
      ? "border-rose-400/30 bg-rose-500/10 text-rose-300"
      : verdict.tone === "lower"
        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
        : "border-[var(--border-subtle)] bg-[var(--surface-2)] text-white/80 light:text-slate-700";

  const diffSign = result.differencePct > 0 ? "+" : "";

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-headline text-white light:text-slate-900">{t("personalInflation.resultsTitle")}</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiTile label={t("personalInflation.officialCpiLabel")} value={`${result.officialCpiPct.toFixed(1)}%`} />
        <KpiTile
          label={t("personalInflation.yourInflationLabel")}
          value={`${result.personalCpiPct.toFixed(1)}%`}
          tone={verdict.tone === "higher" ? "up" : verdict.tone === "lower" ? "down" : "neutral"}
        />
        <KpiTile
          label={t("personalInflation.differenceLabel")}
          value={`${diffSign}${result.differencePct.toFixed(1)} pp`}
          tone={verdict.tone === "higher" ? "up" : verdict.tone === "lower" ? "down" : "neutral"}
        />
      </div>

      <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${verdictStyle}`} role="status">
        {t(verdict.i18nKey)}
      </div>

      <div className="glass-card rounded-xl p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-white light:text-slate-900">{t("personalInflation.explanationTitle")}</h3>
        <div className="mt-2 flex flex-col gap-2">
          {explanation.map((sentence, i) => (
            <p key={i} className="text-sm leading-relaxed text-white/70 light:text-slate-600">
              {sentence}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
