"use client";

// Section 2: the policy rate over time, and every change as a bar.
//
// The rate is a STEP: it holds its level until the next change, so the line is drawn as a step and the month-by-month value is the
// rate in effect at that month-end (the definition of the rate, not interpolation). The bars below are the CHANGES themselves (one bar per
// change, in percentage points), so the two charts answer different questions: "where is the rate?" and "how big were the moves?".

import { useMemo, useState } from "react";
import { Callout, ChartFrame } from "@/components/analytics/ChartFrame";
import { ControlBar, Key, Segmented } from "@/components/analytics/controls";
import { MultiLine, SignedBars, type SeriesSpec } from "@/components/analytics/TimeCharts";
import { coverageText, mergeSeries, RANGE_OPTIONS, sliceRange, tableRowsFor, type RangeKey } from "@/lib/inflation/chartData";
import { monthIndex, monthKeyOf } from "@/lib/inflation/periods";
import { formatDate, pct, shortDate, signedPp } from "@/lib/policyRate/format";
import type { PolicyRateViewModel } from "@/lib/policyRate/viewModel";

const SERIES: SeriesSpec[] = [{ key: "policy", label: "SBP policy rate", color: "purple", step: true }];

export default function HistorySection({ model }: { model: PolicyRateViewModel }) {
  const [range, setRange] = useState<RangeKey>("all");

  const policy = useMemo(() => sliceRange(model.policyMonthly, range), [model.policyMonthly, range]);
  const months = useMemo(() => policy.map((p) => p.month), [policy]);
  const changes = useMemo(() => {
    if (range === "all" || model.changes.length === 0 || !model.horizon) return model.changes;
    const newest = monthIndex(model.horizon);
    return model.changes.filter((c) => monthIndex(monthKeyOf(c.date)) > newest - Number(range));
  }, [model.changes, model.horizon, range]);

  if (model.policyMonthly.length === 0) return <Callout tone="limit" title="History is unavailable right now">The policy-rate observations could not be loaded.</Callout>;

  return (
    <div className="flex flex-col gap-7">
      <ChartFrame
        title="SBP policy rate over time"
        howToRead="The rate in effect at the end of each month. It holds its level until the next change, so it moves in steps. A percentage, not an index."
        legend={
          <ControlBar>
            <Key items={[{ label: "SBP policy rate", color: "var(--pe-viz-purple)" }]} />
            <Segmented name="rate-range" label="Time range" value={range} onChange={setRange} options={RANGE_OPTIONS} />
          </ControlBar>
        }
        source={`Source: SBP EasyData (policy rate, ${model.decisions.length} observations) · shown as the rate in effect at each month-end · ${coverageText(model.policyMonthly)}`}
        table={{ caption: "Policy rate in effect, by month", head: ["Month", "Policy rate"], rows: tableRowsFor({ policy }, months, 2, "%") }}
      >
        <MultiLine data={mergeSeries({ policy }, months)} series={SERIES} decimals={2} height={340} ariaLabel={`SBP policy rate over time, ${coverageText(policy)}`} />
      </ChartFrame>

      <ChartFrame
        title="Every rate change"
        howToRead="Each bar is one change in the policy rate, in percentage points. Orange bars are increases; teal bars are cuts. The bar's height is the size of the move, not the level of the rate."
        legend={<Key items={[{ label: "Increase", color: "var(--pe-viz-orange)" }, { label: "Cut", color: "var(--pe-viz-teal)" }]} />}
        source={`Source: derived from the SBP policy-rate history · ${changes.length} change${changes.length === 1 ? "" : "s"} shown · dates are those recorded in SBP's series`}
        table={{ caption: "Rate changes", head: ["Date", "Change (pp)", "From", "To"], rows: changes.map((c) => [formatDate(c.date), signedPp(c.change), pct(c.from), pct(c.to)]) }}
      >
        <SignedBars
          data={changes.map((c) => ({ period: shortDate(c.date), value: c.change }))}
          metric="Change in the policy rate"
          unit=" pp"
          decimals={2}
          positive="orange"
          negative="teal"
          height={280}
          ariaLabel={`Bar chart of ${changes.length} policy-rate changes in percentage points`}
        />
      </ChartFrame>
    </div>
  );
}
