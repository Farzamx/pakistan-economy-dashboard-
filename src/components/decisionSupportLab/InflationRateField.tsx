"use client";

import { useLanguage } from "@/components/LanguageProvider";
import NumericInput from "@/components/inputs/NumericInput";
import CustomizeToggle from "@/components/decisionSupportLab/CustomizeToggle";

interface Props {
  /** The automatically-derived rate — either an average annual rate from historical CPI (when a start/end period is selected) or the latest official CPI YoY rate (when projecting forward). Null when no automatic value could be derived (e.g. historical data doesn't cover the selected range) — the field falls back to asking for the rate directly in that case. */
  autoValuePct: number | null;
  /** e.g. "Average Inflation (2021–2026)" or "Official Inflation (Latest)". */
  autoLabel: string;
  /** Short explanation shown in the info tooltip, e.g. "Calculated automatically from official historical CPI data." */
  tooltipText: string;
  useCustom: boolean;
  onUseCustomChange: (value: boolean) => void;
  customValuePct: number;
  onCustomValuePctChange: (value: number) => void;
}

/**
 * The Lab's one shared "inflation rate" control. "Current Inflation Rate"
 * shows the automatically-derived rate (historical CPI average or latest
 * official CPI, depending on what the caller passes as autoValuePct) with a
 * tooltip explaining where the number came from — no typing required.
 * "Customize Inflation Rate" swaps in an editable field that starts from that
 * same rate, and a link returns to it. Every tool that uses inflation renders
 * through this ONE component so the automatic/override behavior can't drift
 * between tools.
 */
export default function InflationRateField({ autoValuePct, autoLabel, tooltipText, useCustom, onUseCustomChange, customValuePct, onCustomValuePctChange }: Props) {
  const { t } = useLanguage();
  const autoText = autoValuePct !== null ? `${autoValuePct.toFixed(2)}%` : "—";

  const handleChange = (custom: boolean) => {
    if (custom === useCustom) return;
    // Start from the rate the tool is already using, so the box holds something real to edit.
    if (custom && autoValuePct !== null) onCustomValuePctChange(Number(autoValuePct.toFixed(2)));
    onUseCustomChange(custom);
  };

  return (
    <div className="flex flex-col gap-3">
      <CustomizeToggle currentLabel={t("decisionSupportLab.currentInflationRate")} customizeLabel={t("decisionSupportLab.customizeInflationRate")} isCustom={useCustom} onChange={handleChange} />

      {!useCustom ? (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-label text-white/40 light:text-slate-400">{autoLabel}</span>
            <span
              role="img"
              aria-label={tooltipText}
              title={tooltipText}
              className="flex h-3.5 w-3.5 shrink-0 cursor-help items-center justify-center rounded-full border border-white/25 text-[10px] font-semibold text-white/50 light:border-slate-300 light:text-slate-400"
            >
              i
            </span>
          </div>
          <div className="mt-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5">
            <span className="text-mono-num text-lg font-semibold tabular-nums text-white light:text-slate-900">{autoText}</span>
          </div>
          <p className="mt-1.5 text-xs text-white/50 light:text-slate-500">{t("decisionSupportLab.customizeHint")}</p>
        </div>
      ) : (
        <div>
          <label htmlFor="inflation-custom-input" className="text-label text-white/40 light:text-slate-400">
            {t("decisionSupportLab.customInflationLabel")}
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-neon-blue/40 px-3 py-2.5 focus-within:border-neon-blue">
            <NumericInput
              id="inflation-custom-input"
              step={0.1}
              min={-99}
              max={1000}
              value={customValuePct}
              placeholder={t("decisionSupportLab.placeholderInflationRate")}
              onValueChange={onCustomValuePctChange}
              className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
            />
            <span className="text-sm text-white/40 light:text-slate-400">%</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className="text-xs text-white/50 light:text-slate-500">{t("decisionSupportLab.customizeHint")}</p>
            <button type="button" onClick={() => onUseCustomChange(false)} className="text-xs font-medium text-neon-blue hover:underline">
              {t("decisionSupportLab.customizeBackToCurrent")} ({autoText})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
