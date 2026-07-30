"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { AnnuityMode } from "@/components/annuity/AnnuityForm";

interface Props {
  mode: AnnuityMode;
  presentValueAmount: number;
  futureValueAmount: number;
  requiredContribution: number | null;
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card-raised flex flex-col gap-1.5 rounded-xl p-4 sm:p-5">
      <span className="text-label text-white/40 light:text-slate-400">{label}</span>
      <span className="text-metric text-mono-num tabular-nums text-white light:text-slate-900">{value}</span>
    </div>
  );
}

export default function AnnuityResults({ mode, presentValueAmount, futureValueAmount, requiredContribution }: Props) {
  const { t } = useLanguage();
  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString("en-US")}`;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-headline text-white light:text-slate-900">{t("annuity.resultsTitle")}</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiTile label={t("annuity.presentValueLabel")} value={fmt(presentValueAmount)} />
        <KpiTile label={t("annuity.futureValueLabel")} value={fmt(futureValueAmount)} />
        {mode === "target" && requiredContribution !== null && (
          <KpiTile label={t("annuity.requiredContributionLabel")} value={fmt(requiredContribution)} />
        )}
      </div>
    </div>
  );
}
