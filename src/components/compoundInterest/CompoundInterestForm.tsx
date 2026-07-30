"use client";

import { useLanguage } from "@/components/LanguageProvider";
import CompoundingFrequencySelect from "@/components/decisionSupportLab/CompoundingFrequencySelect";
import type { CompoundingFrequency } from "@/lib/decisionSupportLab/timeValueEngine";

interface Props {
  principal: number;
  onPrincipalChange: (value: number) => void;
  ratePct: number;
  onRatePctChange: (value: number) => void;
  years: number;
  onYearsChange: (value: number) => void;
  frequency: CompoundingFrequency;
  onFrequencyChange: (value: CompoundingFrequency) => void;
}

export default function CompoundInterestForm({ principal, onPrincipalChange, ratePct, onRatePctChange, years, onYearsChange, frequency, onFrequencyChange }: Props) {
  const { t } = useLanguage();

  return (
    <div className="glass-card grid grid-cols-1 gap-4 rounded-xl p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
      <div>
        <label htmlFor="ci-principal" className="text-label text-white/40 light:text-slate-400">
          {t("compoundInterest.principalLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
          <input
            id="ci-principal"
            type="number"
            inputMode="decimal"
            min={0}
            step={1000}
            value={principal === 0 ? "" : principal}
            placeholder="100000"
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              onPrincipalChange(isNaN(parsed) ? 0 : Math.max(0, parsed));
            }}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
        </div>
      </div>

      <div>
        <label htmlFor="ci-rate" className="text-label text-white/40 light:text-slate-400">
          {t("compoundInterest.rateLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <input
            id="ci-rate"
            type="number"
            inputMode="decimal"
            step={0.1}
            value={ratePct === 0 ? "" : ratePct}
            placeholder="0"
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              onRatePctChange(isNaN(parsed) ? 0 : parsed);
            }}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
          <span className="text-sm text-white/40 light:text-slate-400">%</span>
        </div>
      </div>

      <div>
        <label htmlFor="ci-years" className="text-label text-white/40 light:text-slate-400">
          {t("compoundInterest.yearsLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <input
            id="ci-years"
            type="number"
            inputMode="numeric"
            min={1}
            max={50}
            step={1}
            value={years}
            onChange={(e) => {
              const parsed = parseInt(e.target.value, 10);
              onYearsChange(isNaN(parsed) ? 1 : Math.min(50, Math.max(1, parsed)));
            }}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
        </div>
      </div>

      <CompoundingFrequencySelect id="ci-compounding" label={t("compoundInterest.compoundingLabel")} value={frequency} onChange={onFrequencyChange} />
    </div>
  );
}
