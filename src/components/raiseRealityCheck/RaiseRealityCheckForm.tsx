"use client";

import { useLanguage } from "@/components/LanguageProvider";

interface Props {
  currentSalary: number;
  onCurrentSalaryChange: (value: number) => void;
  nominalRaisePct: number;
  onNominalRaisePctChange: (value: number) => void;
}

function NumberField({
  id,
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  placeholder,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  placeholder: string;
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
          value={value === 0 ? "" : value}
          placeholder={placeholder}
          onChange={(e) => {
            const parsed = parseFloat(e.target.value);
            onChange(isNaN(parsed) ? 0 : parsed);
          }}
          className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
        />
        {suffix && <span className="text-sm text-white/40 light:text-slate-400">{suffix}</span>}
      </div>
    </div>
  );
}

export default function RaiseRealityCheckForm({
  currentSalary,
  onCurrentSalaryChange,
  nominalRaisePct,
  onNominalRaisePctChange,
}: Props) {
  const { t } = useLanguage();

  return (
    <div className="glass-card grid grid-cols-1 gap-4 rounded-xl p-4 sm:grid-cols-2 sm:p-5">
      <NumberField
        id="rrc-salary"
        label={t("raiseRealityCheck.currentSalaryLabel")}
        value={currentSalary}
        onChange={onCurrentSalaryChange}
        prefix="Rs"
        step={1000}
        placeholder={t("decisionSupportLab.placeholderSalary")}
      />
      <NumberField
        id="rrc-raise"
        label={t("raiseRealityCheck.nominalRaiseLabel")}
        value={nominalRaisePct}
        onChange={onNominalRaisePctChange}
        suffix="%"
        step={0.5}
        placeholder={t("decisionSupportLab.placeholderPercentage")}
      />
    </div>
  );
}
