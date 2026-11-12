"use client";

import { BUDGET_FIELD_META } from "@/lib/budget/budgetRegistry";
import { isFieldAvailableInMode, type BudgetTrendField, type TrendValueMode } from "@/lib/budget/budgetData";
import { useLanguage } from "@/components/LanguageProvider";
import Dropdown from "@/components/Dropdown";

interface BudgetControlsProps {
  selectedFields: BudgetTrendField[];
  onFieldsChange: (fields: BudgetTrendField[]) => void;
  mode: TrendValueMode;
  onModeChange: (mode: TrendValueMode) => void;
  /** All fiscal years available, oldest first. */
  fiscalYears: string[];
  rangeFrom: string;
  rangeTo: string;
  onRangeChange: (from: string, to: string) => void;
}

const ALL_FIELDS: BudgetTrendField[] = [
  "totalOutlay", "fbrTaxRevenue", "nonTaxRevenue", "provincialTransfer",
  "grantsAndTransfersOther", "federalPsdp", "defence", "debtServicing",
  "pension", "subsidies", "federalEducation", "federalHealth", "fiscalDeficitRs",
];

const MODES: { mode: TrendValueMode; label: string; hint: string }[] = [
  { mode: "nominal", label: "Nominal Rs bn", hint: "Amounts in billions of rupees at each year's own prices (not adjusted for inflation)" },
  { mode: "shareOutlay", label: "% of total outlay", hint: "Each item as a share of that year's total outlay; only items that are part of outlay" },
  { mode: "pctGdp", label: "% of GDP", hint: "Each item as a share of that year's nominal GDP" },
];

export default function BudgetControls({
  selectedFields,
  onFieldsChange,
  mode,
  onModeChange,
  fiscalYears,
  rangeFrom,
  rangeTo,
  onRangeChange,
}: BudgetControlsProps) {
  const { t } = useLanguage();
  function toggleField(field: BudgetTrendField) {
    if (selectedFields.includes(field)) {
      if (selectedFields.length === 1) return; // keep at least one selected
      onFieldsChange(selectedFields.filter((f) => f !== field));
    } else {
      onFieldsChange([...selectedFields, field]);
    }
  }
  const idxFrom = fiscalYears.indexOf(rangeFrom);
  const idxTo = fiscalYears.indexOf(rangeTo);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex flex-wrap gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1" role="group" aria-label="Value basis">
          {MODES.map((m) => (
            <button
              key={m.mode}
              type="button"
              onClick={() => onModeChange(m.mode)}
              aria-pressed={mode === m.mode}
              title={m.hint}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === m.mode
                  ? "bg-neon-blue/15 text-neon-blue"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              {m.mode === "nominal" ? t("budget.nominal") + " bn" : m.mode === "pctGdp" ? t("budget.percentOfGdp") : m.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
          <span>From</span>
          <Dropdown
            label="From fiscal year"
            value={rangeFrom}
            onChange={(v) => onRangeChange(v, fiscalYears.indexOf(v) > idxTo ? v : rangeTo)}
            options={fiscalYears.map((fy) => ({ value: fy, label: `FY${fy}` }))}
          />
          <span>to</span>
          <Dropdown
            label="To fiscal year"
            value={rangeTo}
            onChange={(v) => onRangeChange(fiscalYears.indexOf(v) < idxFrom ? v : rangeFrom, v)}
            options={fiscalYears.map((fy) => ({ value: fy, label: `FY${fy}` }))}
          />
          {(rangeFrom !== fiscalYears[0] || rangeTo !== fiscalYears[fiscalYears.length - 1]) && (
            <button
              type="button"
              onClick={() => onRangeChange(fiscalYears[0], fiscalYears[fiscalYears.length - 1])}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              All years
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Categories to plot">
        {ALL_FIELDS.map((field) => {
          const meta = BUDGET_FIELD_META[field];
          const active = selectedFields.includes(field);
          const available = isFieldAvailableInMode(field, mode);
          return (
            <button
              key={field}
              type="button"
              onClick={() => toggleField(field)}
              aria-pressed={active && available}
              disabled={!available}
              title={available ? undefined : "Not part of total outlay, so it has no share of outlay (switch basis to plot it)"}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                active && available
                  ? "border-transparent text-white"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
              style={active && available ? { backgroundColor: meta.color } : undefined}
            >
              {meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
