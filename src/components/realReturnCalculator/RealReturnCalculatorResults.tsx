"use client";

import { useLanguage } from "@/components/LanguageProvider";

interface Props {
  nominalGain: number;
  realGain: number;
  purchasingPowerChangePct: number;
  inflationCost: number;
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

export default function RealReturnCalculatorResults({ nominalGain, realGain, purchasingPowerChangePct, inflationCost }: Props) {
  const { t } = useLanguage();
  const fmt = (n: number) => `${n < 0 ? "-" : ""}Rs ${Math.round(Math.abs(n)).toLocaleString("en-US")}`;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-headline text-white light:text-slate-900">{t("realReturnCalculator.resultsTitle")}</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={t("realReturnCalculator.nominalGainLabel")} value={fmt(nominalGain)} />
        <KpiTile label={t("realReturnCalculator.realGainLabel")} value={fmt(realGain)} tone={realGain >= 0 ? "down" : "up"} />
        <KpiTile label={t("realReturnCalculator.purchasingPowerChangeLabel")} value={`${purchasingPowerChangePct >= 0 ? "+" : ""}${purchasingPowerChangePct.toFixed(1)}%`} tone={purchasingPowerChangePct >= 0 ? "down" : "up"} />
        <KpiTile label={t("realReturnCalculator.inflationCostLabel")} value={fmt(inflationCost)} tone="up" />
      </div>
    </div>
  );
}
