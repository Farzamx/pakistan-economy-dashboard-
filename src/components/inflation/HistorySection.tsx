"use client";

// Section 2: how inflation has behaved over time.
//   A. Bars: headline inflation by month (year-on-year as published, or the
//      month-on-month change derived from the CPI index).
//   B. Lines: the long-run trend, with headline / core / food switchable on and off.
//   C. Acceleration: the month-to-month change in the headline RATE.
// One range control drives all three so they always describe the same window.

import { useMemo, useState } from "react";
import { ChartFrame } from "@/components/analytics/ChartFrame";
import { ControlBar, Key, Segmented, SeriesToggles, type LegendItem } from "@/components/analytics/controls";
import { MultiLine, SignedBars, type SeriesSpec } from "@/components/analytics/TimeCharts";
import { acceleration } from "@/lib/inflation/analytics";
import { coverageText, mergeSeries, RANGE_OPTIONS, sliceRange, tableRowsFor, toBars, unionMonths, type RangeKey } from "@/lib/inflation/chartData";
import { monthLabel, type MonthlyPoint } from "@/lib/inflation/periods";
import { formatValue } from "@/lib/analytics/scales";

type Measure = "yoy" | "mom";

const LINE_SERIES: (SeriesSpec & { id: "headline" | "core" | "food"; note: string })[] = [
  { id: "headline", key: "headline", label: "Headline CPI (national)", color: "blue", note: "National" },
  { id: "core", key: "core", label: "Core, NFNE (urban)", color: "orange", dash: "6 3", note: "Urban" },
  { id: "food", key: "food", label: "Food (urban)", color: "teal", dash: "2 3", note: "Urban" },
];

export default function HistorySection({ headline, mom, core, food }: { headline: MonthlyPoint[]; mom: MonthlyPoint[]; core: MonthlyPoint[]; food: MonthlyPoint[] }) {
  const [range, setRange] = useState<RangeKey>("24");
  const [measure, setMeasure] = useState<Measure>("yoy");
  const [active, setActive] = useState<Set<string>>(new Set(["headline"]));

  const barSource = measure === "yoy" ? headline : mom;
  const bars = useMemo(() => sliceRange(barSource, range), [barSource, range]);
  const accel = useMemo(() => sliceRange(acceleration(headline), range), [headline, range]);

  const all = { headline, core, food };
  const shownSeries = LINE_SERIES.filter((s) => active.has(s.id));
  const sliced = useMemo(() => Object.fromEntries(shownSeries.map((s) => [s.id, sliceRange(all[s.id], range)])), [shownSeries, range]); // eslint-disable-line react-hooks/exhaustive-deps
  const lineMonths = useMemo(() => unionMonths(sliced), [sliced]);
  const lineData = useMemo(() => mergeSeries(sliced, lineMonths), [sliced, lineMonths]);

  const toggleItems: LegendItem[] = LINE_SERIES.map((s) => ({ key: s.id, label: s.label, color: `var(--pe-viz-${s.color})`, dash: s.dash, disabled: all[s.id].length === 0 }));
  const toggle = (k: string) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const barMetric = measure === "yoy" ? "Headline CPI, year on year" : "Headline CPI, month on month";

  return (
    <div className="flex flex-col gap-7">
      <ControlBar>
        <Segmented name="hist-range" label="Time range" options={RANGE_OPTIONS} value={range} onChange={setRange} />
      </ControlBar>

      <ChartFrame
        title={measure === "yoy" ? "Headline inflation by month" : "Monthly change in consumer prices"}
        howToRead={
          measure === "yoy" ? (
            <>Each bar is one month&rsquo;s year-on-year rate: how much higher prices are than in the <strong className="font-medium text-pe-text">same month a year earlier</strong>. The bar sits above zero while prices are higher than a year ago.</>
          ) : (
            <>Each bar is how much the CPI index moved <strong className="font-medium text-pe-text">from the previous month</strong>, derived from PBS&rsquo;s index. It is a one-month change, not an annual rate, and swings more month to month than the year-on-year figure.</>
          )
        }
        legend={
          <Segmented
            name="hist-measure"
            label="Measure"
            value={measure}
            onChange={setMeasure}
            options={[
              { value: "yoy", label: "Year on year (published)" },
              { value: "mom", label: "Month on month (derived)", disabled: mom.length === 0 },
            ]}
          />
        }
        source={`Source: ${measure === "yoy" ? "National CPI, year-on-year, published by SBP EasyData / PBS" : "Derived from the PBS national CPI index: index ÷ previous month's index − 1"} · available ${coverageText(barSource)} · charted ${bars.length} month${bars.length === 1 ? "" : "s"}`}
        table={{ caption: `${barMetric}, by month`, head: ["Month", barMetric], rows: tableRowsFor({ v: bars }, bars.map((p) => p.month), 1, "%") }}
      >
        <SignedBars data={toBars(bars)} metric={barMetric} ariaLabel={`${barMetric}: ${bars.length} monthly bars`} decimals={measure === "yoy" ? 1 : 2} />
      </ChartFrame>

      <ChartFrame
        title="Long-run trend: headline, core and food"
        howToRead="Lines show the year-on-year rate over time. Switch core and food on to compare them with the headline. Core and food are urban-only series; the headline is national."
        legend={<SeriesToggles label="Show" items={toggleItems} active={active} onToggle={toggle} />}
        source={`Source: SBP EasyData / PBS, year-on-year, published · headline ${coverageText(headline)}${core.length ? ` · core ${coverageText(core)}` : ""}${food.length ? ` · food ${coverageText(food)}` : ""}`}
        table={{ caption: "Year-on-year inflation by month for the visible series", head: ["Month", ...shownSeries.map((s) => s.label)], rows: tableRowsFor(sliced, lineMonths, 1, "%") }}
      >
        <MultiLine data={lineData} series={shownSeries} ariaLabel={`Year-on-year inflation lines for ${shownSeries.map((s) => s.label).join(", ")}`} />
      </ChartFrame>

      <ChartFrame
        title="Is inflation speeding up or slowing down?"
        howToRead={
          <>
            Each bar is the change in the headline <em>rate</em> since the previous month, in percentage points. An orange bar means the rate rose; a teal bar means it fell.{" "}
            <strong className="font-medium text-pe-text">A falling rate is not falling prices</strong>: prices are still rising whenever the rate is above zero, just more slowly.
          </>
        }
        legend={<Key items={[{ label: "Rate rose (inflation accelerated)", color: "var(--pe-viz-orange)" }, { label: "Rate fell (inflation slowed)", color: "var(--pe-viz-teal)" }]} />}
        source={`Source: derived — headline year-on-year rate minus the previous month's rate (consecutive months only) · ${accel.length} month${accel.length === 1 ? "" : "s"} charted`}
        table={{ caption: "Month-to-month change in the headline inflation rate, percentage points", head: ["Month", "Change (pp)"], rows: accel.map((p) => [monthLabel(p.month), formatValue(p.value, 1, { signed: true })]) }}
      >
        <SignedBars data={toBars(accel)} metric="Change in headline rate (pp)" unit=" pp" positive="orange" negative="teal" ariaLabel={`Month-to-month change in the headline inflation rate: ${accel.length} bars`} />
      </ChartFrame>
    </div>
  );
}
