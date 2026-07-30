"use client";

import { useLanguage } from "@/components/LanguageProvider";
import CompoundingFrequencySelect from "@/components/decisionSupportLab/CompoundingFrequencySelect";
import type { CompoundingFrequency } from "@/lib/decisionSupportLab/timeValueEngine";

interface Props {
  presentValueAmount: number;
  onPresentValueChange: (value: number) => void;
  annualReturnPct: number;
  onAnnualReturnPctChange: (value: number) => void;
  years: number;
  onYearsChange: (value: number) => void;
  frequency: CompoundingFrequency;
  onFrequencyChange: (value: CompoundingFrequency) => void;
}

export default function FutureValueForm({
  presentValueAmount,
  onPresentValueChange,
  annualReturnPct,
  onAnnualReturnPctChange,
  years,
  onYearsChange,
  frequency,
  onFrequencyChange,
}: Props) {
  const { t } = useLanguage();

  return (
    <div className="glass-card grid grid-cols-1 gap-4 rounded-xl p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
      <div>
        <label htmlFor="fv-pv" className="text-label text-white/40 light:text-slate-400">
          {t("futureValue.presentValueLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
          <input
            id="fv-pv"
            type="number"
            inputMode="decimal"
            min={0}
            step={1000}
            value={presentValueAmount === 0 ? "" : presentValueAmount}
            placeholder="100000"
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              onPresentValueChange(isNaN(parsed) ? 0 : Math.max(0, parsed));
            }}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
        </div>
      </div>

      <div>
        <label htmlFor="fv-return" className="text-label text-white/40 light:text-slate-400">
          {t("futureValue.annualReturnLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <input
            id="fv-return"
            type="number"
            inputMode="decimal"
            step={0.1}
            value={annualReturnPct === 0 ? "" : annualReturnPct}
            placeholder="0"
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              onAnnualReturnPctChange(isNaN(parsed) ? 0 : parsed);
            }}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
          <span className="text-sm text-white/40 light:text-slate-400">%</span>
        </div>
      </div>

      <div>
        <label htmlFor="fv-years" className="text-label text-white/40 light:text-slate-400">
          {t("futureValue.yearsLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <input
            id="fv-years"
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

      <CompoundingFrequencySelect id="fv-compounding" label={t("futureValue.compoundingLabel")} value={frequency} onChange={onFrequencyChange} />
    </div>
  );
}
