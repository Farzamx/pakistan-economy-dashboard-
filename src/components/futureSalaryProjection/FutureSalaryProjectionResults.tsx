"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { FutureSalaryProjectionResult } from "@/components/futureSalaryProjection/FutureSalaryProjectionCalculator";

interface Props {
  result: FutureSalaryProjectionResult;
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

export default function FutureSalaryProjectionResults({ result }: Props) {
  const { t } = useLanguage();
  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString("en-US")}`;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-headline text-white light:text-slate-900">{t("futureSalaryProjection.resultsTitle")}</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiTile label={t("futureSalaryProjection.nominalSalaryLabel")} value={fmt(result.nominalSalary)} />
        <KpiTile label={t("futureSalaryProjection.realSalaryLabel")} value={fmt(result.realSalary)} tone={result.purchasingPowerPct >= 100 ? "down" : "up"} />
        <KpiTile label={t("futureSalaryProjection.purchasingPowerLabel")} value={`${result.purchasingPowerPct.toFixed(0)}%`} tone={result.purchasingPowerPct >= 100 ? "down" : "up"} />
      </div>

      <div className="glass-card rounded-xl p-4 text-sm leading-relaxed text-white/70 sm:p-5 light:text-slate-600">
        <p>
          At a {result.annualRaisePct.toFixed(1)}% annual raise against {result.inflationPct.toFixed(1)}% inflation, your salary in {result.years} years would nominally be {fmt(result.nominalSalary)}, worth {fmt(result.realSalary)} in
          today&apos;s purchasing power — {result.purchasingPowerPct >= 100 ? "an increase" : "a decrease"} of {Math.abs(result.purchasingPowerPct - 100).toFixed(0)}% in real terms.
        </p>
      </div>
    </div>
  );
}
