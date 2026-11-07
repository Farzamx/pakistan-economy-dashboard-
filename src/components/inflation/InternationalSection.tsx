"use client";

// Section 10: Pakistan against India, Bangladesh and Sri Lanka.
//
// ONE indicator for every country, from one source: the World Bank's annual
// consumer-price inflation (FP.CPI.TOTL.ZG), the year's average CPI against the
// previous year's average, on calendar years. Pakistan's number here is the World
// Bank's, not PEIC's monthly series, because the two are different quantities —
// and the section computes, from live data, how far apart they are so the reader
// is not asked to take that on trust. A year a country has no value for is a
// hatched gap, never zero; a real negative (deflation) is drawn as negative.

import { useMemo, useState } from "react";
import { Callout, ChartFrame } from "@/components/analytics/ChartFrame";
import { ControlBar, Key, Segmented, SeriesToggles, type LegendItem } from "@/components/analytics/controls";
import { Heatmap } from "@/components/analytics/Heatmap";
import { DotPlot, DumbbellPlot } from "@/components/analytics/RowCharts";
import { ClusteredBars, MultiLine, type SeriesSpec } from "@/components/analytics/TimeCharts";
import { YOY_SCALE } from "@/lib/analytics/vizPalette";
import { formatValue } from "@/lib/analytics/scales";
import { countryYearMatrix, latestCommonYear, rankDescending, type AnnualPoint } from "@/lib/inflation/analytics";
import type { MonthlyPoint } from "@/lib/inflation/periods";

const COUNTRIES = [
  { code: "PAK", name: "Pakistan", color: "blue" as const },
  { code: "IND", name: "India", color: "orange" as const },
  { code: "BGD", name: "Bangladesh", color: "teal" as const },
  { code: "LKA", name: "Sri Lanka", color: "purple" as const },
];
const NAME: Record<string, string> = Object.fromEntries(COUNTRIES.map((c) => [c.code, c.name]));

