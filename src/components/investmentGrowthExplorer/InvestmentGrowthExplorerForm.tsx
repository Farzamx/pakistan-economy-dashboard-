"use client";

import { useLanguage } from "@/components/LanguageProvider";

export interface GrowthInvestmentSlot {
  id: string;
  name: string;
  nominalReturnPct: number;
  color: string;
}

interface Props {
  startingAmount: number;
  onStartingAmountChange: (value: number) => void;
  years: number;
  onYearsChange: (value: number) => void;
  investments: GrowthInvestmentSlot[];
  onInvestmentChange: (id: string, patch: Partial<GrowthInvestmentSlot>) => void;
}

export default function InvestmentGrowthExplorerForm({ startingAmount, onStartingAmountChange, years, onYearsChange, investments, onInvestmentChange }: Props) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card grid grid-cols-1 gap-4 rounded-xl p-4 sm:grid-cols-2 sm:p-5">
        <div>
          <label htmlFor="ige-amount" className="text-label text-white/40 light:text-slate-400">
            Starting Amount (PKR)
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
            <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
            <input
              id="ige-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step={1000}
              value={startingAmount === 0 ? "" : startingAmount}
              placeholder={t("decisionSupportLab.placeholderInvestmentAmount")}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                onStartingAmountChange(isNaN(parsed) ? 0 : Math.max(0, parsed));
              }}
              className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
            />
          </div>
        </div>

        <div>
          <label htmlFor="ige-years" className="text-label text-white/40 light:text-slate-400">
            {t("investmentGrowthExplorer.yearsLabel")}
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
            <input
              id="ige-years"
              type="number"
              inputMode="numeric"
              min={1}
              max={40}
              step={1}
              value={years}
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10);
                onYearsChange(isNaN(parsed) ? 1 : Math.min(40, Math.max(1, parsed)));
              }}
              className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
            />
          </div>
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
              <input
                type="number"
                inputMode="decimal"
                step={0.1}
                value={inv.nominalReturnPct === 0 ? "" : inv.nominalReturnPct}
                placeholder="0"
                aria-label={`${inv.name} nominal return`}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value);
                  onInvestmentChange(inv.id, { nominalReturnPct: isNaN(parsed) ? 0 : parsed });
                }}
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
