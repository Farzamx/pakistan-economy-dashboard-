"use client";

import type { ChartMode, TimeRange } from "@/lib/comparisons/comparisonTransforms";
import { useLanguage } from "@/components/LanguageProvider";

interface ComparisonControlsProps {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  chartMode: ChartMode;
  onChartModeChange: (mode: ChartMode) => void;
}


function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "bg-neon-blue/15 text-neon-blue"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ComparisonControls({
  timeRange,
  onTimeRangeChange,
  chartMode,
  onChartModeChange,
}: ComparisonControlsProps) {
  const { t } = useLanguage();
  const TIME_RANGES: { value: TimeRange; label: string }[] = [
    { value: "1y", label: t("comparisons.time1Y") },
    { value: "3y", label: t("comparisons.time3Y") },
    { value: "5y", label: t("comparisons.time5Y") },
    { value: "10y", label: t("comparisons.time10Y") },
    { value: "max", label: t("comparisons.timeMax") },
  ];
  const CHART_MODES: { value: ChartMode; label: string }[] = [
    { value: "raw", label: t("comparisons.modeRaw") },
    { value: "percentChange", label: t("comparisons.modePct") },
    { value: "baseIndex", label: t("comparisons.modeIndex") },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ToggleGroup options={TIME_RANGES} value={timeRange} onChange={onTimeRangeChange} />
      <ToggleGroup options={CHART_MODES} value={chartMode} onChange={onChartModeChange} />
    </div>
  );
}
