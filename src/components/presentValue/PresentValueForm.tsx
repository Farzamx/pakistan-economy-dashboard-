"use client";

import { useLanguage } from "@/components/LanguageProvider";
import CompoundingFrequencySelect from "@/components/decisionSupportLab/CompoundingFrequencySelect";
import type { CompoundingFrequency } from "@/lib/decisionSupportLab/timeValueEngine";
import NumericInput from "@/components/inputs/NumericInput";

interface Props {
  futureValueAmount: number;
  onFutureValueChange: (value: number) => void;
  discountRatePct: number;
  onDiscountRatePctChange: (value: number) => void;
  years: number;
  onYearsChange: (value: number) => void;
  frequency: CompoundingFrequency;
  onFrequencyChange: (value: CompoundingFrequency) => void;
}

export default function PresentValueForm({
  futureValueAmount,
  onFutureValueChange,
  discountRatePct,
  onDiscountRatePctChange,
  years,
  onYearsChange,
  frequency,
  onFrequencyChange,
}: Props) {
  const { t } = useLanguage();

  return (
    <div className="glass-card grid grid-cols-1 gap-4 rounded-xl p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
      <div>
        <label htmlFor="pv-fv" className="text-label text-white/40 light:text-slate-400">
          {t("presentValue.futureValueLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
          <NumericInput
            id="pv-fv"
            min={0}
            step={1000}
            value={futureValueAmount}
            placeholder={t("decisionSupportLab.placeholderFutureValue")}
            onValueChange={onFutureValueChange}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
        </div>
      </div>

      <div>
        <label htmlFor="pv-rate" className="text-label text-white/40 light:text-slate-400">
          {t("presentValue.discountRateLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <NumericInput
            id="pv-rate"
            step={0.1}
            value={discountRatePct}
            placeholder={t("decisionSupportLab.placeholderInterestRate")}
            min={-99}
            max={1000}
            onValueChange={onDiscountRatePctChange}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
          <span className="text-sm text-white/40 light:text-slate-400">%</span>
        </div>
      </div>

      <div>
        <label htmlFor="pv-years" className="text-label text-white/40 light:text-slate-400">
          {t("presentValue.yearsLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <NumericInput
            id="pv-years"
            min={1}
            max={50}
            step={1}
            value={years}
            integer
            emptyBehavior="keep"
            onValueChange={onYearsChange}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
        </div>
      </div>

      <CompoundingFrequencySelect id="pv-compounding" label={t("presentValue.compoundingLabel")} value={frequency} onChange={onFrequencyChange} />
    </div>
  );
}
