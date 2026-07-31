"use client";

import { useLanguage } from "@/components/LanguageProvider";

interface Props {
  startingWealth: number;
  endingWealth: number;
  inflationLoss: number;
  realValue: number;
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

export default function InflationDragAnalyzerResults({ startingWealth, endingWealth, inflationLoss, realValue }: Props) {
  const { t } = useLanguage();
  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString("en-US")}`;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-headline text-white light:text-slate-900">{t("inflationDragAnalyzer.resultsTitle")}</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={t("inflationDragAnalyzer.startingWealthLabel")} value={fmt(startingWealth)} />
        <KpiTile label={t("inflationDragAnalyzer.endingWealthLabel")} value={fmt(endingWealth)} />
        <KpiTile label={t("inflationDragAnalyzer.inflationLossLabel")} value={fmt(inflationLoss)} tone="up" />
        <KpiTile label={t("inflationDragAnalyzer.realValueLabel")} value={fmt(realValue)} tone={realValue >= startingWealth ? "down" : "up"} />
      </div>
    </div>
  );
}
