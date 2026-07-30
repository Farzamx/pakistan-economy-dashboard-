"use client";

import { useLanguage } from "@/components/LanguageProvider";

interface Props {
  ratePct: number;
  onRatePctChange: (value: number) => void;
  years: number;
  onYearsChange: (value: number) => void;
}

export default function DiscountFactorExplorerForm({ ratePct, onRatePctChange, years, onYearsChange }: Props) {
  const { t } = useLanguage();

  return (
    <div className="glass-card flex flex-col gap-5 rounded-xl p-4 sm:p-5">
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="dfe-rate" className="text-label text-white/40 light:text-slate-400">
            {t("discountFactorExplorer.rateLabel")}
          </label>
          <span className="text-mono-num text-sm font-semibold text-neon-blue">{ratePct.toFixed(1)}%</span>
        </div>
        <input
          id="dfe-rate"
          type="range"
          min={0}
          max={30}
          step={0.5}
          value={ratePct}
          onChange={(e) => onRatePctChange(parseFloat(e.target.value))}
          className="mt-2 w-full accent-[var(--neon-blue,#4d8df7)]"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="dfe-years" className="text-label text-white/40 light:text-slate-400">
            {t("discountFactorExplorer.yearsLabel")}
          </label>
          <span className="text-mono-num text-sm font-semibold text-neon-blue">{years}</span>
        </div>
        <input
          id="dfe-years"
          type="range"
          min={1}
          max={40}
          step={1}
          value={years}
          onChange={(e) => onYearsChange(parseInt(e.target.value, 10))}
          className="mt-2 w-full accent-[var(--neon-blue,#4d8df7)]"
        />
      </div>
    </div>
  );
}
