"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { presentValueWithFrequency, type CompoundingFrequency } from "@/lib/decisionSupportLab/timeValueEngine";

interface Props {
  presentValueAmount: number;
  discountFactorValue: number;
  realValueAmount: number;
  futureValueAmount: number;
  discountRatePct: number;
  years: number;
  frequency: CompoundingFrequency;
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card-raised flex flex-col gap-1.5 rounded-xl p-4 sm:p-5">
      <span className="text-label text-white/40 light:text-slate-400">{label}</span>
      <span className="text-metric text-mono-num tabular-nums text-white light:text-slate-900">{value}</span>
    </div>
  );
}

const SENSITIVITY_DELTAS_PCT = [-2, -1, 0, 1, 2];

export default function PresentValueResults({ presentValueAmount, discountFactorValue, realValueAmount, futureValueAmount, discountRatePct, years, frequency }: Props) {
  const { t } = useLanguage();
  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString("en-US")}`;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-headline text-white light:text-slate-900">{t("presentValue.resultsTitle")}</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiTile label={t("presentValue.presentValueLabel")} value={fmt(presentValueAmount)} />
        <KpiTile label={t("presentValue.discountFactorLabel")} value={discountFactorValue.toFixed(4)} />
        <KpiTile label={t("presentValue.realValueLabel")} value={fmt(realValueAmount)} />
      </div>

      <div className="glass-card overflow-x-auto rounded-xl p-4 sm:p-5">
        <h3 className="mb-3 text-sm font-semibold text-white light:text-slate-900">{t("presentValue.sensitivityTitle")}</h3>
        <table className="text-mono-num w-full min-w-[420px] text-sm tabular-nums">
          <thead>
            <tr className="text-left text-xs text-white/40 light:text-slate-400">
              <th className="py-1.5 pr-4 font-medium">{t("presentValue.discountRateLabel")}</th>
              <th className="py-1.5 font-medium">{t("presentValue.presentValueLabel")}</th>
            </tr>
          </thead>
          <tbody>
            {SENSITIVITY_DELTAS_PCT.map((delta) => {
              const rate = Math.max(0, discountRatePct + delta);
              const pv = presentValueWithFrequency(futureValueAmount, rate, years, frequency);
              const isBase = delta === 0;
              return (
                <tr key={delta} className={isBase ? "text-neon-blue" : "text-white/70 light:text-slate-600"}>
                  <td className="py-1.5 pr-4 font-semibold">{rate.toFixed(1)}%</td>
                  <td className="py-1.5">{fmt(pv)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
