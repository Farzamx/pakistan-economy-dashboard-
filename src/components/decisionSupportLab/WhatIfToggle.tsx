"use client";

// "Current <value>" vs "Customize <value>" for one number a tool starts from (salary, investment, savings...). Deliberately NOT named "Scenario": Personal
// Inflation already has named saved presets (ScenarioPicker) and the Investment Scenario Simulator has its own crash/inflation-spike presets.
// This is tool-local, single-value and fully ephemeral: going back to "Current" discards the customized value without saving anything.
//
// Each caller says what the value is ("Current Salary" / "Customize Salary"), so nobody has to guess what "What-If" refers to.
import { useId } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import NumericInput from "@/components/inputs/NumericInput";
import CustomizeToggle from "@/components/decisionSupportLab/CustomizeToggle";

interface Props {
  /** Toggle wording, e.g. "Current Salary". */
  currentLabel: string;
  /** Toggle + field wording, e.g. "Customize Salary". */
  customizeLabel: string;
  currentValue: number;
  whatIfValue: number;
  onWhatIfValueChange: (value: number) => void;
  isWhatIf: boolean;
  onToggle: (isWhatIf: boolean) => void;
  formatValue?: (value: number) => string;
  /** Shown before / after the number in the edit box ("Rs", "%"). */
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
}

export default function WhatIfToggle({ currentLabel, customizeLabel, currentValue, whatIfValue, onWhatIfValueChange, isWhatIf, onToggle, formatValue, prefix, suffix, step = 1, min = 0, max }: Props) {
  const { t } = useLanguage();
  const inputId = useId();
  const format = formatValue ?? ((v: number) => v.toLocaleString("en-US"));
  const delta = whatIfValue - currentValue;
  const deltaPct = currentValue !== 0 ? (delta / Math.abs(currentValue)) * 100 : 0;

  // Customizing always starts from the current value, so the person edits something real instead of an empty box.
  const handleToggle = (custom: boolean) => {
    if (custom === isWhatIf) return;
    if (custom) onWhatIfValueChange(currentValue);
    onToggle(custom);
  };

  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <CustomizeToggle currentLabel={currentLabel} customizeLabel={customizeLabel} isCustom={isWhatIf} onChange={handleToggle} />

      {!isWhatIf ? (
        <div className="mt-3">
          <p className="text-mono-num text-lg font-semibold tabular-nums text-white light:text-slate-900">
            {format(currentValue)}
            {suffix}
          </p>
          <p className="mt-1 text-xs text-white/50 light:text-slate-500">{currentValue === 0 ? t("decisionSupportLab.customizeNotSet") : t("decisionSupportLab.customizeHint")}</p>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <label htmlFor={inputId} className="text-label text-white/40 light:text-slate-400">
            {customizeLabel}
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-neon-blue/40 px-3 py-2.5 focus-within:border-neon-blue">
            {prefix && <span className="text-sm text-white/40 light:text-slate-400">{prefix}</span>}
            <NumericInput
              id={inputId}
              step={step}
              min={min}
              max={max}
              value={whatIfValue}
              onValueChange={onWhatIfValueChange}
              className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
            />
            {suffix && <span className="text-sm text-white/40 light:text-slate-400">{suffix}</span>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p aria-live="polite" className="text-xs text-white/50 light:text-slate-500">
              {delta === 0
                ? t("decisionSupportLab.customizeSameAsCurrent")
                : `${delta > 0 ? "+" : ""}${format(delta)}${suffix ?? ""} (${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%) ${t("decisionSupportLab.customizeVsCurrent")}`}
            </p>
            <button
              type="button"
              onClick={() => {
                onWhatIfValueChange(currentValue);
                onToggle(false);
              }}
              className="text-xs font-medium text-neon-blue hover:underline"
            >
              {t("decisionSupportLab.customizeBackToCurrent")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
