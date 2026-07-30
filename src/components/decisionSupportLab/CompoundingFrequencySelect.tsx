"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { CompoundingFrequency } from "@/lib/decisionSupportLab/timeValueEngine";

interface Props {
  id: string;
  label: string;
  value: CompoundingFrequency;
  onChange: (value: CompoundingFrequency) => void;
}

/**
 * The one compounding-frequency <select> every Time Value of Money tool
 * (Present Value, Future Value, Compound Interest) offers — built once so
 * the six options, their order, and their i18n keys can't drift between
 * tools.
 */
export default function CompoundingFrequencySelect({ id, label, value, onChange }: Props) {
  const { t } = useLanguage();

  return (
    <div>
      <label htmlFor={id} className="text-label text-white/40 light:text-slate-400">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as CompoundingFrequency)}
        className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-white outline-none focus:border-neon-blue light:text-slate-900"
      >
        <option value="monthly">{t("decisionSupportLab.compoundingMonthly")}</option>
        <option value="quarterly">{t("decisionSupportLab.compoundingQuarterly")}</option>
        <option value="semiannual">{t("decisionSupportLab.compoundingSemiannual")}</option>
        <option value="annual">{t("decisionSupportLab.compoundingAnnual")}</option>
        <option value="daily">{t("decisionSupportLab.compoundingDaily")}</option>
        <option value="continuous">{t("decisionSupportLab.compoundingContinuous")}</option>
      </select>
    </div>
  );
}
