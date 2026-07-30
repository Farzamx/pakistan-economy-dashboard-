"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { PurchasingPowerResult } from "@/lib/decisionSupportLab/purchasingPowerEngine";

interface Props {
  result: PurchasingPowerResult;
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

export default function SalaryPurchasingPowerResults({ result }: Props) {
  const { t } = useLanguage();
  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString("en-US")}`;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-headline text-white light:text-slate-900">{t("salaryPurchasingPower.resultsTitle")}</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={t("salaryPurchasingPower.realSalaryTodayLabel")} value={fmt(result.realValueToday)} tone="down" />
        <KpiTile label={t("salaryPurchasingPower.purchasingPowerLostLabel")} value={fmt(result.purchasingPowerLost)} tone="up" />
        <KpiTile label={t("salaryPurchasingPower.percentChangeLabel")} value={`-${result.purchasingPowerLostPct.toFixed(1)}%`} tone="up" />
        <KpiTile label={t("salaryPurchasingPower.inflationAdjustedSalaryLabel")} value={fmt(result.inflationAdjustedValue)} />
      </div>

      <div className="glass-card rounded-xl p-4 text-sm leading-relaxed text-white/70 sm:p-5 light:text-slate-600">
        <p>
          A salary of {fmt(result.amount)} in {result.baseDate.slice(0, 7)} is worth only {fmt(result.realValueToday)} in {result.targetDate.slice(0, 7)} purchasing power — prices rose {result.totalInflationPct.toFixed(1)}% over that period.
        </p>
      </div>
    </div>
  );
}
