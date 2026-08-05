"use client";

import { useLanguage } from "@/components/LanguageProvider";

interface Props {
  nominalGain: number;
  realGain: number;
  purchasingPowerChangePct: number;
  inflationCost: number;
}

function KpiTile({ label, value, tone, caption }: { label: string; value: string; tone?: "up" | "down" | "neutral"; caption?: string }) {
  const toneColor = tone === "up" ? "text-rose-400" : tone === "down" ? "text-emerald-400" : "text-white light:text-slate-900";
  // Section D4: sign is never color-alone — a rose/emerald value is always
  // paired with an arrow glyph and a plain-language caption underneath.
  const arrow = tone === "up" ? "↑" : tone === "down" ? "↓" : null;
  return (
    <div className="glass-card-raised flex flex-col gap-1.5 rounded-xl p-4 sm:p-5">
      <span className="text-label text-white/40 light:text-slate-400">{label}</span>
      <span className={`text-metric text-mono-num tabular-nums ${toneColor}`}>
        {arrow && (
          <span aria-hidden="true" className="mr-1">
            {arrow}
          </span>
        )}
        {value}
      </span>
      {caption && <span className="text-xs text-white/55 light:text-slate-500">{caption}</span>}
    </div>
  );
}

export default function RealReturnCalculatorResults({ nominalGain, realGain, purchasingPowerChangePct, inflationCost }: Props) {
  const { t } = useLanguage();
  const fmt = (n: number) => `${n < 0 ? "-" : ""}Rs ${Math.round(Math.abs(n)).toLocaleString("en-US")}`;

  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      <h2 className="text-headline text-white light:text-slate-900">{t("realReturnCalculator.resultsTitle")}</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={t("realReturnCalculator.nominalGainLabel")} value={fmt(nominalGain)} />
        <KpiTile
          label={t("realReturnCalculator.realGainLabel")}
          value={fmt(realGain)}
          tone={realGain >= 0 ? "down" : "up"}
          caption={realGain >= 0 ? "Grew after inflation" : "Lost value after inflation"}
        />
        <KpiTile
          label={t("realReturnCalculator.purchasingPowerChangeLabel")}
          value={`${purchasingPowerChangePct >= 0 ? "+" : ""}${purchasingPowerChangePct.toFixed(1)}%`}
          tone={purchasingPowerChangePct >= 0 ? "down" : "up"}
          caption={`Your money could buy ${Math.abs(purchasingPowerChangePct).toFixed(1)}% ${purchasingPowerChangePct >= 0 ? "more" : "less"}`}
        />
        <KpiTile label={t("realReturnCalculator.inflationCostLabel")} value={fmt(inflationCost)} tone="up" caption="Lost to inflation" />
      </div>
    </div>
  );
}
