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

export default function PurchasingPowerResults({ result }: Props) {
  const { t } = useLanguage();
  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString("en-US")}`;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-headline text-white light:text-slate-900">{t("purchasingPower.resultsTitle")}</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={t("purchasingPower.purchasingPowerTodayLabel")} value={fmt(result.realValueToday)} tone="down" />
        <KpiTile label={t("purchasingPower.inflationLossLabel")} value={fmt(result.purchasingPowerLost)} tone="up" />
        <KpiTile label={t("purchasingPower.percentChangeLabel")} value={`-${result.purchasingPowerLostPct.toFixed(1)}%`} tone="up" />
        <KpiTile label={t("purchasingPower.inflationAdjustedLabel")} value={fmt(result.inflationAdjustedValue)} />
      </div>

      <div className="glass-card rounded-xl p-4 text-sm leading-relaxed text-white/70 sm:p-5 light:text-slate-600">
        <ResultSummarySentence
          amount={result.amount}
          baseDate={result.baseDate}
          targetDate={result.targetDate}
          realValueToday={result.realValueToday}
          totalInflationPct={result.totalInflationPct}
        />
      </div>
    </div>
  );
}

function ResultSummarySentence({
  amount,
  baseDate,
  targetDate,
  realValueToday,
  totalInflationPct,
}: {
  amount: number;
  baseDate: string;
  targetDate: string;
  realValueToday: number;
  totalInflationPct: number;
}) {
  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString("en-US")}`;
  return (
    <p>
      {fmt(amount)} from {baseDate.slice(0, 7)} is worth only {fmt(realValueToday)} in {targetDate.slice(0, 7)} purchasing power — prices rose {totalInflationPct.toFixed(1)}% over that period.
    </p>
  );
}
