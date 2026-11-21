"use client";

import { useLanguage } from "@/components/LanguageProvider";
import NumericInput from "@/components/inputs/NumericInput";

export interface GrowthInvestmentSlot {
  id: string;
  name: string;
  nominalReturnPct: number;
  color: string;
}

interface Props {
  years: number;
  onYearsChange: (value: number) => void;
  investments: GrowthInvestmentSlot[];
  onInvestmentChange: (id: string, patch: Partial<GrowthInvestmentSlot>) => void;
}

export default function InvestmentGrowthExplorerForm({ years, onYearsChange, investments, onInvestmentChange }: Props) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card rounded-xl p-4 sm:p-5">
        <label htmlFor="ige-years" className="text-label text-white/40 light:text-slate-400">
          {t("investmentGrowthExplorer.yearsLabel")}
        </label>
        <div className="mt-1.5 flex max-w-xs items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <NumericInput
            id="ige-years"
            min={1}
            max={40}
            step={1}
            value={years}
            integer
            emptyBehavior="keep"
            onValueChange={onYearsChange}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
        </div>
      </div>

      <div className="glass-card flex flex-col gap-3 rounded-xl p-4 sm:p-5">
        {investments.map((inv) => (
          <div key={inv.id} className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: inv.color }} />
              <input
                type="text"
                value={inv.name}
                onChange={(e) => onInvestmentChange(inv.id, { name: e.target.value })}
                aria-label={`Investment name`}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm text-white outline-none focus:border-neon-blue light:text-slate-900"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2">
              <NumericInput
                step={0.1}
                value={inv.nominalReturnPct}
                placeholder="0"
                aria-label={`${inv.name} nominal return`}
                min={-99}
                max={1000}
                onValueChange={(v) => onInvestmentChange(inv.id, { nominalReturnPct: v })}
                className="text-mono-num w-full bg-transparent text-sm font-semibold tabular-nums text-white outline-none light:text-slate-900"
              />
              <span className="text-xs text-white/40 light:text-slate-400">% return</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
