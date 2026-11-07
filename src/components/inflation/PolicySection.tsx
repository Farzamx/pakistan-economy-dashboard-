"use client";

// Section 11: inflation alongside the SBP policy rate.
//
// This section SHOWS two things in the same time frame; it does not claim one
// causes the other, and it cannot: a policy rate is set in response to expected
// inflation and acts on prices with a delay, so same-date comparisons and simple
// correlations cannot separate cause from effect.
//
// Alignment rules (the only ones used):
//   - The policy rate is a STEP: the rate in effect at a month's end is the latest
//     decision dated in or before that month. That is the definition of the
//     rate, not interpolation, and it is never extended past the latest month of
//     inflation data.
//   - The scatter pairs each inflation reading with the policy rate in effect a
//     chosen number of months LATER (0, 3, 6, 12), to let the reader see how the
//     picture changes with a delay. No correlation coefficient is shown.

import { useMemo, useState } from "react";
import { Callout, ChartFrame } from "@/components/analytics/ChartFrame";
import { ControlBar, Key, Segmented } from "@/components/analytics/controls";
import { DotPlot } from "@/components/analytics/RowCharts";
import { ClusteredBars, MultiLine, ScatterPlot, type SeriesSpec } from "@/components/analytics/TimeCharts";
import { laggedPairs, policyRateAt, policyStepSeries, type PolicyDecision } from "@/lib/inflation/analytics";
import { coverageText, mergeSeries, RANGE_OPTIONS, sliceRange, tableRowsFor, unionMonths, type RangeKey } from "@/lib/inflation/chartData";
import { monthLabel, shiftMonth, type MonthKey, type MonthlyPoint } from "@/lib/inflation/periods";
import { formatValue } from "@/lib/analytics/scales";

const SERIES: SeriesSpec[] = [
  { key: "headline", label: "Headline CPI inflation (YoY)", color: "blue" },
  { key: "core", label: "Core inflation, urban NFNE (YoY)", color: "orange", dash: "6 3" },
  { key: "policy", label: "SBP policy rate", color: "purple", step: true },
];

type Lag = "0" | "3" | "6" | "12";

