"use client";

// KIBOR: Chart 2 (tenor comparison: across tenors on chosen dates, or chosen tenors over time) and Chart 3 (the policy rate minus KIBOR).

import { useState } from "react";
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartFrame } from "@/components/analytics/ChartFrame";
import { DateLines, type DateLineSeries } from "@/components/analytics/DateCharts";
import { ControlBar, Segmented, SeriesToggles } from "@/components/analytics/controls";
import { AXIS, Box, makeTip, viz, yTick, type Colour } from "@/components/analytics/TimeCharts";
import type { DatedPoint } from "@/lib/policyRate/dateSeries";
import { formatDate } from "@/lib/policyRate/format";
import { CsvButton } from "./CsvButton";

export interface KiborData {
  tenors: string[];
  snapshots: { label: string; date: string; values: (number | null)[] }[];
  monthly: Record<string, DatedPoint[]>;
  spread6mDaily: DatedPoint[];
  spread6mMonthly: DatedPoint[];
  spread3mMonthly: DatedPoint[];
  dailyFrom: string;
  to: string;
}

const TENOR_STYLE: Record<string, { color: Colour; dash?: string }> = {
  "1W": { color: "blue" },
  "2W": { color: "blue", dash: "2 3" },
  "1M": { color: "teal" },
  "3M": { color: "purple" },
  "6M": { color: "orange" },
  "9M": { color: "amber", dash: "6 3" },
  "1Y": { color: "slate" },
};
const SNAP_COLOURS: Colour[] = ["purple", "teal", "blue", "orange", "slate"];

/** One row per month: each tenor's monthly average (null where a tenor has no fixing that month) and the 6M day count. */
function monthlyRows(data: KiborData): (string | number | null)[][] {
  const maps = data.tenors.map((t) => new Map(data.monthly[t].map((p) => [p.date.slice(0, 7), p.value])));
  const months = [...new Set(data.tenors.flatMap((t) => data.monthly[t].map((p) => p.date.slice(0, 7))))].sort();
  const days = new Map(data.monthly["6M"].map((p) => [p.date.slice(0, 7), Number(/of (\d+)/.exec(p.note ?? "")?.[1] ?? NaN)]));
  return months.map((m) => [m, ...maps.map((mp) => mp.get(m) ?? null), Number.isFinite(days.get(m)) ? days.get(m)! : null]);
}

export function KiborTenorChart({ data, retrievedOn }: { data: KiborData; retrievedOn: string }) {
  const [view, setView] = useState<"across" | "time">("across");
  const [snaps, setSnaps] = useState<Set<string>>(new Set(["Latest", "1 year earlier"]));
  const [tenors, setTenors] = useState<Set<string>>(new Set(["1W", "3M", "6M", "1Y"]));
  const toggle = (set: Set<string>, setter: (s: Set<string>) => void) => (k: string) => {
    const next = new Set(set);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setter(next);
  };

  const rows = data.tenors.map((t, i) => ({ period: t, ...Object.fromEntries(data.snapshots.map((s) => [s.label, s.values[i]])) }));
  const shownSnaps = data.snapshots.filter((s) => snaps.has(s.label));
  const spec = shownSnaps.map((s) => ({ key: s.label, label: `${s.label} (${formatDate(s.date)})`, color: SNAP_COLOURS[data.snapshots.indexOf(s)] }));
  const timeSeries: DateLineSeries[] = data.tenors.filter((t) => tenors.has(t)).map((t) => ({ key: t, label: `${t} KIBOR`, color: TENOR_STYLE[t].color, dash: TENOR_STYLE[t].dash, kind: "observed", points: data.monthly[t], monthly: true }));

  return (
    <ChartFrame
      title="KIBOR across tenors"
      howToRead="KIBOR is published for loans of one week to one year. Across tenors, the line shows the rate for each loan length on one day: rising to the right means banks quote more for longer loans, falling means the market expects rates to come down. Over time, each line is one tenor's monthly average of daily fixings. 2-year and 3-year KIBOR were discontinued in February 2020 and are not shown."
      legend={
        <ControlBar>
          <Segmented label="View" name="ir-kibor-view" options={[{ value: "across", label: "Across tenors" }, { value: "time", label: "Over time" }]} value={view} onChange={setView} />
          {view === "across" ? (
            <SeriesToggles label="Dates" items={data.snapshots.map((s, i) => ({ key: s.label, label: `${s.label}`, color: viz(SNAP_COLOURS[i]) }))} active={snaps} onToggle={toggle(snaps, setSnaps)} />
          ) : (
            <SeriesToggles label="Tenors" items={data.tenors.map((t) => ({ key: t, label: t, color: viz(TENOR_STYLE[t].color), dash: TENOR_STYLE[t].dash }))} active={tenors} onToggle={toggle(tenors, setTenors)} />
          )}
          <CsvButton
            spec={
              view === "across"
                ? { filename: "kibor-by-tenor.csv", head: ["label", "date", ...data.tenors.map((t) => `kibor_${t}_pct`)], rows: data.snapshots.map((s) => [s.label, s.date, ...s.values]), notes: [`Source: SBP EasyData TS_GP_BAM_SIRKIBOR_D (offer rates). Retrieved ${retrievedOn}.`, "Each row is the fixing on the latest KIBOR date on or before the label's date."] }
                : { filename: "kibor-monthly-averages.csv", head: ["month", ...data.tenors.map((t) => `kibor_${t}_pct`), "fixings_in_month_6M"], rows: monthlyRows(data), notes: [`Source: SBP EasyData (offer rates). Retrieved ${retrievedOn}.`, "Monthly average = arithmetic mean of the daily fixings published in the month; the last column is the number of 6M fixings averaged."] }
            }
          />
        </ControlBar>
      }
      source={`Source: SBP EasyData, KIBOR offer rates (dataset TS_GP_BAM_SIRKIBOR_D). Retrieved ${retrievedOn}.`}
      table={view === "across" ? { caption: "KIBOR by tenor on selected dates", head: ["Tenor", ...data.snapshots.map((s) => `${s.label} (${s.date})`)], rows: data.tenors.map((t, i) => [t, ...data.snapshots.map((s) => (s.values[i] === null ? null : `${s.values[i]!.toFixed(2)}%`))]) } : undefined}
    >
      {view === "across" ? (
        <Box height={300} ariaLabel="Line chart of KIBOR by tenor on selected dates">
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: -8 }} accessibilityLayer>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="period" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={yTick("%", 1)} tick={AXIS} tickLine={false} axisLine={false} width={50} domain={["auto", "auto"]} />
            <Tooltip content={makeTip("%", 2, spec)} cursor={{ stroke: "var(--chart-axis)", strokeDasharray: "3 3" }} />
            {spec.map((s) => (
              <Line key={s.key} dataKey={s.key} name={s.label} stroke={viz(s.color)} strokeWidth={2} dot={{ r: 3, fill: viz(s.color), stroke: "var(--pe-surface)", strokeWidth: 1 }} isAnimationActive={false} connectNulls={false} />
            ))}
          </LineChart>
        </Box>
      ) : (
        <DateLines series={timeSeries} from="2005-06-01" to={data.to} ariaLabel="Monthly average KIBOR for the selected tenors" maxGapDays={70} zeroLine={false} />
      )}
    </ChartFrame>
  );
}

