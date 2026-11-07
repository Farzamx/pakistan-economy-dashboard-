"use client";

// Section 3: headline vs core vs food.
//
// The three series are only ever compared on months ALL THREE report, in the same
// unit (% year on year). They do NOT cover the same households — headline is
// national, core and food are urban — and the section says so rather than
// presenting the gaps between them as like-for-like.

import { useMemo, useState } from "react";
import { ChartFrame, Callout } from "@/components/analytics/ChartFrame";
import { ControlBar, Key, Segmented } from "@/components/analytics/controls";
import { DotPlot, DumbbellPlot } from "@/components/analytics/RowCharts";
import { ClusteredBars, type SeriesSpec } from "@/components/analytics/TimeCharts";
import { alignedLatest } from "@/lib/inflation/analytics";
import { commonMonths, mergeSeries, tableRowsFor } from "@/lib/inflation/chartData";
import { monthLabel, type MonthlyPoint } from "@/lib/inflation/periods";

const SERIES: SeriesSpec[] = [
  { key: "headline", label: "Headline CPI (national)", color: "blue" },
  { key: "core", label: "Core, NFNE (urban)", color: "orange" },
  { key: "food", label: "Food (urban)", color: "teal" },
];

type Window = "6" | "12" | "24";

export default function MeasuresSection({ headline, core, food }: { headline: MonthlyPoint[]; core: MonthlyPoint[]; food: MonthlyPoint[] }) {
  const [win, setWin] = useState<Window>("12");
  const series = useMemo(() => ({ headline, core, food }), [headline, core, food]);
  const shared = useMemo(() => commonMonths(series), [series]);
  const months = shared.slice(-Number(win));
  const data = useMemo(() => mergeSeries(series, months), [series, months]);
  const aligned = useMemo(() => alignedLatest(series), [series]);

  if (!aligned) {
    return <Callout tone="limit" title="Not enough overlapping data">Headline, core and food inflation do not share a reporting month in the data PEIC holds, so they cannot be compared here.</Callout>;
  }

  const rows = [
    { key: "headline", label: "Headline (national)", color: "blue" as const },
    { key: "core", label: "Core NFNE (urban)", color: "orange" as const },
    { key: "food", label: "Food (urban)", color: "teal" as const },
  ];
  const lagging = shared[shared.length - 1] !== headline[headline.length - 1]?.month;

  return (
    <div className="flex flex-col gap-7">
      <div className="grid gap-3 md:grid-cols-3">
        {[
          { t: "Headline CPI", d: "Everyday prices across the whole basket — food, housing, transport, health, education and the rest — for households nationwide." },
          { t: "Core inflation (NFNE)", d: "Headline with food and energy taken out, because their prices swing with harvests and fuel costs. Shows the underlying trend. Published for urban households." },
          { t: "Food inflation", d: "Prices of food items only. Food is the largest part of the basket, so it moves the headline most. Published here for urban households." },
        ].map((x) => (
          <div key={x.t} className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface-2 p-3">
            <p className="text-[13px] font-medium text-pe-text">{x.t}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-pe-text-2">{x.d}</p>
          </div>
        ))}
      </div>
      <Callout tone="limit" title="Compare with care">
        Headline is a national measure; core and food cover <strong className="font-medium text-pe-text">urban households only</strong> (PBS and SBP publish no national core or food series in the data PEIC holds). All three are year-on-year percentages, charted only for months where every series has a reading
        {lagging ? ` — so the latest month here (${monthLabel(shared[shared.length - 1])}) is the last month all three share.` : "."}
      </Callout>

      <ChartFrame
        title="Headline, core and food side by side"
        howToRead="Three bars per month, one per measure, all in % year on year. Compare bar heights within a month; a month missing a reading in any series is left out."
        legend={
          <ControlBar>
            <Key items={SERIES.map((s) => ({ label: s.label, color: `var(--pe-viz-${s.color})` }))} />
            <Segmented name="measures-window" label="Months shown" value={win} onChange={setWin} options={[{ value: "6", label: "6" }, { value: "12", label: "12" }, { value: "24", label: "24" }]} />
          </ControlBar>
        }
        source={`Source: SBP EasyData / PBS, year-on-year, published · ${months.length} shared months charted`}
        table={{ caption: "Year-on-year inflation, headline, core and food", head: ["Month", ...SERIES.map((s) => s.label)], rows: tableRowsFor(series, months, 1, "%") }}
      >
        <ClusteredBars data={data} series={SERIES} ariaLabel={`Clustered bars comparing headline, core and food inflation over ${months.length} months`} />
      </ChartFrame>

      <div className="grid gap-7 lg:grid-cols-2">
        <ChartFrame
          title={`Latest comparison: ${monthLabel(aligned.latestMonth)}`}
          howToRead="One dot per measure at the latest month all three report. The horizontal position is the rate."
          source={`Source: SBP EasyData / PBS · % year on year · ${monthLabel(aligned.latestMonth)}`}
          table={{ caption: `Latest values, ${monthLabel(aligned.latestMonth)}`, head: ["Measure", "% year on year"], rows: rows.map((r) => [r.label, `${aligned.latest[r.key].toFixed(1)}%`]) }}
        >
          <DotPlot rows={rows.map((r) => ({ key: r.key, label: r.label, value: aligned.latest[r.key], color: r.color }))} ariaLabel={`Dot plot of headline, core and food inflation in ${monthLabel(aligned.latestMonth)}`} />
        </ChartFrame>

        {aligned.previous && aligned.previousMonth ? (
          <ChartFrame
            title={`Change since ${monthLabel(aligned.previousMonth)}`}
            howToRead="Each line connects a measure's previous reading (open dot) to its latest (filled dot). The number at the right is the change in percentage points."
            source={`Source: SBP EasyData / PBS · % year on year · ${monthLabel(aligned.previousMonth)} → ${monthLabel(aligned.latestMonth)}`}
            table={{ caption: "Previous and latest values", head: ["Measure", monthLabel(aligned.previousMonth), monthLabel(aligned.latestMonth)], rows: rows.map((r) => [r.label, `${(aligned.previous as Record<string, number>)[r.key].toFixed(1)}%`, `${aligned.latest[r.key].toFixed(1)}%`]) }}
          >
            <DumbbellPlot
              rows={rows.map((r) => ({ key: r.key, label: r.label, from: (aligned.previous as Record<string, number>)[r.key], to: aligned.latest[r.key] }))}
              fromLabel={monthLabel(aligned.previousMonth)}
              toLabel={monthLabel(aligned.latestMonth)}
              zeroBaseline={false}
              ariaLabel={`Dumbbell plot of the change in headline, core and food inflation from ${monthLabel(aligned.previousMonth)} to ${monthLabel(aligned.latestMonth)}`}
            />
          </ChartFrame>
        ) : (
          <Callout tone="limit" title="No previous month to compare">The three series do not all have a reading for the month before {monthLabel(aligned.latestMonth)}, so no before-and-after is drawn.</Callout>
        )}
      </div>
    </div>
  );
}
