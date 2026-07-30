"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { YearOption } from "@/lib/decisionSupportLab/purchasingPowerEngine";

interface Props {
  salary: number;
  onSalaryChange: (value: number) => void;
  years: YearOption[];
  baseYear: number;
  onBaseYearChange: (year: number) => void;
  targetYear: number;
  onTargetYearChange: (year: number) => void;
  city: string;
}

export default function SalaryPurchasingPowerForm({ salary, onSalaryChange, years, baseYear, onBaseYearChange, targetYear, onTargetYearChange, city }: Props) {
  const { t } = useLanguage();

  return (
    <div className="glass-card grid grid-cols-1 gap-4 rounded-xl p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
      <div>
        <label htmlFor="spp-salary" className="text-label text-white/40 light:text-slate-400">
          {t("salaryPurchasingPower.salaryLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
          <input
            id="spp-salary"
            type="number"
            inputMode="decimal"
            min={0}
            step={1000}
            value={salary === 0 ? "" : salary}
            placeholder="100000"
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              onSalaryChange(isNaN(parsed) ? 0 : Math.max(0, parsed));
            }}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
        </div>
      </div>

      <div>
        <label htmlFor="spp-base-year" className="text-label text-white/40 light:text-slate-400">
          {t("salaryPurchasingPower.baseYearLabel")}
        </label>
        <select
          id="spp-base-year"
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
        <label htmlFor="spp-target-year" className="text-label text-white/40 light:text-slate-400">
          {t("salaryPurchasingPower.targetYearLabel")}
        </label>
        <select
          id="spp-target-year"
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
        <label htmlFor="spp-city" className="text-label text-white/40 light:text-slate-400">
          {t("salaryPurchasingPower.cityLabel")}
        </label>
        <input
          id="spp-city"
          type="text"
          value={city}
          readOnly
          placeholder={t("salaryPurchasingPower.cityPlaceholder")}
          className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-white/70 outline-none light:text-slate-600"
        />
        <p className="mt-1 text-xs text-white/35 light:text-slate-400">{t("salaryPurchasingPower.cityDisclosureNote")}</p>
      </div>
    </div>
  );
}