export function PolicyKiborSpread({ data, retrievedOn }: { data: KiborData; retrievedOn: string }) {
  const [range, setRange] = useState<"recent" | "all">("all");
  const recent = range === "recent";
  const series: DateLineSeries[] = recent
    ? [{ key: "s6", label: "Policy − 6M KIBOR (daily)", color: "orange", kind: "observed", points: data.spread6mDaily }]
    : [
        { key: "s6", label: "Policy − 6M KIBOR (monthly avg.)", color: "orange", kind: "observed", points: data.spread6mMonthly, monthly: true },
        { key: "s3", label: "Policy − 3M KIBOR (monthly avg.)", color: "purple", kind: "observed", points: data.spread3mMonthly, dash: "6 3", monthly: true },
      ];
  const from = recent ? data.dailyFrom : "2005-06-01";
  return (
    <ChartFrame
      title="Policy rate minus KIBOR"
      howToRead="Each point is the SBP policy rate in force that day minus that day's KIBOR fixing (monthly view: the average of the daily differences). Below zero, banks were quoting KIBOR above the policy rate — typically when markets expected SBP to raise rates; above zero, KIBOR was below the policy rate — typically when cuts were expected. Before 25 May 2015 the policy rate was SBP's reverse repo rate (the top of the corridor), so the gap was larger by construction; read the two periods separately."
      legend={
        <ControlBar>
          <Segmented label="Range" name="ir-spread-range" options={[{ value: "all", label: "Since 2005 (monthly)" }, { value: "recent", label: "Last 2 years (daily)" }]} value={range} onChange={setRange} />
          <CsvButton spec={{ filename: `policy-minus-kibor-${range}.csv`, head: ["date", "series", "spread_pp", "note"], rows: series.flatMap((s) => s.points.filter((p) => p.date >= from).map((p) => [p.date, s.label, p.value, p.note ?? ""])), notes: [`Derived by PEIC from SBP EasyData. Retrieved ${retrievedOn}.`, "Spread = policy rate in force on the day - KIBOR fixing that day, in percentage points."] }} />
        </ControlBar>
      }
      source={`Derived from SBP EasyData (policy rates and KIBOR). Retrieved ${retrievedOn}.`}
    >
      <DateLines series={series} from={from} to={data.to} unit=" pp" ariaLabel="The policy rate minus KIBOR over time, in percentage points" maxGapDays={recent ? 10 : 70} markers={[{ date: "2015-05-25", label: "target rate introduced" }]} />
    </ChartFrame>
  );
}
