"use client";

// Section 5: the real policy rate.
//
// WHAT IT IS. The policy rate set against the inflation that has ALREADY HAPPENED: real = ((1 + i) / (1 + π) − 1) × 100, with i the policy
// rate in effect at the month-end and π that month's year-on-year inflation (headline or core, the reader's choice). It is ex-post and
// backward-looking. It is NOT a market real interest rate, NOT an expected (ex-ante) real rate and NOT what a borrower or saver earned:
// no inflation forecast, deposit rate or lending rate is used or held. The simple subtraction i − π is shown nowhere as "the" real rate
// because it misleads when inflation is high (22% against 38% is −16 points by subtraction but −11.6% by the exact formula).

import { useMemo, useState } from "react";
import { Callout, ChartFrame } from "@/components/analytics/ChartFrame";
import { ControlBar, Key, Segmented } from "@/components/analytics/controls";
import { MultiLine, type SeriesSpec } from "@/components/analytics/TimeCharts";
import { coverageText, mergeSeries, RANGE_OPTIONS, sliceRange, type RangeKey } from "@/lib/inflation/chartData";
import { monthLabel, type MonthlyPoint } from "@/lib/inflation/periods";
import { pct, signedPp } from "@/lib/policyRate/format";
import type { PolicyRateViewModel } from "@/lib/policyRate/viewModel";

type Measure = "headline" | "core";
const SERIES: SeriesSpec[] = [{ key: "real", label: "Real policy rate", color: "teal" }];

export default function RealRateSection({ model }: { model: PolicyRateViewModel }) {
  const [measure, setMeasure] = useState<Measure>("headline");
  const [range, setRange] = useState<RangeKey>("60");

  const points = measure === "headline" ? model.realHeadline : model.realCore;
  const real: MonthlyPoint[] = useMemo(() => points.map((p) => ({ month: p.month, value: p.real })), [points]);
  const sliced = useMemo(() => sliceRange(real, range), [real, range]);
  const slicedPoints = useMemo(() => sliceRange(points, range), [points, range]);
  const months = useMemo(() => sliced.map((p) => p.month), [sliced]);

  if (points.length === 0) {
    return <Callout tone="limit" title="The real policy rate is unavailable right now">It needs both the policy-rate history and monthly inflation, and one of them could not be loaded.</Callout>;
  }
  const latest = points[points.length - 1];
  const name = measure === "headline" ? "headline CPI inflation" : "core inflation (urban NFNE)";

  return (
    <div className="flex flex-col gap-7">
      <Callout title="What the real policy rate is, and what it is not">
        It is the policy rate set against inflation that has <strong className="font-medium">already happened</strong>: (1 + policy rate) ÷ (1 + inflation) − 1. In {monthLabel(latest.month)}: (1 + {pct(latest.policy)}) ÷ (1 + {pct(latest.inflation, 1)}) − 1 = <strong className="font-medium">{pct(latest.real)}</strong>
        ; the simple subtraction would give {signedPp(latest.policy - latest.inflation)} pp, which is only an approximation. It is <strong className="font-medium">not</strong> a market real interest rate, not an <em>expected</em> real rate (no inflation forecast is used), and not what borrowers or savers actually earn or pay (no deposit or lending rates are held).
      </Callout>

      <ChartFrame
        title="Real policy rate over time"
        howToRead={`The policy rate in effect each month-end set against that month's year-on-year ${name}. Above zero, the policy rate is higher than inflation; below zero, lower. A percentage.`}
        legend={
          <ControlBar>
            <Key items={[{ label: "Real policy rate", color: "var(--pe-viz-teal)" }]} />
            <Segmented name="real-measure" label="Inflation measure" value={measure} onChange={setMeasure} options={[{ value: "headline", label: "Headline CPI" }, { value: "core", label: "Core (urban NFNE)" }]} />
            <Segmented name="real-range" label="Time range" value={range} onChange={setRange} options={RANGE_OPTIONS} />
          </ControlBar>
        }
        source={`Source: SBP EasyData (policy rate), SBP / PBS (${name}, YoY) · ${coverageText(real)} · derived, ex-post, exact Fisher form`}
        table={{
          caption: `Real policy rate against ${name}, by month`,
          head: ["Month", "Policy rate", "Inflation (YoY)", "Real policy rate"],
          rows: slicedPoints.map((p) => [monthLabel(p.month), pct(p.policy), pct(p.inflation, 1), pct(p.real)]),
        }}
      >
        <MultiLine data={mergeSeries({ real: sliced }, months)} series={SERIES} decimals={2} height={320} ariaLabel={`Real policy rate against ${name}, ${coverageText(sliced)}`} />
      </ChartFrame>
    </div>
  );
}
