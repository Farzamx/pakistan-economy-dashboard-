"use client";

// Section 4: food vs the rest of the basket.
//
// PBS publishes no "non-food" inflation series, and PEIC holds no national food
// series. What PBS's own group data DOES support, exactly, is a split of the
// national basket into group 1 (Food & Non-Alcoholic Beverages) and groups 2–12
// (everything else): both are fixed-weight sub-aggregates of the same index, so
// they are comparable and add back up to the headline. The second one is named
// "All other groups" — never "non-food" — because PBS's food definition is wider
// than group 1 and this is not PBS's non-food measure.

import { useMemo, useState } from "react";
import { Callout, ChartFrame } from "@/components/analytics/ChartFrame";
import { ControlBar, Key, Segmented } from "@/components/analytics/controls";
import { DumbbellPlot } from "@/components/analytics/RowCharts";
import { ClusteredBars, MultiLine, type SeriesSpec } from "@/components/analytics/TimeCharts";
import { commonMonths, mergeSeries, tableRowsFor } from "@/lib/inflation/chartData";
import { alignedLatest } from "@/lib/inflation/analytics";
import { monthLabel } from "@/lib/inflation/periods";
import { formatValue } from "@/lib/analytics/scales";
import type { GroupModel } from "@/lib/inflation/viewModel";

const SERIES: SeriesSpec[] = [
  { key: "food", label: "Food & non-alcoholic beverages (group 1)", color: "blue" },
  { key: "rest", label: "All other groups (2–12)", color: "orange", dash: "6 3" },
];

type Window = "6" | "12" | "24";

export default function FoodRestSection({ groups }: { groups: GroupModel | null }) {
  const [win, setWin] = useState<Window>("12");
  const series = useMemo(() => (groups ? { food: groups.yoy[1] ?? [], rest: groups.otherYoY } : { food: [], rest: [] }), [groups]);
  const months = useMemo(() => commonMonths(series), [series]);
  const aligned = useMemo(() => alignedLatest(series), [series]);

  if (!groups || !aligned) {
    return (
      <Callout tone="limit" title="Food vs the rest of the basket is unavailable right now">
        This comparison is built from PBS&rsquo;s CPI group indices, which could not be loaded or did not pass PEIC&rsquo;s integrity checks, so nothing is drawn rather than showing figures that might not add up.
      </Callout>
    );
  }
  const shown = months.slice(-Number(win));
  const contrib = groups.contribYoY.find((r) => r.month === aligned.latestMonth);
  const foodC = contrib?.byGroup[1];

  return (
    <div className="flex flex-col gap-7">
      <Callout tone="limit" title="What this is — and is not">
        PBS publishes no non-food inflation series, so none is shown. Instead the national basket is split into <strong className="font-medium text-pe-text">Food &amp; Non-Alcoholic Beverages</strong> (PBS group 1, {formatValue(groups.weights[1], 1)}% of the basket) and <strong className="font-medium text-pe-text">all other groups</strong> (2–12, {formatValue(100 - groups.weights[1], 1)}%), both computed from PBS&rsquo;s own group indices with its fixed basket weights, so they are directly comparable and together reproduce the headline. The second is <em>not</em>{" "}
        PBS&rsquo;s &ldquo;non-food&rdquo; measure. Urban/rural food and perishable/non-perishable food are not available in PEIC&rsquo;s data.
      </Callout>

      {contrib && foodC !== undefined && (
        <p className="text-[13px] leading-relaxed text-pe-text-2">
          Of the {formatValue(contrib.total, 2)}% rise in the CPI over the twelve months to {monthLabel(contrib.month)}, food &amp; non-alcoholic beverages contributed{" "}
          <strong className="font-medium text-pe-text tabular-nums">{formatValue(foodC, 2)} percentage points</strong> and all other groups{" "}
          <strong className="font-medium text-pe-text tabular-nums">{formatValue(contrib.total - foodC, 2)}</strong>.
        </p>
      )}

      <ChartFrame
        title="Food vs the rest, month by month"
        howToRead="Two bars per month, both % year on year, computed the same way from the same index. Compare within a month."
        legend={
          <ControlBar>
            <Key items={SERIES.map((s) => ({ label: s.label, color: `var(--pe-viz-${s.color})` }))} />
            <Segmented name="food-window" label="Months shown" value={win} onChange={setWin} options={[{ value: "6", label: "6" }, { value: "12", label: "12" }, { value: "24", label: "24" }]} />
          </ControlBar>
        }
        source={`Source: PBS CPI group indices (base 2015-16), derived year-on-year · ${shown.length} months charted`}
        table={{ caption: "Year-on-year inflation: food vs all other groups", head: ["Month", ...SERIES.map((s) => s.label)], rows: tableRowsFor(series, shown, 1, "%") }}
      >
        <ClusteredBars data={mergeSeries(series, shown)} series={SERIES} ariaLabel={`Food versus all other groups, year-on-year inflation over ${shown.length} months`} />
      </ChartFrame>

      <div className="grid gap-7 lg:grid-cols-2">
        <ChartFrame
          title="Long-run trend"
          howToRead="Year-on-year inflation for the two parts of the basket since PBS's group data begins."
          legend={<Key items={SERIES.map((s) => ({ label: s.label, color: `var(--pe-viz-${s.color})` }))} />}
          source="Source: PBS CPI group indices, derived year-on-year"
          table={{ caption: "Food vs all other groups, all months", head: ["Month", ...SERIES.map((s) => s.label)], rows: tableRowsFor(series, months, 1, "%") }}
        >
          <MultiLine data={mergeSeries(series, months)} series={SERIES} height={300} ariaLabel="Long-run year-on-year inflation, food versus all other groups" />
        </ChartFrame>

        {aligned.previous && aligned.previousMonth ? (
          <ChartFrame
            title={`Change since ${monthLabel(aligned.previousMonth)}`}
            howToRead="Open dot = previous month, filled dot = latest. The figure at the right is the change in percentage points."
            source={`Source: PBS CPI group indices · ${monthLabel(aligned.previousMonth)} → ${monthLabel(aligned.latestMonth)}`}
            table={{ caption: "Previous and latest year-on-year values", head: ["Part of the basket", monthLabel(aligned.previousMonth), monthLabel(aligned.latestMonth)], rows: SERIES.map((s) => [s.label, `${(aligned.previous as Record<string, number>)[s.key].toFixed(1)}%`, `${aligned.latest[s.key].toFixed(1)}%`]) }}
          >
            <DumbbellPlot
              rows={SERIES.map((s) => ({ key: s.key, label: s.key === "food" ? "Food & beverages" : "All other groups", from: (aligned.previous as Record<string, number>)[s.key], to: aligned.latest[s.key] }))}
              fromLabel={monthLabel(aligned.previousMonth)}
              toLabel={monthLabel(aligned.latestMonth)}
              zeroBaseline={false}
              ariaLabel={`Food and all other groups, year-on-year inflation, ${monthLabel(aligned.previousMonth)} to ${monthLabel(aligned.latestMonth)}`}
            />
          </ChartFrame>
        ) : null}
      </div>
    </div>
  );
}
