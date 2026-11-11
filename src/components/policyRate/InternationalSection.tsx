"use client";

// Section 9: Pakistan's policy rate against the US federal funds rate.
//
// The ONLY like-for-like international series PEIC holds is the US effective federal funds rate (the Federal Reserve's policy-rate
// counterpart, from FRED, monthly). Policy rates for India, Bangladesh, Sri Lanka or any other country are NOT held, so no wider
// comparison is drawn and none is implied. The gap is a difference between two central-bank policy rates, in percentage points. It is
// not a forecast of the exchange rate or of capital flows, and it does not compare real rates (the two countries' inflation differs).

import { useMemo, useState } from "react";
import { Callout, ChartFrame } from "@/components/analytics/ChartFrame";
import { ControlBar, Key, Segmented } from "@/components/analytics/controls";
import { MultiLine, SignedBars, type SeriesSpec } from "@/components/analytics/TimeCharts";
import StatStrip from "@/components/policyRate/StatStrip";
import { coverageText, mergeSeries, RANGE_OPTIONS, sliceRange, tableRowsFor, toBars, unionMonths, type RangeKey } from "@/lib/inflation/chartData";
import { monthLabel } from "@/lib/inflation/periods";
import { signedPp } from "@/lib/policyRate/format";
import type { PolicyRateViewModel } from "@/lib/policyRate/viewModel";

const SERIES: SeriesSpec[] = [
  { key: "pak", label: "SBP policy rate (Pakistan)", color: "purple", step: true },
  { key: "us", label: "US effective federal funds rate", color: "blue" },
];

export default function InternationalSection({ model }: { model: PolicyRateViewModel }) {
  const [range, setRange] = useState<RangeKey>("60");
  const all = useMemo(() => ({ pak: model.policyMonthly, us: model.fedFunds }), [model.policyMonthly, model.fedFunds]);
  const sliced = useMemo(() => Object.fromEntries(Object.entries(all).map(([k, v]) => [k, sliceRange(v, range)])), [all, range]);
  const months = useMemo(() => unionMonths(sliced), [sliced]);
  const gap = useMemo(() => sliceRange(model.usDifferential, range), [model.usDifferential, range]);

  if (model.policyMonthly.length === 0 || model.fedFunds.length === 0 || model.usDifferential.length === 0) {
    return <Callout tone="limit" title="The US comparison is unavailable right now">It needs the policy-rate history and the US federal funds history, and one of them could not be loaded.</Callout>;
  }
  const latest = model.usDifferential[model.usDifferential.length - 1];
  const g = model.usGapSummary;
  const usLatest = model.fedFunds[model.fedFunds.length - 1];

  return (
    <div className="flex flex-col gap-7">
      <Callout tone="limit" title="One comparable country only">
        The only other central-bank policy rate PEIC holds is the US federal funds rate. Policy rates for India, Bangladesh, Sri Lanka or other peers are not held, so they are not shown. The gap below is a difference between two policy rates; it does not compare real rates (each country&rsquo;s inflation differs) and says nothing about the exchange rate.
      </Callout>

      {g && (
        <StatStrip
          label="Pakistan against the United States"
          items={[
            { label: "Gap, Pakistan minus US", value: `${signedPp(g.latest.value)} pp`, detail: `${monthLabel(g.latest.month)}: SBP policy rate against the US effective federal funds rate` },
            { label: "US federal funds rate", value: `${usLatest.value.toFixed(2)}%`, detail: `${monthLabel(usLatest.month)}, effective rate, monthly` },
            { label: "Highest gap", value: `${signedPp(g.highest.value)} pp`, detail: `${monthLabel(g.highest.month)}, of ${g.months} months in both series` },
            { label: "Lowest gap", value: `${signedPp(g.lowest.value)} pp`, detail: monthLabel(g.lowest.month) },
            { label: "Months Pakistan above the US", value: `${g.above} of ${g.months}`, detail: `${monthLabel(model.usDifferential[0].month)} to ${monthLabel(g.latest.month)}` },
          ]}
        />
      )}

      <ChartFrame
        title="Pakistan and US policy rates"
        howToRead="The SBP policy rate (stepped) and the US effective federal funds rate (monthly), both percentages."
        legend={
          <ControlBar>
            <Key items={SERIES.map((s) => ({ label: s.label, color: `var(--pe-viz-${s.color})` }))} />
            <Segmented name="us-range" label="Time range" value={range} onChange={setRange} options={RANGE_OPTIONS} />
          </ControlBar>
        }
        source={`Source: SBP EasyData (policy rate), FRED (effective federal funds rate, monthly end-of-period) · US ${coverageText(model.fedFunds)}`}
        table={{ caption: "Pakistan policy rate and US federal funds rate, by month", head: ["Month", ...SERIES.map((s) => s.label)], rows: tableRowsFor(sliced, months, 2, "%") }}
      >
        <MultiLine data={mergeSeries(sliced, months)} series={SERIES} decimals={2} height={320} ariaLabel="SBP policy rate and US effective federal funds rate over time" animate />
      </ChartFrame>

      <ChartFrame
        title="The gap between them"
        howToRead={`Pakistan's policy rate minus the US federal funds rate, in percentage points, for each month in which both exist. In ${monthLabel(latest.month)} the gap was ${signedPp(latest.value)} pp.`}
        legend={<Key items={[{ label: "Pakistan above the US", color: "var(--pe-viz-blue)" }, { label: "Pakistan below the US", color: "var(--pe-viz-orange)" }]} />}
        source="Source: derived · SBP EasyData, FRED · months present in both series"
        table={{ caption: "Policy-rate gap, by month", head: ["Month", "Gap (pp)"], rows: gap.map((p) => [monthLabel(p.month), signedPp(p.value)]) }}
      >
        <SignedBars data={toBars(gap)} metric="Pakistan minus US policy rate" unit=" pp" decimals={2} height={260} ariaLabel={`Bar chart of the gap between Pakistan's policy rate and the US federal funds rate, ${gap.length} months`} animate />
      </ChartFrame>
    </div>
  );
}