export default function InternationalSection({ intl, monthlyHeadline }: { intl: { series: Record<string, AnnualPoint[]>; lastUpdated: string | null } | null; monthlyHeadline: MonthlyPoint[] }) {
  const [peers, setPeers] = useState<Set<string>>(new Set(["IND", "BGD", "LKA"]));
  const [span, setSpan] = useState<"10" | "all">("10");

  const shown = COUNTRIES.filter((c) => c.code === "PAK" || peers.has(c.code)).filter((c) => intl?.series[c.code]);
  const subset = useMemo(() => Object.fromEntries(shown.map((c) => [c.code, intl?.series[c.code] ?? []])), [shown, intl]);
  const matrix = useMemo(() => countryYearMatrix(subset), [subset]);

  if (!intl || !intl.series.PAK) {
    return <Callout tone="limit" title="International comparison is unavailable right now">The World Bank data this section uses could not be retrieved, so no comparison is drawn.</Callout>;
  }

  const years = span === "10" ? matrix.years.slice(-10) : matrix.years;
  const specs: SeriesSpec[] = shown.map((c) => ({ key: c.code, label: c.name, color: c.color }));
  const cell = (code: string, year: number): number | null => (subset[code] as AnnualPoint[]).find((p) => p.year === year)?.value ?? null;
  const barData = years.map((y) => ({ period: String(y), ...Object.fromEntries(shown.map((c) => [c.code, cell(c.code, y)])) }));
  const common = latestCommonYear(subset);
  const prevCommon = common !== null && shown.every((c) => cell(c.code, common - 1) !== null) ? common - 1 : null;

  const toggles: LegendItem[] = COUNTRIES.filter((c) => c.code !== "PAK").map((c) => ({ key: c.code, label: c.name, color: `var(--pe-viz-${c.color})`, disabled: !intl.series[c.code] }));
  const toggle = (k: string) => setPeers((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  // How PEIC's monthly series relates to the World Bank annual figure, from live data.
  const fullYears = [...new Set(monthlyHeadline.map((p) => p.month.slice(0, 4)))].filter((y) => monthlyHeadline.filter((p) => p.month.startsWith(y)).length === 12);
  const refYear = fullYears.map(Number).reverse().find((y) => cell("PAK", y) !== null);
  const refMean = refYear ? monthlyHeadline.filter((p) => p.month.startsWith(String(refYear))).reduce((s, p) => s + p.value, 0) / 12 : null;

  const tableRows = years.map((y) => [String(y), ...shown.map((c) => { const v = cell(c.code, y); return v === null ? null : `${formatValue(v, 2)}%`; })]);
  const dotRows = common !== null ? rankDescending(shown.map((c) => ({ key: c.code, label: c.name, value: cell(c.code, common), color: c.color })), (r) => r.value as number) : [];

  return (
    <div className="flex flex-col gap-7">
      <Callout title="One definition, one source">
        Every country below is the World Bank&rsquo;s <strong className="font-medium text-pe-text">annual consumer-price inflation</strong> (indicator FP.CPI.TOTL.ZG): the average CPI of a calendar year compared with the previous year&rsquo;s average, as a percentage. All four countries use the same indicator, so the figures are comparable. They are <strong className="font-medium text-pe-text">annual averages</strong>, so they will not match the monthly year-on-year rates elsewhere on this page.
        {refYear && refMean !== null && (
          <>
            {" "}For example, in {refYear} the World Bank&rsquo;s figure for Pakistan was {formatValue(cell("PAK", refYear) as number, 2)}%, while the average of PEIC&rsquo;s twelve monthly year-on-year readings was {formatValue(refMean, 2)}%.
          </>
        )}
      </Callout>

      <ControlBar>
        <SeriesToggles label="Compare Pakistan with" items={toggles} active={peers} onToggle={toggle} minActive={0} />
        <Segmented name="intl-span" label="Years" value={span} onChange={setSpan} options={[{ value: "10", label: "Last 10" }, { value: "all", label: "All" }]} />
      </ControlBar>

      <ChartFrame
        title="Annual inflation by country"
        howToRead="Each cluster is one calendar year; each bar is that country's inflation for the year. A missing bar means the World Bank has no value for that country and year."
        legend={<Key items={specs.map((s) => ({ label: s.label, color: `var(--pe-viz-${s.color})` }))} />}
        source={`Source: World Bank FP.CPI.TOTL.ZG · annual %, calendar years${intl.lastUpdated ? ` · dataset updated ${intl.lastUpdated}` : ""} · ${years[0]}–${years[years.length - 1]}`}
        table={{ caption: "Annual consumer-price inflation, %", head: ["Year", ...shown.map((c) => c.name)], rows: tableRows }}
      >
        <ClusteredBars data={barData} series={specs} height={340} ariaLabel={`Clustered bars of annual inflation for ${shown.map((c) => c.name).join(", ")}, ${years[0]} to ${years[years.length - 1]}`} />
      </ChartFrame>

      <ChartFrame
        title="Long-run trend"
        howToRead="The same annual figures as lines. Note the different scales of the swings: a few years of very high inflation can dwarf the rest."
        legend={<Key items={specs.map((s) => ({ label: s.label, color: `var(--pe-viz-${s.color})` }))} />}
        source="Source: World Bank FP.CPI.TOTL.ZG · annual %, calendar years"
      >
        <MultiLine data={matrix.years.map((y) => ({ period: String(y), ...Object.fromEntries(shown.map((c) => [c.code, cell(c.code, y)])) }))} series={specs} height={320} ariaLabel={`Annual inflation lines for ${shown.map((c) => c.name).join(", ")}`} />
      </ChartFrame>

      <ChartFrame
        title="Country by year"
        howToRead="Each cell is one country's annual inflation in one year. Darker = higher; blue = prices fell on average (deflation). Hatched = no value."
        source={`Source: World Bank FP.CPI.TOTL.ZG · annual %, calendar years · ${years[0]}–${years[years.length - 1]}`}
      >
        <Heatmap
          rows={shown.map((c) => ({ key: c.code, label: c.name, cells: years.map((y) => cell(c.code, y)) }))}
          columns={years.map((y) => ({ key: String(y), label: String(y) }))}
          scale={YOY_SCALE}
          minCellWidth={48}
          labelWidth={104}
          caption="Annual consumer-price inflation by country and year, %"
          cellTitle={(r, c, v) => `${r.label}, ${c.label}: ${v === null ? "no data" : `${formatValue(v, 2)}% (annual average)`}`}
        />
      </ChartFrame>

      {common !== null ? (
        <div className="grid gap-7 lg:grid-cols-2">
          <ChartFrame title={`${common}: the latest year every country reports`} howToRead="One dot per country for the latest year all of the selected countries have a value, highest first." source={`Source: World Bank FP.CPI.TOTL.ZG · ${common}`}>
            <DotPlot rows={dotRows} ariaLabel={`Dot plot of annual inflation in ${common} for ${shown.map((c) => c.name).join(", ")}`} decimals={2} />
          </ChartFrame>
          {prevCommon !== null ? (
            <ChartFrame title={`${prevCommon} → ${common}`} howToRead="Open dot = the earlier year, filled dot = the later year. The figure at the right is the change in percentage points." source={`Source: World Bank FP.CPI.TOTL.ZG · ${prevCommon} and ${common}`}>
              <DumbbellPlot rows={shown.map((c) => ({ key: c.code, label: c.name, from: cell(c.code, prevCommon), to: cell(c.code, common) }))} fromLabel={String(prevCommon)} toLabel={String(common)} decimals={2} zeroBaseline ariaLabel={`Dumbbell plot of annual inflation, ${prevCommon} to ${common}`} />
            </ChartFrame>
          ) : null}
        </div>
      ) : (
        <Callout tone="limit" title="No common year">The selected countries do not share a year with data, so no like-for-like comparison is drawn.</Callout>
      )}
      <p className="text-[12px] leading-relaxed text-pe-text-3">
        Limits: annual averages hide what happened within a year; countries measure CPI with different baskets, weights and methods, so the comparison shows how fast each country&rsquo;s own consumer prices rose, not that the same goods cost the same. Sri Lanka&rsquo;s negative values are real: its consumer prices fell on average in those years. Countries shown: {Object.keys(NAME).filter((k) => intl.series[k]).map((k) => NAME[k]).join(", ")}.
      </p>
    </div>
  );
}
