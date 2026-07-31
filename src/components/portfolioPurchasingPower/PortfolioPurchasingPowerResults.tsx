"use client";

import { useLanguage } from "@/components/LanguageProvider";

interface Props {
  portfolioNominalReturnPct: number;
  portfolioRealReturnPct: number;
  realValue: number;
  inflationDragPct: number;
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

export default function PortfolioPurchasingPowerResults({ portfolioNominalReturnPct, portfolioRealReturnPct, realValue, inflationDragPct }: Props) {
  const { t } = useLanguage();
  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString("en-US")}`;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-headline text-white light:text-slate-900">{t("portfolioPurchasingPower.resultsTitle")}</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiTile
          label={t("portfolioPurchasingPower.portfolioRealReturnLabel")}
          value={`${portfolioRealReturnPct >= 0 ? "+" : ""}${portfolioRealReturnPct.toFixed(1)}%`}
          tone={portfolioRealReturnPct >= 0 ? "down" : "up"}
        />
        <KpiTile label={t("portfolioPurchasingPower.realValueLabel")} value={fmt(realValue)} />
        <KpiTile label={t("portfolioPurchasingPower.inflationDragLabel")} value={`${inflationDragPct.toFixed(1)}pp`} tone="up" />
      </div>

      <div className="glass-card rounded-xl p-4 text-sm leading-relaxed text-white/70 sm:p-5 light:text-slate-600">
        <p>
          Your portfolio&apos;s nominal return is {portfolioNominalReturnPct.toFixed(1)}%, but after inflation your real return is {portfolioRealReturnPct >= 0 ? "+" : ""}
          {portfolioRealReturnPct.toFixed(1)}% — inflation dragged {inflationDragPct.toFixed(1)} percentage points off your nominal return.
        </p>
      </div>
    </div>
  );
}
