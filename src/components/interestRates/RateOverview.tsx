"use client";

// Chart 1: the policy rate, 3M and 6M KIBOR and the 3M T-bill cut-off yield on one time axis, with series toggles and a range control.
// Resolution follows the range and is stated: up to 2 years KIBOR is shown as daily fixings; longer ranges use monthly averages of the daily fixings.
// The policy rate is a step series (holds until the next decision); T-bill yields exist only on auction dates.

import { useMemo, useState } from "react";
import { ChartFrame } from "@/components/analytics/ChartFrame";
import { DateLines, type DateLineSeries } from "@/components/analytics/DateCharts";
import { ControlBar, Segmented, SeriesToggles } from "@/components/analytics/controls";
import { viz } from "@/components/analytics/TimeCharts";
import type { DatedPoint } from "@/lib/policyRate/dateSeries";
import { CsvButton } from "./CsvButton";

type Range = "2y" | "5y" | "10y" | "all";
const RANGES: { value: Range; label: string; months: number | null }[] = [
  { value: "2y", label: "2 years", months: 24 },
  { value: "5y", label: "5 years", months: 60 },
  { value: "10y", label: "10 years", months: 120 },
  { value: "all", label: "Since 2005", months: null },
];

function shift(iso: string, months: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().slice(0, 10);
}

export interface RateOverviewData {
  policy: DatedPoint[];
  kibor3mMonthly: DatedPoint[];
  kibor6mMonthly: DatedPoint[];
  kibor3mDaily: DatedPoint[];
  kibor6mDaily: DatedPoint[];
  tbill3m: DatedPoint[];
  dailyFrom: string;
  to: string;
}

export default function RateOverview({ data, retrievedOn, instrumentSwitch }: { data: RateOverviewData; retrievedOn: string; instrumentSwitch: string }) {
  const [range, setRange] = useState<Range>("5y");
  const [active, setActive] = useState<Set<string>>(new Set(["policy", "k3", "k6", "tb3"]));
  const months = RANGES.find((r) => r.value === range)!.months;
  const from = months === null ? "2005-06-01" : shift(data.to, months);
  const daily = range === "2y";

  const all: DateLineSeries[] = useMemo(
    () => [
      { key: "policy", label: "SBP policy rate", color: "purple", kind: "step", points: data.policy },
      { key: "k3", label: daily ? "3M KIBOR (daily)" : "3M KIBOR (monthly avg.)", color: "blue", kind: "observed", points: daily ? data.kibor3mDaily : data.kibor3mMonthly, monthly: !daily },
      { key: "k6", label: daily ? "6M KIBOR (daily)" : "6M KIBOR (monthly avg.)", color: "teal", kind: "observed", points: daily ? data.kibor6mDaily : data.kibor6mMonthly, dash: "6 3", monthly: !daily },
      { key: "tb3", label: "3M T-bill cut-off (auctions)", color: "orange", kind: "observed", points: data.tbill3m, dots: daily },
    ],
    [data, daily],
  );
  const series = all.filter((s) => active.has(s.key));
  const toggle = (k: string) => setActive((prev) => {
    const next = new Set(prev);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    return next;
  });

  const csvRows = series.flatMap((s) => s.points.filter((p) => p.date >= from).map((p) => [p.date, s.label, p.value, p.note ?? ""]));
  return (
    <ChartFrame
      title="Policy rate, KIBOR and T-bill yields"
      howToRead={`Each line sits on its own dates. The policy rate is stepped: it holds until SBP changes it. KIBOR is the rate banks quote for lending to each other; it is not set by SBP. The T-bill line joins auction results, which happen about every two weeks. Up to 2 years KIBOR is shown daily; longer ranges show monthly averages of the daily fixings. Before ${instrumentSwitch} SBP's policy rate was its reverse repo rate (the top of today's corridor), marked on the chart.`}
      legend={
        <ControlBar>
          <SeriesToggles
            label="Show"
            items={all.map((s) => ({ key: s.key, label: s.label, color: viz(s.color), dash: s.dash }))}
            active={active}
            onToggle={toggle}
          />
          <Segmented label="Range" name="ir-overview-range" options={RANGES.map((r) => ({ value: r.value, label: r.label }))} value={range} onChange={setRange} />
          <CsvButton spec={{ filename: `pakistan-rates-overview-${range}.csv`, head: ["date", "series", "value_pct", "note"], rows: csvRows, notes: [`Source: State Bank of Pakistan (EasyData; auction file tb.xlsx). Retrieved ${retrievedOn}.`, "Policy rate: value set on that date (holds until the next). KIBOR: offer rate; monthly values are averages of daily fixings. T-bill: auction cut-off yield."] }} />
        </ControlBar>
      }
      source={`Source: State Bank of Pakistan — policy rates and KIBOR from SBP EasyData; T-bill auctions from SBP's tb.xlsx (from Jul 2014) and EasyData (before). Retrieved ${retrievedOn}.`}
    >
      <DateLines series={series} from={from} to={data.to} ariaLabel="Line chart of the SBP policy rate, 3-month and 6-month KIBOR and the 3-month T-bill cut-off yield" maxGapDays={daily ? 35 : 75} zeroLine={false} markers={[{ date: instrumentSwitch, label: "target rate introduced" }]} />
    </ChartFrame>
  );
}
