"use client";

// Sections 6 and 7: inflation and the policy rate on one axis, and what inflation did around each cycle.
//
// This section SHOWS series in the same time frame; it does not claim one causes the other, and it cannot. A policy rate is set with
// expected inflation in mind and works on prices with a delay; same-date comparisons and before/after tables cannot separate cause from
// effect, and many other things moved at the same time. The cycle table reports what inflation WAS at three points, nothing more.

import { useMemo, useState } from "react";
import { Callout, ChartFrame } from "@/components/analytics/ChartFrame";
import { ControlBar, Key, Segmented } from "@/components/analytics/controls";
import { MultiLine, type SeriesSpec } from "@/components/analytics/TimeCharts";
import { coverageText, mergeSeries, RANGE_OPTIONS, sliceRange, tableRowsFor, unionMonths, type RangeKey } from "@/lib/inflation/chartData";
import { monthLabel } from "@/lib/inflation/periods";
import { formatDate, pct, signedPp } from "@/lib/policyRate/format";
import type { PolicyRateViewModel } from "@/lib/policyRate/viewModel";

const SERIES: SeriesSpec[] = [
  { key: "policy", label: "SBP policy rate", color: "purple", step: true },
  { key: "headline", label: "Headline CPI inflation (YoY)", color: "blue" },
  { key: "core", label: "Core inflation, urban NFNE (YoY)", color: "orange", dash: "6 3" },
];

const cell = (v: number | null, d = 1) => (v === null ? <span className="text-pe-text-3">not in the data</span> : `${v.toFixed(d)}%`);

export default function InflationCompareSection({ model }: { model: PolicyRateViewModel }) {
  const [range, setRange] = useState<RangeKey>("60");
  const all = useMemo(() => ({ policy: model.policyMonthly, headline: model.headline, core: model.core }), [model.policyMonthly, model.headline, model.core]);
  const sliced = useMemo(() => Object.fromEntries(Object.entries(all).map(([k, v]) => [k, sliceRange(v, range)])), [all, range]);
  const months = useMemo(() => unionMonths(sliced), [sliced]);

  if (model.policyMonthly.length === 0 || model.headline.length === 0) {
    return <Callout tone="limit" title="The comparison is unavailable right now">It needs both the policy-rate history and monthly headline inflation, and one of them could not be loaded.</Callout>;
  }
  const outcomes = model.cycleOutcomes.filter((o) => o.inflationAtStart !== null || o.inflationAtEnd !== null);

  return (
    <div className="flex flex-col gap-7">
      <Callout title="Shown together, not linked">
        The SBP sets its policy rate with inflation in mind, and a change takes time to reach prices, so the two are not expected to move together month by month. Nothing on this page measures the effect of the policy rate on inflation; these charts and tables only put the series next to each other. Many other things changed over the same years.
      </Callout>

      <ChartFrame
        title="Policy rate and inflation over time"
        howToRead="Two lines of inflation (year on year) and one stepped line for the SBP policy rate, all percentages. The policy rate holds its level until the next change."
        legend={
          <ControlBar>
            <Key items={SERIES.map((s) => ({ label: s.label, color: `var(--pe-viz-${s.color})` }))} />
            <Segmented name="compare-range" label="Time range" value={range} onChange={setRange} options={RANGE_OPTIONS} />
          </ControlBar>
        }
        source={`Source: SBP EasyData (policy rate), SBP / PBS (inflation) · headline ${coverageText(model.headline)} · policy rate shown as the rate in effect at each month-end`}
        table={{ caption: "Policy rate and inflation, by month", head: ["Month", ...SERIES.map((s) => s.label)], rows: tableRowsFor(sliced, months, 2, "%") }}
      >
        <MultiLine data={mergeSeries(sliced, months)} series={SERIES} decimals={2} height={340} ariaLabel="SBP policy rate, headline inflation and core inflation over time" />
      </ChartFrame>

      {outcomes.length > 0 && (
        <div>
          <h3 className="text-[14px] font-semibold text-pe-text">What inflation was around each cycle</h3>
          <p className="mt-0.5 max-w-3xl text-[13px] leading-relaxed text-pe-text-2">
            Headline inflation (year on year) at the first change of each cycle, at its last change, and twelve months after the month of the last change. These are observations at three dates. They do not say that the cycle moved inflation, or that inflation would have been different without it.
          </p>
          <div className="relative mt-2 overflow-x-auto rounded-[var(--pe-radius)] border border-pe-border" tabIndex={0} role="region" aria-label="Inflation around each cycle (scrolls sideways)">
            <table className="w-full min-w-[760px] border-collapse text-left text-[12.5px] tabular-nums">
              <caption className="sr-only">For each tightening or easing cycle: the policy-rate move and headline inflation at its first change, at its last change and twelve months after</caption>
              <thead className="bg-pe-surface-2 text-pe-text-2">
                <tr>
                  {["Cycle", "Policy move", "Inflation at first change", "Inflation at last change", "12 months after last change"].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-pe-text">
                {outcomes.map((o) => (
                  <tr key={o.startDate} className="border-t border-pe-border">
                    <th scope="row" className="whitespace-nowrap px-3 py-1.5 text-left font-normal text-pe-text">
                      {o.direction === "tightening" ? "Tightening" : "Easing"}
                      <span className="block text-[11.5px] text-pe-text-2">{formatDate(o.startDate)} – {formatDate(o.endDate)}</span>
                    </th>
                    <td className="whitespace-nowrap px-3 py-1.5">{pct(o.startRate)} → {pct(o.endRate)} <span className="text-pe-text-2">({signedPp(o.totalChange)} pp)</span></td>
                    <td className="whitespace-nowrap px-3 py-1.5">{cell(o.inflationAtStart)}</td>
                    <td className="whitespace-nowrap px-3 py-1.5">{cell(o.inflationAtEnd)}</td>
                    <td className="whitespace-nowrap px-3 py-1.5">
                      {cell(o.inflationTwelveMonthsAfter)}
                      {o.inflationTwelveMonthsAfter !== null ? <span className="text-pe-text-2"> ({monthLabel(o.twelveMonthsAfterMonth)})</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 max-w-3xl font-mono text-[11px] leading-relaxed text-pe-text-3">
            Source: SBP EasyData (policy rate), SBP / PBS (headline CPI inflation, YoY). &ldquo;At first/last change&rdquo; is the CPI of the month before the change (the latest figure PBS had published). &ldquo;Not in the data&rdquo; means that month is outside the inflation series PEIC holds, which begins in {monthLabel(model.headline[0].month)}, or is not yet published. The latest cycle&rsquo;s twelve-month figure is not yet available.
          </p>
        </div>
      )}
    </div>
  );
}
