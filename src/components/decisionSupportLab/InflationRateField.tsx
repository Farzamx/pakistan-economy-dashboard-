"use client";

import { useLanguage } from "@/components/LanguageProvider";

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
 * The Lab's one shared "inflation rate" control. By default it shows a
 * read-only automatically-derived rate (historical CPI average or latest
 * official CPI, depending on what the caller passes as autoValuePct) with
 * a tooltip explaining where the number came from — no typing required.
 * An "Advanced Options" disclosure reveals a "Use custom inflation
 * assumption" checkbox that, once checked, swaps in a free-editable rate
 * field. Every tool that uses inflation renders through this ONE
 * component so the automatic/override behavior can't drift between tools.
 */
export default function InflationRateField({ autoValuePct, autoLabel, tooltipText, useCustom, onUseCustomChange, customValuePct, onCustomValuePctChange }: Props) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-2">
      {!useCustom ? (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-label text-white/40 light:text-slate-400">{autoLabel}</span>
            <span
              role="img"
              aria-label={tooltipText}
              title={tooltipText}
              className="flex h-3.5 w-3.5 shrink-0 cursor-help items-center justify-center rounded-full border border-white/25 text-[9px] font-semibold text-white/50 light:border-slate-300 light:text-slate-400"
            >
              i
            </span>
          </div>
          <div className="mt-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5">
            <span className="text-mono-num text-lg font-semibold tabular-nums text-white light:text-slate-900">
              {autoValuePct !== null ? `${autoValuePct.toFixed(2)}%` : "—"}
            </span>
          </div>
        </div>
      ) : (
        <div>
          <label htmlFor="inflation-custom-input" className="text-label text-white/40 light:text-slate-400">
            {t("decisionSupportLab.customInflationLabel")}
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
            <input
              id="inflation-custom-input"
              type="number"
              inputMode="decimal"
              step={0.1}
              value={customValuePct === 0 ? "" : customValuePct}
              placeholder={t("decisionSupportLab.placeholderInflationRate")}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                onCustomValuePctChange(isNaN(parsed) ? 0 : parsed);
              }}
              className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
            />
            <span className="text-sm text-white/40 light:text-slate-400">%</span>
          </div>
        </div>
      )}

      <details className="group">
        <summary className="w-fit cursor-pointer list-none text-xs font-medium text-white/40 hover:text-neon-blue light:text-slate-400">
          <span className="inline-flex items-center gap-1">
            {t("decisionSupportLab.advancedOptions")}
            <span aria-hidden="true" className="transition-transform group-open:rotate-90">
              ›
            </span>
          </span>
        </summary>
        <label className="mt-2 flex w-fit cursor-pointer items-center gap-2 text-xs text-white/60 light:text-slate-500">
          <input
            type="checkbox"
            checked={useCustom}
            onChange={(e) => onUseCustomChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-[var(--border-subtle)] accent-neon-blue"
          />
          {t("decisionSupportLab.useCustomInflation")}
        </label>
      </details>
    </div>
  );
}
