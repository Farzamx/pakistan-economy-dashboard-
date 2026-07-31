"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { YearOption } from "@/lib/decisionSupportLab/purchasingPowerEngine";

interface Props {
  amount: number;
  onAmountChange: (value: number) => void;
  years: YearOption[];
  baseYear: number;
  onBaseYearChange: (year: number) => void;
  targetYear: number;
  onTargetYearChange: (year: number) => void;
}

export default function PurchasingPowerForm({ amount, onAmountChange, years, baseYear, onBaseYearChange, targetYear, onTargetYearChange }: Props) {
  const { t } = useLanguage();

  return (
    <div className="glass-card grid grid-cols-1 gap-4 rounded-xl p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
      <div>
        <label htmlFor="pp-amount" className="text-label text-white/40 light:text-slate-400">
          {t("purchasingPower.amountLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
          <input
            id="pp-amount"
            type="number"
            inputMode="decimal"
            min={0}
            step={1000}
            value={amount === 0 ? "" : amount}
            placeholder={t("decisionSupportLab.placeholderInvestmentAmount")}
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              onAmountChange(isNaN(parsed) ? 0 : Math.max(0, parsed));
            }}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
        </div>
      </div>

      <div>
        <label htmlFor="pp-base-year" className="text-label text-white/40 light:text-slate-400">
          {t("purchasingPower.baseYearLabel")}
        </label>
        <select
          id="pp-base-year"
          value={baseYear}
          onChange={(e) => onBaseYearChange(parseInt(e.target.value, 10))}
          className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-white outline-none focus:border-neon-blue light:text-slate-900"
        >
          {years.map((y) => (
            <option key={y.year} value={y.year}>
              {y.year} ({y.point.observationDate.slice(0, 7)})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="pp-target-year" className="text-label text-white/40 light:text-slate-400">
          {t("purchasingPower.targetYearLabel")}
        </label>
        <select
          id="pp-target-year"
          value={targetYear}
          onChange={(e) => onTargetYearChange(parseInt(e.target.value, 10))}
          className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-white outline-none focus:border-neon-blue light:text-slate-900"
        >
          {years.map((y) => (
            <option key={y.year} value={y.year}>
              {y.year} ({y.point.observationDate.slice(0, 7)})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="pp-source" className="text-label text-white/40 light:text-slate-400">
          {t("purchasingPower.sourceLabel")}
        </label>
        <select
          id="pp-source"
          value="pbs-national"
          disabled
          className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-white/60 outline-none light:text-slate-500"
        >
          <option value="pbs-national">{t("purchasingPower.sourceOneLabel")}</option>
        </select>
      </div>
    </div>
  );
}
