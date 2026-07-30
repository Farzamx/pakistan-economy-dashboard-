"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { RaiseRealityCheckResult } from "@/lib/decisionSupportLab/salaryEngine";

interface Props {
  result: RaiseRealityCheckResult;
}

const TONE_TEXT: Record<RaiseRealityCheckResult["tone"], string> = {
  positive: "text-emerald-400",
  negative: "text-rose-400",
  neutral: "text-white light:text-slate-900",
};

const TONE_BANNER: Record<RaiseRealityCheckResult["tone"], string> = {
  positive: "border-emerald-400/25 bg-emerald-500/10",
  negative: "border-rose-400/25 bg-rose-500/10",
  neutral: "border-[var(--border-subtle)] bg-[var(--surface-2)]",
};

function KpiTile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="glass-card-raised flex flex-col gap-1.5 rounded-xl p-4 sm:p-5">
      <span className="text-label text-white/40 light:text-slate-400">{label}</span>
      <span className={`text-metric text-mono-num tabular-nums ${tone ?? "text-white light:text-slate-900"}`}>{value}</span>
    </div>
  );
}

/**
 * The flagship verdict sentence — deliberately hand-built English prose
 * (not run through i18n) since it embeds live computed numbers, the same
 * convention personalInflation/engine.ts's generatePersonalInflationExplanation()
 * and PurchasingPowerResults' ResultSummarySentence already use for
 * "generated analytical prose" vs. fixed interface chrome.
 */
function verdictSentence(result: RaiseRealityCheckResult): string {
  const raise = result.nominalRaisePct.toFixed(1);
  const inflation = result.inflationPct.toFixed(1);
  const realAbs = Math.abs(result.realChangePct).toFixed(1);
  if (result.tone === "neutral") {
    return `You received a ${raise}% raise. With inflation at ${inflation}%, your real income stayed essentially flat (${result.realChangePct >= 0 ? "+" : "-"}${realAbs}%).`;
  }
  if (result.tone === "negative") {
    return `You received a ${raise}% raise. With inflation at ${inflation}%, you actually received a ${realAbs}% real salary decrease.`;
  }
  return `You received a ${raise}% raise. With inflation at ${inflation}%, you received a real ${realAbs}% increase in purchasing power.`;
}

export default function RaiseRealityCheckResults({ result }: Props) {
  const { t } = useLanguage();
  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString("en-US")}`;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-headline text-white light:text-slate-900">{t("raiseRealityCheck.resultsTitle")}</h2>

      <div className={`rounded-xl border p-4 text-sm leading-relaxed sm:p-5 ${TONE_BANNER[result.tone]}`}>
        <p className={`font-semibold ${TONE_TEXT[result.tone]}`}>{verdictSentence(result)}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiTile label={t("raiseRealityCheck.realChangeLabel")} value={`${result.realChangePct >= 0 ? "+" : ""}${result.realChangePct.toFixed(1)}%`} tone={TONE_TEXT[result.tone]} />
        <KpiTile label={t("raiseRealityCheck.newNominalSalaryLabel")} value={fmt(result.newNominalSalary)} />
        <KpiTile label={t("raiseRealityCheck.realEquivalentSalaryLabel")} value={fmt(result.realEquivalentSalary)} />
      </div>
    </div>
  );
}
