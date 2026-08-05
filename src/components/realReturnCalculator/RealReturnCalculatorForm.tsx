"use client";

import { useLanguage } from "@/components/LanguageProvider";

interface Props {
  entryYear: number;
  onEntryYearChange: (value: number) => void;
  exitYear: number;
  onExitYearChange: (value: number) => void;
  nominalReturnPct: number;
  onNominalReturnPctChange: (value: number) => void;
}

export default function RealReturnCalculatorForm({ entryYear, onEntryYearChange, exitYear, onExitYearChange, nominalReturnPct, onNominalReturnPctChange }: Props) {
  const { t } = useLanguage();

  return (
    <div className="glass-card grid grid-cols-1 gap-4 rounded-xl p-4 sm:grid-cols-3 sm:p-5">
      <div>
        <label htmlFor="rrc-entry" className="text-label text-white/40 light:text-slate-400">
          {t("realReturnCalculator.entryYearLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <input
            id="rrc-entry"
            type="number"
            inputMode="numeric"
            step={1}
            value={entryYear}
            onChange={(e) => {
              const parsed = parseInt(e.target.value, 10);
              if (!isNaN(parsed)) onEntryYearChange(parsed);
            }}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
        </div>
      </div>

      <div>
        <label htmlFor="rrc-exit" className="text-label text-white/40 light:text-slate-400">
          {t("realReturnCalculator.exitYearLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <input
            id="rrc-exit"
            type="number"
            inputMode="numeric"
            step={1}
            value={exitYear}
            onChange={(e) => {
              const parsed = parseInt(e.target.value, 10);
              if (!isNaN(parsed)) onExitYearChange(parsed);
            }}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
        </div>
      </div>

      <div>
        <label htmlFor="rrc-nominal" className="text-label text-white/40 light:text-slate-400">
          {t("realReturnCalculator.nominalReturnLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <input
            id="rrc-nominal"
            type="number"
            inputMode="decimal"
            step={0.1}
            value={nominalReturnPct === 0 ? "" : nominalReturnPct}
            placeholder={t("decisionSupportLab.placeholderInterestRate")}
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              onNominalReturnPctChange(isNaN(parsed) ? 0 : parsed);
            }}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
          <span className="text-sm text-white/40 light:text-slate-400">%</span>
        </div>
      </div>
    </div>
  );
}
