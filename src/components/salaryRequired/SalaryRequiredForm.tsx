"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { InflationSource } from "@/lib/decisionSupportLab/salaryEngine";

interface Props {
  years: number;
  onYearsChange: (value: number) => void;
  assumedRaisePct: number;
  onAssumedRaisePctChange: (value: number) => void;
  inflationSource: InflationSource;
  onInflationSourceChange: (value: InflationSource) => void;
  personalCpiAvailable: boolean;
}

export default function SalaryRequiredForm({ years, onYearsChange, assumedRaisePct, onAssumedRaisePctChange, inflationSource, onInflationSourceChange, personalCpiAvailable }: Props) {
  const { t } = useLanguage();

  return (
    <div className="glass-card grid grid-cols-1 gap-4 rounded-xl p-4 sm:grid-cols-3 sm:p-5">
      <div>
        <label htmlFor="sr-years" className="text-label text-white/40 light:text-slate-400">
          {t("salaryRequired.yearsLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <input
            id="sr-years"
            type="number"
            inputMode="numeric"
            min={1}
            max={10}
            step={1}
            value={years}
            onChange={(e) => {
              const parsed = parseInt(e.target.value, 10);
              onYearsChange(isNaN(parsed) ? 1 : Math.min(10, Math.max(1, parsed)));
            }}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
        </div>
      </div>

      <div>
        <label htmlFor="sr-raise" className="text-label text-white/40 light:text-slate-400">
          {t("salaryRequired.assumedRaiseLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <input
            id="sr-raise"
            type="number"
            inputMode="decimal"
            step={0.5}
            value={assumedRaisePct === 0 ? "" : assumedRaisePct}
            placeholder={t("decisionSupportLab.placeholderPercentage")}
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              onAssumedRaisePctChange(isNaN(parsed) ? 0 : parsed);
            }}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
          <span className="text-sm text-white/40 light:text-slate-400">%</span>
        </div>
      </div>

      <div>
        <label htmlFor="sr-source" className="text-label text-white/40 light:text-slate-400">
          {t("salaryRequired.inflationSourceLabel")}
        </label>
        <select
          id="sr-source"
          value={inflationSource}
          disabled={!personalCpiAvailable}
          onChange={(e) => onInflationSourceChange(e.target.value as InflationSource)}
          className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-white outline-none focus:border-neon-blue disabled:opacity-60 light:text-slate-900"
        >
          <option value="official">{t("salaryRequired.inflationSourceOfficial")}</option>
          {personalCpiAvailable && <option value="personal">{t("salaryRequired.inflationSourcePersonal")}</option>}
        </select>
      </div>
    </div>
  );
}
