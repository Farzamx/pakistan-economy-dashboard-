"use client";

import { useLanguage } from "@/components/LanguageProvider";

interface Props {
  nominalReturnPct: number;
  onNominalReturnPctChange: (value: number) => void;
  taxRatePct: number;
  onTaxRatePctChange: (value: number) => void;
  years: number;
  onYearsChange: (value: number) => void;
}

export default function RealReturnDashboardForm({ nominalReturnPct, onNominalReturnPctChange, taxRatePct, onTaxRatePctChange, years, onYearsChange }: Props) {
  const { t } = useLanguage();

  return (
    <div className="glass-card grid grid-cols-1 gap-4 rounded-xl p-4 sm:grid-cols-3 sm:p-5">
      <div>
        <label htmlFor="rrd-return" className="text-label text-white/40 light:text-slate-400">
          Nominal Return (% per year)
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <input
            id="rrd-return"
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
        <label htmlFor="rrd-tax" className="text-label text-white/40 light:text-slate-400">
          Tax Rate (%, optional)
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <input
            id="rrd-tax"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.5}
            value={taxRatePct === 0 ? "" : taxRatePct}
            placeholder="0"
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              onTaxRatePctChange(isNaN(parsed) ? 0 : Math.max(0, parsed));
            }}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
          <span className="text-sm text-white/40 light:text-slate-400">%</span>
        </div>
      </div>

      <div>
        <label htmlFor="rrd-years" className="text-label text-white/40 light:text-slate-400">
          Years
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <input
            id="rrd-years"
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
