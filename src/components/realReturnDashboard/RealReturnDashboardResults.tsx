"use client";

import { useLanguage } from "@/components/LanguageProvider";

interface Props {
  nominalWealth: number;
  inflationLoss: number;
  taxAmount: number;
  realWealth: number;
  purchasingPowerChangePct: number;
  hasTax: boolean;
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

export default function RealReturnDashboardResults({ nominalWealth, inflationLoss, taxAmount, realWealth, purchasingPowerChangePct, hasTax }: Props) {
  const { t } = useLanguage();
  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString("en-US")}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiTile label={t("realReturnDashboard.nominalWealthLabel")} value={fmt(nominalWealth)} />
        <KpiTile label={t("realReturnDashboard.inflationLabel")} value={`-${fmt(inflationLoss)}`} tone="up" />
        <KpiTile label={t("realReturnDashboard.taxLabel")} value={`-${fmt(taxAmount)}`} tone={hasTax ? "up" : "neutral"} />
        <KpiTile label={t("realReturnDashboard.realWealthLabel")} value={fmt(realWealth)} tone="down" />
        <KpiTile label={t("realReturnDashboard.purchasingPowerChangeLabel")} value={`${purchasingPowerChangePct >= 0 ? "+" : ""}${purchasingPowerChangePct.toFixed(1)}%`} tone={purchasingPowerChangePct >= 0 ? "down" : "up"} />
      </div>

      {!hasTax && (
        <div className="rounded-lg border border-amber-400/25 bg-amber-500/10 p-3 text-xs text-amber-300">{t("realReturnDashboard.noTaxNote")}</div>
      )}
    </div>
  );
}
