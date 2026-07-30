"use client";

import { useLanguage } from "@/components/LanguageProvider";
import SpendingCompositionDonut from "@/components/decisionSupportLab/SpendingCompositionDonut";

interface Props {
  principal: number;
  interestEarned: number;
  endingValue: number;
  effectiveAnnualRatePct: number;
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card-raised flex flex-col gap-1.5 rounded-xl p-4 sm:p-5">
      <span className="text-label text-white/40 light:text-slate-400">{label}</span>
      <span className="text-metric text-mono-num tabular-nums text-white light:text-slate-900">{value}</span>
    </div>
  );
}

export default function CompoundInterestResults({ principal, interestEarned, endingValue, effectiveAnnualRatePct }: Props) {
  const { t } = useLanguage();
  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString("en-US")}`;
  const principalPct = endingValue > 0 ? (principal / endingValue) * 100 : 0;
  const interestPct = 100 - principalPct;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-headline text-white light:text-slate-900">{t("compoundInterest.resultsTitle")}</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiTile label={t("compoundInterest.interestEarnedLabel")} value={fmt(interestEarned)} />
        <KpiTile label={t("compoundInterest.endingValueLabel")} value={fmt(endingValue)} />
        <KpiTile label={t("compoundInterest.effectiveRateLabel")} value={`${effectiveAnnualRatePct.toFixed(2)}%`} />
      </div>

      <div className="glass-card rounded-xl p-4 sm:p-5">
        <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">{t("compoundInterest.contributionBreakdownTitle")}</h3>
        <SpendingCompositionDonut
          data={[
            { label: t("compoundInterest.principalSliceLabel"), value: principalPct, color: "#4d8df7" },
            { label: t("compoundInterest.interestSliceLabel"), value: interestPct, color: "#34d399" },
          ]}
        />
      </div>
    </div>
  );
}
