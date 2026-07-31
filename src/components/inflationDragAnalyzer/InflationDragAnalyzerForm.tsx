"use client";

import { useLanguage } from "@/components/LanguageProvider";

interface Props {
  startingWealth: number;
  onStartingWealthChange: (value: number) => void;
  nominalReturnPct: number;
  onNominalReturnPctChange: (value: number) => void;
  years: number;
  onYearsChange: (value: number) => void;
}

export default function InflationDragAnalyzerForm({
  startingWealth,
  onStartingWealthChange,
  nominalReturnPct,
  onNominalReturnPctChange,
  years,
  onYearsChange,
}: Props) {
  const { t } = useLanguage();

  return (
    <div className="glass-card grid grid-cols-1 gap-4 rounded-xl p-4 sm:grid-cols-3 sm:p-5">
      <div>
        <label htmlFor="ida-wealth" className="text-label text-white/40 light:text-slate-400">
          {t("inflationDragAnalyzer.startingWealthLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
          <input
            id="ida-wealth"
            type="number"
            inputMode="decimal"
            min={0}
            step={1000}
            value={startingWealth === 0 ? "" : startingWealth}
            placeholder={t("decisionSupportLab.placeholderStartingWealth")}
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              onStartingWealthChange(isNaN(parsed) ? 0 : Math.max(0, parsed));
            }}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
        </div>
      </div>

      <div>
        <label htmlFor="ida-return" className="text-label text-white/40 light:text-slate-400">
          {t("inflationDragAnalyzer.nominalReturnLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <input
            id="ida-return"
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

      <div>
        <label htmlFor="ida-years" className="text-label text-white/40 light:text-slate-400">
          {t("inflationDragAnalyzer.yearsLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <input
            id="ida-years"
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
    </div>
  );
}
