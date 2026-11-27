"use client";

// T-bill auction yields over time, by tenor, with the yield definition as a switch (cut-off and weighted average are never mixed on one line).
// Points are auction dates (no resampling); a line is broken where a tenor was not auctioned or failed for more than 45 days.

import { useState } from "react";
import { ChartFrame } from "@/components/analytics/ChartFrame";
import { DateLines, type DateLineSeries } from "@/components/analytics/DateCharts";
import { ControlBar, Segmented, SeriesToggles } from "@/components/analytics/controls";
import { viz, type Colour } from "@/components/analytics/TimeCharts";
import type { DatedPoint } from "@/lib/policyRate/dateSeries";
import { CsvButton } from "./CsvButton";

export interface TbillHistoryData {
  cutoff: Record<string, DatedPoint[]>;
  wa: Record<string, DatedPoint[]>;
  to: string;
  sbpFrom: string;
}

const TENORS: { key: string; label: string; color: Colour; dash?: string }[] = [
  { key: "1M", label: "1-month", color: "teal", dash: "2 3" },
  { key: "3M", label: "3-month", color: "orange" },
  { key: "6M", label: "6-month", color: "purple", dash: "6 3" },
  { key: "12M", label: "12-month", color: "blue" },
];

export default function TbillHistoryChart({ data, retrievedOn }: { data: TbillHistoryData; retrievedOn: string }) {
  const [def, setDef] = useState<"cutoff" | "wa">("cutoff");
  const [range, setRange] = useState<"5y" | "all">("5y");
  const [active, setActive] = useState<Set<string>>(new Set(["3M", "6M", "12M"]));
  const set = data[def];
  const series: DateLineSeries[] = TENORS.filter((t) => active.has(t.key)).map((t) => ({ key: t.key, label: `${t.label} ${def === "cutoff" ? "cut-off" : "weighted average"}`, color: t.color, dash: t.dash, kind: "observed", points: set[t.key] ?? [] }));
  const from = range === "all" ? "2004-06-01" : `${Number(data.to.slice(0, 4)) - 5}${data.to.slice(4)}`;
  const toggle = (k: string) => setActive((prev) => {
    const next = new Set(prev);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    return next;
  });
  return (
    <ChartFrame
      title="Treasury bill auction yields"
      howToRead="Each point is one auction. The cut-off yield is the highest yield the government accepted; the weighted average is the average of all accepted bids, weighted by amount. A gap means the tenor was not offered or the bids were rejected. The 1-month bill exists only from March 2025."
      legend={
        <ControlBar>
          <Segmented label="Yield" name="tb-def" options={[{ value: "cutoff", label: "Cut-off" }, { value: "wa", label: "Weighted average" }]} value={def} onChange={setDef} />
          <Segmented label="Range" name="tb-range" options={[{ value: "5y", label: "5 years" }, { value: "all", label: "Since 2004" }]} value={range} onChange={setRange} />
          <SeriesToggles label="Tenors" items={TENORS.map((t) => ({ key: t.key, label: t.label, color: viz(t.color), dash: t.dash }))} active={active} onToggle={toggle} />
          <CsvButton
            spec={{
              filename: `pakistan-tbill-${def === "cutoff" ? "cutoff" : "weighted-average"}-yields.csv`,
              head: ["auction_date", "tenor", "yield_pct", "source"],
              rows: TENORS.flatMap((t) => (set[t.key] ?? []).map((p) => [p.date, t.key, p.value, p.note ?? ""])),
              notes: [`Source: State Bank of Pakistan. SBP auction file tb.xlsx from ${data.sbpFrom}; SBP EasyData before. Retrieved ${retrievedOn}.`, `${def === "cutoff" ? "Cut-off (highest accepted) yield" : "Weighted-average accepted yield"}, percent per annum, by auction date.`],
            }}
          />
        </ControlBar>
      }
      source={`Source: State Bank of Pakistan — auction results file tb.xlsx (from ${data.sbpFrom}) and SBP EasyData (before). Retrieved ${retrievedOn}.`}
    >
      <DateLines series={series} from={from} to={data.to} ariaLabel={`Treasury bill ${def === "cutoff" ? "cut-off" : "weighted-average"} yields by auction`} maxGapDays={45} zeroLine={false} />
    </ChartFrame>
  );
}
