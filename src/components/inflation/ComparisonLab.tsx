"use client";

// Section 8: compare any two months.
//
// The fixed before-and-after charts elsewhere on the page always compare the
// latest month with the one before it. This lets the reader pick ANY two months
// and see the same measures side by side (dumbbell) and ranked at the later one
// (dot plot). Both months must have a reading for a row to be drawn; a row with
// a missing month shows a gap, not a made-up value.

import { useMemo, useState } from "react";
import { Callout, ChartFrame } from "@/components/analytics/ChartFrame";
import { ControlBar, Segmented, Select } from "@/components/analytics/controls";
import { DotPlot, DumbbellPlot } from "@/components/analytics/RowCharts";
import { rankDescending } from "@/lib/inflation/analytics";
import { commonMonths } from "@/lib/inflation/chartData";
import { groupMonths, groupRatesAt, monthOptions, valueAt } from "@/lib/inflation/groupViews";
import { monthLabel, shiftMonth, type MonthKey, type MonthlyPoint } from "@/lib/inflation/periods";
import { formatValue } from "@/lib/analytics/scales";
import type { GroupModel } from "@/lib/inflation/viewModel";

type Mode = "measures" | "groups";

export default function ComparisonLab({ headline, core, food, groups }: { headline: MonthlyPoint[]; core: MonthlyPoint[]; food: MonthlyPoint[]; groups: GroupModel | null }) {
  const [mode, setMode] = useState<Mode>("measures");
  const measureMonths = useMemo(() => commonMonths({ headline, core, food }), [headline, core, food]);
  const gMonths = useMemo(() => (groups ? groupMonths(groups) : []), [groups]);
  const months = mode === "measures" ? measureMonths : gMonths;

  // Selections are kept per mode, falling back to sensible defaults when a mode's month list changes.
  const [sel, setSel] = useState<Record<Mode, { from?: MonthKey; to?: MonthKey }>>({ measures: {}, groups: {} });
  const latest = months[months.length - 1];
  const to = sel[mode].to && months.includes(sel[mode].to as MonthKey) ? (sel[mode].to as MonthKey) : latest;
  const fallbackFrom = months.includes(shiftMonth(to ?? "2000-01", -12)) ? shiftMonth(to, -12) : months[0];
  const from = sel[mode].from && months.includes(sel[mode].from as MonthKey) ? (sel[mode].from as MonthKey) : fallbackFrom;
  const setFrom = (v: MonthKey) => setSel((s) => ({ ...s, [mode]: { ...s[mode], from: v } }));
  const setTo = (v: MonthKey) => setSel((s) => ({ ...s, [mode]: { ...s[mode], to: v } }));

  const modeOptions = [
    { value: "measures" as const, label: "Headline, core, food", disabled: measureMonths.length === 0 },
    { value: "groups" as const, label: "CPI groups", disabled: !groups },
  ];

  if (!months.length || !to || !from) {
    return <Callout tone="limit" title="Nothing to compare">The selected set has no months with data in PEIC.</Callout>;
  }

  const rows =
    mode === "measures"
      ? [
          { key: "headline", label: "Headline (national)", pts: headline },
          { key: "core", label: "Core NFNE (urban)", pts: core },
          { key: "food", label: "Food (urban)", pts: food },
        ].map((r) => ({ key: r.key, label: r.label, from: valueAt(r.pts, from), to: valueAt(r.pts, to) }))
      : groups
        ? groupRatesAt(groups, to).map((g) => ({ key: String(g.groupNo), label: g.short, from: valueAt(groups.yoy[g.groupNo], from), to: g.value }))
        : [];
  const ranked = [...rankDescending(rows.filter((r) => r.to !== null), (r) => r.to as number), ...rows.filter((r) => r.to === null)];

  return (
    <div className="flex flex-col gap-5">
      <ControlBar>
        <Segmented name="lab-mode" label="Compare" value={mode} onChange={setMode} options={modeOptions} />
        <Select id="lab-from" label="From month" value={from} onChange={setFrom} options={monthOptions(months.filter((m) => m <= to))} />
        <Select id="lab-to" label="To month" value={to} onChange={setTo} options={monthOptions(months)} />
      </ControlBar>

      {from === to ? (
        <Callout tone="limit" title="Pick two different months">Choose an earlier &ldquo;From&rdquo; month than the &ldquo;To&rdquo; month to see a change.</Callout>
      ) : (
        <div className="grid gap-7 lg:grid-cols-2">
          <ChartFrame
            title={`${monthLabel(from)} → ${monthLabel(to)}`}
            howToRead="Each line joins a reading in the earlier month (open dot) to the same measure in the later month (filled dot). The figure at the right is the change in percentage points. All values are % year on year."
            source={`Source: ${mode === "measures" ? "SBP EasyData / PBS, published" : "PBS CPI group indices, derived"} year-on-year · ${monthLabel(from)} and ${monthLabel(to)}`}
            table={{ caption: "Selected months", head: ["Series", monthLabel(from), monthLabel(to)], rows: ranked.map((r) => [r.label, r.from === null ? null : `${formatValue(r.from, 2)}%`, r.to === null ? null : `${formatValue(r.to, 2)}%`]) }}
          >
            <DumbbellPlot rows={ranked} fromLabel={monthLabel(from)} toLabel={monthLabel(to)} zeroBaseline={false} ariaLabel={`Dumbbell plot comparing ${monthLabel(from)} with ${monthLabel(to)}`} />
          </ChartFrame>
          <ChartFrame
            title={`Ranked in ${monthLabel(to)}`}
            howToRead="The later month on its own, highest first, for a precise read of each value."
            source={`Source: as left · ${monthLabel(to)}`}
          >
            <DotPlot rows={ranked.map((r) => ({ key: r.key, label: r.label, value: r.to }))} ariaLabel={`Dot plot of values in ${monthLabel(to)}`} />
          </ChartFrame>
        </div>
      )}
    </div>
  );
}
