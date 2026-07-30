"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { SavingsErosionResult } from "@/components/savingsErosion/SavingsErosionCalculator";

interface Props {
  result: SavingsErosionResult;
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

export default function SavingsErosionResults({ result }: Props) {
  const { t } = useLanguage();
  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString("en-US")}`;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-headline text-white light:text-slate-900">{t("savingsErosion.resultsTitle")}</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={t("savingsErosion.nominalValueLabel")} value={fmt(result.nominalValue)} />
        <KpiTile label={t("savingsErosion.realValueLabel")} value={fmt(result.realValue)} tone="down" />
        <KpiTile label={t("savingsErosion.purchasingPowerLostLabel")} value={fmt(result.purchasingPowerLost)} tone="up" />
        <KpiTile label={t("savingsErosion.percentErosionLabel")} value={`-${result.percentErosion.toFixed(1)}%`} tone="up" />
      </div>

      <div className="glass-card rounded-xl p-4 text-sm leading-relaxed text-white/70 sm:p-5 light:text-slate-600">
        <p>
          {fmt(result.savingsAmount)} left idle for {result.years} year{result.years === 1 ? "" : "s"} at {result.inflationPct.toFixed(1)}% inflation would only buy what {fmt(result.realValue)} buys today
          — a {result.percentErosion.toFixed(1)}% loss in real purchasing power.
        </p>
      </div>
    </div>
  );
}
