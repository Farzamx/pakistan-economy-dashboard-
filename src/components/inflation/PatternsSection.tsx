"use client";

// Section 7: the month × year heatmap.
//
// Rows are calendar months, columns are years, and each cell is one observed
// reading. Two measures, clearly labelled, because they answer different
// questions:
//   - year on year (published, since 2016): which periods were unusual — but a
//     YoY rate already compares a month with the same month a year earlier, so it
//     removes seasonality rather than showing it;
//   - month on month (derived from the index, since mid-2022): the measure in
//     which a recurring seasonal pattern would show — but with only a few full
//     years of it, repeated months are a hint, not proof, and the page says so.
// Months not yet observed (before the series starts, or after its last reading)
// are hatched, never zero.

import { useMemo, useState } from "react";
import { Callout, ChartFrame } from "@/components/analytics/ChartFrame";
import { ControlBar, Segmented } from "@/components/analytics/controls";
import { Heatmap } from "@/components/analytics/Heatmap";
import { MOM_SCALE, YOY_SCALE } from "@/lib/analytics/vizPalette";
import { formatValue } from "@/lib/analytics/scales";
import { monthYearMatrix } from "@/lib/inflation/analytics";
import { coverageText } from "@/lib/inflation/chartData";
import type { MonthlyPoint } from "@/lib/inflation/periods";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function PatternsSection({ headline, mom }: { headline: MonthlyPoint[]; mom: MonthlyPoint[] }) {
  const [measure, setMeasure] = useState<"yoy" | "mom">("yoy");
  const points = measure === "yoy" ? headline : mom;
  const matrix = useMemo(() => monthYearMatrix(points), [points]);
  const scale = measure === "yoy" ? YOY_SCALE : MOM_SCALE;
  const unit = measure === "yoy" ? "year on year" : "month on month";

  if (points.length === 0) return <Callout tone="limit" title="No observations">There is no data for this measure.</Callout>;

  return (
    <div className="flex flex-col gap-5">
      <ChartFrame
        title={measure === "yoy" ? "Headline inflation: every month since 2016" : "Monthly price change: every month in the index"}
        howToRead={
          measure === "yoy"
            ? "Read across a row to see how one calendar month changed from year to year; read down a column to see a whole year. Dark cells mark the high-inflation periods."
            : "Read across a row to see whether the same calendar month tends to be high or low. Orange = prices rose that month, blue = fell, grey = barely moved."
        }
        legend={
          <ControlBar>
            <Segmented name="patterns-measure" label="Measure" value={measure} onChange={setMeasure} options={[{ value: "yoy", label: "Year on year (published)" }, { value: "mom", label: "Month on month (derived)", disabled: mom.length === 0 }]} />
          </ControlBar>
        }
        source={`Source: ${measure === "yoy" ? "National CPI, year-on-year, published by SBP EasyData / PBS" : "Derived from the PBS national CPI index (index ÷ previous month's index − 1)"} · ${coverageText(points)}`}
      >
        <Heatmap
          rows={matrix.rows.map((r) => ({ key: String(r.month), label: MONTHS[r.month - 1], cells: r.cells }))}
          columns={matrix.years.map((y) => ({ key: String(y), label: String(y) }))}
          scale={scale}
          minCellWidth={50}
          labelWidth={112}
          caption={`Headline inflation by calendar month and year, % ${unit}`}
          cellTitle={(r, c, v) => `${r.label} ${c.label}: ${v === null ? "no observation" : `${formatValue(v, 2)}% ${unit}`}`}
        />
      </ChartFrame>
      {measure === "mom" && (
        <Callout tone="limit" title="A few years cannot prove a seasonal pattern">
          The month-on-month series covers only {matrix.years.length} calendar years, and they include an unusually volatile period. A calendar month that repeats as high or low is worth watching, but it is not statistical evidence of seasonality.
        </Callout>
      )}
      <p className="text-[12px] leading-relaxed text-pe-text-3">
        Urban-vs-rural and country-by-year heatmaps are covered elsewhere: the urban/rural data does not exist in PEIC (see <a href="#urban-rural" className="text-pe-accent underline underline-offset-2">Urban vs rural</a>), and the country comparison is in <a href="#international" className="text-pe-accent underline underline-offset-2">International comparison</a>. The group-by-month heatmap is in <a href="#groups-time" className="text-pe-accent underline underline-offset-2">CPI groups over time</a>.
      </p>
    </div>
  );
}
