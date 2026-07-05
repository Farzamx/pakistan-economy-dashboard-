"use client";

import type { PerCitizenMetric } from "@/lib/provincial/provincialBudgetData";
import InfoTooltip from "@/components/InfoTooltip";
import { useLanguage } from "@/components/LanguageProvider";

interface ProvincialPerCitizenSectionProps {
  metrics: PerCitizenMetric[];
  provinceName: string;
  population: number;
}

export default function ProvincialPerCitizenSection({ metrics, provinceName, population }: ProvincialPerCitizenSectionProps) {
  const { t } = useLanguage();
  return (
    <section className="glass-card flex flex-col gap-5 rounded-2xl p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-white light:text-slate-900 sm:text-xl">
          {provinceName} — {t("provincial.perCitizenTitle")}
        </h3>
        <InfoTooltip termKey="per-citizen-spending" size="sm" />
      </div>
      <p className="text-xs text-white/50 light:text-slate-500">
        {t("provincial.populationNote")} — {(population / 1_000_000).toFixed(1)}M
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-white/5 light:border-slate-100 bg-white/[0.02] light:bg-slate-50 p-4">
            <p className="text-xs text-white/50 light:text-slate-500">{m.label}</p>
            <p className="mt-1 text-xl font-semibold text-white light:text-slate-900">
              {m.rsPerCitizen === null ? "—" : `Rs ${m.rsPerCitizen.toFixed(0)}`}
            </p>
            <p className="text-[10px] text-white/30 light:text-slate-400">{t("provincial.perCitizen")}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
