"use client";

import { useLanguage } from "@/components/LanguageProvider";

interface Props {
  futureValueAmount: number;
  presentValueAmount: number;
  realFutureValueAmount: number;
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card-raised flex flex-col gap-1.5 rounded-xl p-4 sm:p-5">
      <span className="text-label text-white/40 light:text-slate-400">{label}</span>
      <span className="text-metric text-mono-num tabular-nums text-white light:text-slate-900">{value}</span>
    </div>
  );
}

export default function FutureValueResults({ futureValueAmount, presentValueAmount, realFutureValueAmount }: Props) {
  const { t } = useLanguage();
  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString("en-US")}`;
  const growthMultiple = presentValueAmount > 0 ? futureValueAmount / presentValueAmount : 0;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-headline text-white light:text-slate-900">{t("futureValue.resultsTitle")}</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiTile label={t("futureValue.futureValueLabel")} value={fmt(futureValueAmount)} />
        <KpiTile label={t("futureValue.growthMultipleLabel")} value={`${growthMultiple.toFixed(2)}×`} />
        <KpiTile label={t("futureValue.realFutureValueLabel")} value={fmt(realFutureValueAmount)} />
      </div>
    </div>
  );
}
