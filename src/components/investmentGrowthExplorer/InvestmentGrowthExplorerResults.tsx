"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { GrowthInvestmentSlot } from "@/components/investmentGrowthExplorer/InvestmentGrowthExplorerForm";

export interface InvestmentGrowthResult extends GrowthInvestmentSlot {
  nominalEndValue: number;
  realEndValue: number;
  inflationEaten: number;
}

interface Props {
  results: InvestmentGrowthResult[];
}

export default function InvestmentGrowthExplorerResults({ results }: Props) {
  const { t } = useLanguage();
  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString("en-US")}`;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-headline text-white light:text-slate-900">{t("investmentGrowthExplorer.resultsTitle")}</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {results.map((r) => (
          <div key={r.id} className="glass-card-raised flex flex-col gap-2 rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
              <span className="text-sm font-semibold text-white light:text-slate-900">{r.name}</span>
            </div>
            <div>
              <span className="text-label text-white/40 light:text-slate-400">{t("investmentGrowthExplorer.growthTitle")}</span>
              <p className="text-mono-num text-lg font-semibold tabular-nums text-white light:text-slate-900">{fmt(r.nominalEndValue)}</p>
            </div>
            <div>
              <span className="text-label text-white/40 light:text-slate-400">{t("investmentGrowthExplorer.realWealthLabel")}</span>
              <p className="text-mono-num text-lg font-semibold tabular-nums text-emerald-400">{fmt(r.realEndValue)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
