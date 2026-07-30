"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { SalaryRequiredResult } from "@/lib/decisionSupportLab/salaryEngine";

interface Props {
  result: SalaryRequiredResult;
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

export default function SalaryRequiredResults({ result }: Props) {
  const { t } = useLanguage();
  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString("en-US")}`;
  const gapNegative = result.realIncomeGapPct < 0;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-headline text-white light:text-slate-900">{t("salaryRequired.resultsTitle")}</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={t("salaryRequired.requiredSalaryLabel")} value={fmt(result.requiredSalary)} />
        <KpiTile label={t("salaryRequired.requiredMonthlyIncomeLabel")} value={fmt(result.requiredMonthlyIncome)} />
        <KpiTile label={t("salaryRequired.differenceLabel")} value={`+${fmt(result.difference)}`} tone="up" />
        <KpiTile label={t("salaryRequired.realIncomeGapLabel")} value={`${result.realIncomeGapPct >= 0 ? "+" : ""}${result.realIncomeGapPct.toFixed(1)}%`} tone={gapNegative ? "up" : "down"} />
      </div>

      <div className="glass-card rounded-xl p-4 text-sm leading-relaxed text-white/70 sm:p-5 light:text-slate-600">
        <p>
          To maintain your current lifestyle {result.years} year{result.years === 1 ? "" : "s"} from now at {result.inflationPct.toFixed(1)}% inflation ({result.inflationSource === "personal" ? "your personal rate" : "official CPI"}), you would need a salary of {fmt(result.requiredSalary)} —{" "}
          {fmt(result.difference)} more than today. {gapNegative
            ? `Your currently planned raise would leave you ${Math.abs(result.realIncomeGapPct).toFixed(1)}% short of that in real terms.`
            : `Your currently planned raise would keep you ahead by ${result.realIncomeGapPct.toFixed(1)}% in real terms.`}
        </p>
      </div>
    </div>
  );
}
