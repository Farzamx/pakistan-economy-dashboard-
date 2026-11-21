"use client";

import { useLanguage } from "@/components/LanguageProvider";
import NumericInput from "@/components/inputs/NumericInput";

export type LoanPaymentFrequency = "monthly" | "quarterly" | "semiannual" | "annual";

export const LOAN_PAYMENTS_PER_YEAR: Record<LoanPaymentFrequency, number> = {
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  annual: 1,
};

interface Props {
  loanAmount: number;
  onLoanAmountChange: (value: number) => void;
  ratePct: number;
  onRatePctChange: (value: number) => void;
  termYears: number;
  onTermYearsChange: (value: number) => void;
  frequency: LoanPaymentFrequency;
  onFrequencyChange: (value: LoanPaymentFrequency) => void;
}

export default function LoanEmiForm({ loanAmount, onLoanAmountChange, ratePct, onRatePctChange, termYears, onTermYearsChange, frequency, onFrequencyChange }: Props) {
  const { t } = useLanguage();

  return (
    <div className="glass-card grid grid-cols-1 gap-4 rounded-xl p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
      <div>
        <label htmlFor="le-amount" className="text-label text-white/40 light:text-slate-400">
          {t("loanEmi.loanAmountLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
          <NumericInput
            id="le-amount"
            min={0}
            step={10000}
            value={loanAmount}
            placeholder={t("decisionSupportLab.placeholderLoanAmount")}
            onValueChange={onLoanAmountChange}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
        </div>
      </div>

      <div>
        <label htmlFor="le-rate" className="text-label text-white/40 light:text-slate-400">
          {t("loanEmi.rateLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <NumericInput
            id="le-rate"
            step={0.1}
            value={ratePct}
            placeholder={t("decisionSupportLab.placeholderInterestRate")}
            min={-99}
            max={1000}
            onValueChange={onRatePctChange}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
          <span className="text-sm text-white/40 light:text-slate-400">%</span>
        </div>
      </div>

      <div>
        <label htmlFor="le-term" className="text-label text-white/40 light:text-slate-400">
          {t("loanEmi.termYearsLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <NumericInput
            id="le-term"
            min={1}
            max={35}
            step={1}
            value={termYears}
            integer
            emptyBehavior="keep"
            onValueChange={onTermYearsChange}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
        </div>
      </div>

      <div>
        <label htmlFor="le-frequency" className="text-label text-white/40 light:text-slate-400">
          {t("loanEmi.paymentFrequencyLabel")}
        </label>
        <select
          id="le-frequency"
          value={frequency}
          onChange={(e) => onFrequencyChange(e.target.value as LoanPaymentFrequency)}
          className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-white outline-none focus:border-neon-blue light:text-slate-900"
        >
          <option value="monthly">{t("decisionSupportLab.compoundingMonthly")}</option>
          <option value="quarterly">{t("decisionSupportLab.compoundingQuarterly")}</option>
          <option value="semiannual">{t("decisionSupportLab.compoundingSemiannual")}</option>
          <option value="annual">{t("decisionSupportLab.compoundingAnnual")}</option>
        </select>
      </div>
    </div>
  );
}
