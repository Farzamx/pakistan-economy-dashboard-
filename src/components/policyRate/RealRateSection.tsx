"use client";

// Section 5: the real policy rate.
//
// WHAT IT IS. The policy rate set against the inflation that has ALREADY HAPPENED: real = ((1 + i) / (1 + π) − 1) × 100, with i the policy
// rate in effect at the month-end and π that month's year-on-year inflation (headline or core, the reader's choice). It is ex-post and
// backward-looking. It is NOT a market real interest rate, NOT an expected (ex-ante) real rate and NOT what a borrower or saver earned:
// no inflation forecast, deposit rate or lending rate is used or held. The simple subtraction i − π is shown nowhere as "the" real rate
// because it misleads when inflation is high (22% against 38% is −16 points by subtraction but −11.6% by the exact formula).
//
// THE CHART puts the nominal policy rate (stepped line), the inflation it is set against (dashed line) and the real rate (area, split at
// zero) on one axis, so the gap between the first two can be read as the third. All three are monthly and share the same months.

import { useMemo, useState } from "react";
import { Callout, ChartFrame } from "@/components/analytics/ChartFrame";
import { ControlBar, Key, Segmented } from "@/components/analytics/controls";
import { RealRateChart, type RealRow } from "@/components/analytics/DateCharts";
import StatStrip from "@/components/policyRate/StatStrip";
import { coverageText, RANGE_OPTIONS, sliceRange, type RangeKey } from "@/lib/inflation/chartData";
import { monthLabel, shortMonthLabel, type MonthlyPoint } from "@/lib/inflation/periods";
import { pct, signedPp } from "@/lib/policyRate/format";
import type { PolicyRateViewModel } from "@/lib/policyRate/viewModel";

type Measure = "headline" | "core";

export default function RealRateSection({ model }: { model: PolicyRateViewModel }) {
  const [measure, setMeasure] = useState<Measure>("headline");
  const [range, setRange] = useState<RangeKey>("60");

  const points = measure === "headline" ? model.realHeadline : model.realCore;
  const real: MonthlyPoint[] = useMemo(() => points.map((p) => ({ month: p.month, value: p.real })), [points]);
  const slicedPoints = useMemo(() => sliceRange(points, range), [points, range]);
  const rows: RealRow[] = useMemo(() => slicedPoints.map((p) => ({ period: shortMonthLabel(p.month), policy: p.policy, inflation: p.inflation, real: p.real })), [slicedPoints]);

  if (points.length === 0) {
    return <Callout tone="limit" title="The real policy rate is unavailable right now">It needs both the policy-rate history and monthly inflation, and one of them could not be loaded.</Callout>;
  }
  const latest = points[points.length - 1];
  const name = measure === "headline" ? "headline CPI inflation" : "core inflation (urban NFNE)";
  const summary = measure === "headline" ? model.realSummary.headline : model.realSummary.core;
  const inflationLabel = measure === "headline" ? "Headline CPI inflation (YoY)" : "Core inflation, urban NFNE (YoY)";

  return (
    <div className="flex flex-col gap-7">
      <Callout title="What the real policy rate is, and what it is not">
        It is the policy rate set against inflation that has <strong className="font-medium">already happened</strong>: (1 + policy rate) ÷ (1 + inflation) − 1. In {monthLabel(latest.month)}: (1 + {pct(latest.policy)}) ÷ (1 + {pct(latest.inflation, 1)}) − 1 = <strong className="font-medium">{pct(latest.real)}</strong>
        ; the simple subtraction would give {signedPp(latest.policy - latest.inflation)} pp, which is only an approximation. It is <strong className="font-medium">not</strong> a market real interest rate, not an <em>expected</em> real rate (no inflation forecast is used), and not what borrowers or savers actually earn or pay (no deposit or lending rates are held).
      </Callout>

      {summary && (
        <StatStrip
          label={`Real policy rate against ${name}`}
          items={[
            { label: "Latest real policy rate", value: pct(summary.latest.value), detail: `${monthLabel(summary.latest.month)}, against ${name}` },
            { label: "Lowest real policy rate", value: pct(summary.lowest.value), detail: `${monthLabel(summary.lowest.month)}, of ${summary.months} months since ${monthLabel(real[0].month)}` },
            { label: "Highest real policy rate", value: pct(summary.highest.value), detail: monthLabel(summary.highest.month) },
            { label: "Months below zero", value: `${summary.below} of ${summary.months}`, detail: "policy rate lower than inflation that month" },
          ]}
        />
      )}

      <ChartFrame
        title="Nominal and real policy rate"
        howToRead={`The policy rate in effect each month-end (stepped line), that month's year-on-year ${name} (dashed line) and the real policy rate they imply (the shaded area and its outline). Teal shading: the policy rate is above inflation (real rate above zero). Orange: it is below (real rate below zero). The vertical gap between the first two lines is the real rate, approximately. Percentages.`}
        legend={
          <ControlBar>
            <Key items={[{ label: "Policy rate (nominal)", color: "var(--pe-viz-purple)" }, { label: inflationLabel, color: "var(--pe-viz-blue)" }, { label: "Real rate above zero", color: "var(--pe-viz-teal)" }, { label: "Real rate below zero", color: "var(--pe-viz-orange)" }]} />
            <Segmented name="real-measure" label="Inflation measure" value={measure} onChange={setMeasure} options={[{ value: "headline", label: "Headline CPI" }, { value: "core", label: "Core (urban NFNE)" }]} />
            <Segmented name="real-range" label="Time range" value={range} onChange={setRange} options={RANGE_OPTIONS} />
          </ControlBar>
        }
        source={`Source: SBP EasyData (policy rate), SBP / PBS (${name}, YoY) · ${coverageText(sliceRange(real, range))} · derived, ex-post, exact Fisher form · all monthly`}
        table={{
          caption: `Real policy rate against ${name}, by month`,
          head: ["Month", "Policy rate", "Inflation (YoY)", "Real policy rate"],
          rows: slicedPoints.map((p) => [monthLabel(p.month), pct(p.policy), pct(p.inflation, 1), pct(p.real)]),
        }}
      >
        <RealRateChart data={rows} inflationLabel={inflationLabel} height={340} animate ariaLabel={`Nominal policy rate, ${name} and the real policy rate, ${coverageText(sliceRange(real, range))}`} />
      </ChartFrame>
    </div>
  );
}
