"use client";

import { useLanguage } from "@/components/LanguageProvider";

interface Props {
  annualRaisePct: number;
  onAnnualRaisePctChange: (value: number) => void;
  years: number;
  onYearsChange: (value: number) => void;
}

function Field({
  id,
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  min,
  max,
  placeholder = "0",
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-label text-white/40 light:text-slate-400">
        {label}
      </label>
      <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
        {prefix && <span className="text-sm text-white/40 light:text-slate-400">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={value === 0 ? "" : value}
          placeholder={placeholder}
          onChange={(e) => {
            const parsed = parseFloat(e.target.value);
            let next = isNaN(parsed) ? 0 : parsed;
            if (min !== undefined) next = Math.max(min, next);
            if (max !== undefined) next = Math.min(max, next);
            onChange(next);
          }}
          className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
        />
        {suffix && <span className="text-sm text-white/40 light:text-slate-400">{suffix}</span>}
      </div>
    </div>
  );
}

export default function FutureSalaryProjectionForm({ annualRaisePct, onAnnualRaisePctChange, years, onYearsChange }: Props) {
  const { t } = useLanguage();

  return (
    <div className="glass-card grid grid-cols-1 gap-4 rounded-xl p-4 sm:grid-cols-2 sm:p-5">
      <Field id="fsp-raise" label={t("futureSalaryProjection.annualRaiseLabel")} value={annualRaisePct} onChange={onAnnualRaisePctChange} suffix="%" step={0.5} placeholder={t("decisionSupportLab.placeholderPercentage")} />
      <Field id="fsp-years" label={t("futureSalaryProjection.yearsLabel")} value={years} onChange={onYearsChange} step={1} min={1} max={40} />
    </div>
  );
}
