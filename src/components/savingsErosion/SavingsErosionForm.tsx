"use client";

import { useLanguage } from "@/components/LanguageProvider";

interface Props {
  savingsAmount: number;
  onSavingsAmountChange: (value: number) => void;
  years: number;
  onYearsChange: (value: number) => void;
}

export default function SavingsErosionForm({ savingsAmount, onSavingsAmountChange, years, onYearsChange }: Props) {
  const { t } = useLanguage();

  return (
    <div className="glass-card grid grid-cols-1 gap-4 rounded-xl p-4 sm:grid-cols-2 sm:p-5">
      <div>
        <label htmlFor="se-savings" className="text-label text-white/40 light:text-slate-400">
          {t("savingsErosion.savingsLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
          <input
            id="se-savings"
            type="number"
            inputMode="decimal"
            min={0}
            step={1000}
            value={savingsAmount === 0 ? "" : savingsAmount}
            placeholder={t("decisionSupportLab.placeholderSavings")}
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              onSavingsAmountChange(isNaN(parsed) ? 0 : Math.max(0, parsed));
            }}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
        </div>
      </div>

      <div>
        <label htmlFor="se-years" className="text-label text-white/40 light:text-slate-400">
          {t("savingsErosion.yearsLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <input
            id="se-years"
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
  );
}