export default function PolicySection({ headline, core, policy, horizon }: { headline: MonthlyPoint[]; core: MonthlyPoint[]; policy: PolicyDecision[]; horizon: MonthKey | null }) {
  const [range, setRange] = useState<RangeKey>("60");
  const [lag, setLag] = useState<Lag>("0");

  const policySeries = useMemo(() => (horizon && headline.length ? policyStepSeries(policy, headline.map((p) => p.month), horizon) : []), [policy, headline, horizon]);
  const all = useMemo(() => ({ headline, core, policy: policySeries }), [headline, core, policySeries]);
  const sliced = useMemo(() => Object.fromEntries(Object.entries(all).map(([k, v]) => [k, sliceRange(v, range)])), [all, range]);
  const months = useMemo(() => unionMonths(sliced), [sliced]);

  // Year-end snapshots (December), plus the latest month, where all three exist.
  const snapMonths = useMemo(() => {
    const have = (m: MonthKey) => headline.some((p) => p.month === m) && core.some((p) => p.month === m) && policySeries.some((p) => p.month === m);
    const dec = unionMonths(all).filter((m) => m.endsWith("-12") && have(m));
    return horizon && have(horizon) && !dec.includes(horizon) ? [...dec, horizon] : dec;
  }, [all, headline, core, policySeries, horizon]);

  const pairs = useMemo(() => (horizon ? laggedPairs(headline, policy, Number(lag), horizon) : []), [headline, policy, lag, horizon]);

  if (!horizon || policy.length === 0 || headline.length === 0) {
    return <Callout tone="limit" title="Policy-rate comparison is unavailable right now">It needs both the SBP policy-rate history and headline inflation, and one of them could not be loaded.</Callout>;
  }

  const latestRate = policyRateAt(policy, horizon);
  const latestHeadline = headline.find((p) => p.month === horizon)?.value ?? null;
  const latestCore = core.find((p) => p.month === horizon)?.value ?? null;
  const scatter = pairs.map((p, i) => ({ x: p.inflation, y: p.policyRate, label: `Inflation ${monthLabel(p.month)} → policy rate ${monthLabel(shiftMonth(p.month, Number(lag)))}`, latest: i === pairs.length - 1 }));

  return (
    <div className="flex flex-col gap-7">
      <Callout title="Shown together, not linked">
        The SBP sets its policy rate with inflation in mind, and a change takes time to reach prices, so the two series are not expected to move together month by month. Nothing on this page measures the effect of the policy rate on inflation; these charts only put the two series on the same time axis.
      </Callout>

      <ChartFrame
        title="Inflation and the policy rate over time"
        howToRead="Two lines of inflation (year on year) and one stepped line for the SBP policy rate. The policy rate holds its level until the next decision, so it moves in steps. All three are percentages."
        legend={
          <ControlBar>
            <Key items={SERIES.map((s) => ({ label: s.label, color: `var(--pe-viz-${s.color})` }))} />
            <Segmented name="policy-range" label="Time range" value={range} onChange={setRange} options={RANGE_OPTIONS} />
          </ControlBar>
        }
        source={`Source: SBP EasyData (policy rate decisions, ${policy.length} on record), SBP / PBS (inflation) · headline ${coverageText(headline)} · policy rate shown as the rate in effect at each month-end`}
        table={{ caption: "Inflation and the policy rate in effect, by month", head: ["Month", ...SERIES.map((s) => s.label)], rows: tableRowsFor(sliced, months, 2, "%") }}
      >
        <MultiLine data={mergeSeries(sliced, months)} series={SERIES} decimals={2} height={340} ariaLabel="Headline inflation, core inflation and the SBP policy rate over time" />
      </ChartFrame>

      {snapMonths.length > 0 && (
        <ChartFrame
          title="Year-end snapshots"
          howToRead="At each December (and the latest month), the three values side by side. Only months where all three have a reading are shown."
          legend={<Key items={SERIES.map((s) => ({ label: s.label, color: `var(--pe-viz-${s.color})` }))} />}
          source="Source: as above · policy rate = rate in effect at month-end"
          table={{ caption: "Snapshots", head: ["Month", ...SERIES.map((s) => s.label)], rows: tableRowsFor(all, snapMonths, 2, "%") }}
        >
          <ClusteredBars data={mergeSeries(all, snapMonths)} series={SERIES} decimals={2} ariaLabel={`Clustered bars of headline inflation, core inflation and the policy rate at ${snapMonths.length} selected months`} />
        </ChartFrame>
      )}

      <div className="grid gap-7 lg:grid-cols-2">
        <ChartFrame
          title="Inflation vs the policy rate"
          howToRead="Each dot is one month: its inflation rate across, and the policy rate in effect (after the chosen delay) up. The orange diamond is the latest month. A pattern here is not proof of cause."
          legend={
            <ControlBar>
              <Segmented name="policy-lag" label="Policy rate measured…" value={lag} onChange={setLag} options={[{ value: "0", label: "same month" }, { value: "3", label: "3 months later" }, { value: "6", label: "6 months later" }, { value: "12", label: "12 months later" }]} />
            </ControlBar>
          }
          source={`Source: headline CPI inflation (YoY) and SBP policy rate · ${pairs.length} month${pairs.length === 1 ? "" : "s"} paired (months whose policy-rate month lies beyond ${monthLabel(horizon)} are left out)`}
          table={{ caption: "Paired observations", head: ["Inflation month", "Inflation (% YoY)", "Policy rate (%)"], rows: pairs.map((p) => [monthLabel(p.month), formatValue(p.inflation, 1), formatValue(p.policyRate, 2)]) }}
        >
          <ScatterPlot points={scatter} xLabel="Headline inflation, % YoY" yLabel="Policy rate, %" ariaLabel={`Scatter plot of headline inflation against the policy rate, policy rate measured ${lag === "0" ? "in the same month" : `${lag} months later`}, ${pairs.length} points`} />
        </ChartFrame>

        <ChartFrame
          title={`Where things stand: ${monthLabel(horizon)}`}
          howToRead="The three latest values at the same date. They are different measures that happen to share a unit: the chart does not subtract one from another or imply a 'real' rate."
          source={`Source: SBP EasyData / PBS · ${monthLabel(horizon)}`}
        >
          <DotPlot
            rows={[
              { key: "policy", label: "SBP policy rate", value: latestRate, color: "purple" },
              { key: "headline", label: "Headline inflation", value: latestHeadline, color: "blue" },
              { key: "core", label: "Core inflation (urban)", value: latestCore, color: "orange" },
            ]}
            decimals={2}
            ariaLabel={`Dot plot of the policy rate, headline inflation and core inflation in ${monthLabel(horizon)}`}
          />
        </ChartFrame>
      </div>
    </div>
  );
}
