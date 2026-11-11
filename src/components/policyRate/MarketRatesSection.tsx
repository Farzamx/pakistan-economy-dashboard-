"use client";

// Section 8: the policy rate beside market interest rates.
//
// These are DIFFERENT THINGS and are kept visibly apart:
//   - the policy rate is set by the Monetary Policy Committee and changes on decision dates (a step);
//   - the 3-month T-bill and 3-year PIB yields are set at government auctions and move from auction to auction.
// A yield above or below the policy rate is an observation about two instruments on a given date, not an error and not a forecast.
// The T-bill and PIB lines use the LAST auction of each month, so a month with no auction is a gap in the line (never carried forward).
// Not held by PEIC, so not shown: KIBOR, deposit rates, lending rates and mortgage rates.

import { useMemo, useState } from "react";
import { Callout, ChartFrame } from "@/components/analytics/ChartFrame";
import { ControlBar, Key, Segmented } from "@/components/analytics/controls";
import { MultiLine, type SeriesSpec } from "@/components/analytics/TimeCharts";
import { coverageText, mergeSeries, RANGE_OPTIONS, sliceRange, tableRowsFor, unionMonths, type RangeKey } from "@/lib/inflation/chartData";
import { monthLabel } from "@/lib/inflation/periods";
import { formatDate, pct, signedPp } from "@/lib/policyRate/format";
import type { PolicyRateViewModel } from "@/lib/policyRate/viewModel";

const SERIES: SeriesSpec[] = [
  { key: "policy", label: "SBP policy rate (set by the MPC)", color: "purple", step: true },
  { key: "tbill", label: "3-month T-bill yield (auction)", color: "orange" },
  { key: "pib", label: "3-year PIB yield (auction)", color: "teal", dash: "6 3" },
];

export default function MarketRatesSection({ model }: { model: PolicyRateViewModel }) {
  const [range, setRange] = useState<RangeKey>("60");
  const all = useMemo(() => ({ policy: model.policyMonthly, tbill: model.tbill, pib: model.pib }), [model.policyMonthly, model.tbill, model.pib]);
  const sliced = useMemo(() => Object.fromEntries(Object.entries(all).map(([k, v]) => [k, sliceRange(v, range)])), [all, range]);
  const months = useMemo(() => unionMonths(sliced), [sliced]);

  if (model.policyMonthly.length === 0 || (model.tbill.length === 0 && model.pib.length === 0)) {
    return <Callout tone="limit" title="Market yields are unavailable right now">The T-bill and PIB auction yields, or the policy-rate history, could not be loaded.</Callout>;
  }
  const tb = model.tbillSpread[model.tbillSpread.length - 1] ?? null;
  const pb = model.pibSpread[model.pibSpread.length - 1] ?? null;

  return (
    <div className="flex flex-col gap-7">
      <Callout title="Three different rates">
        The <strong className="font-medium">policy rate</strong> is decided by the Monetary Policy Committee. The <strong className="font-medium">T-bill and PIB yields</strong> are what investors accept at government auctions, so they move at every auction and can sit above or below the policy rate. Bank deposit rates, lending rates and KIBOR are different again, and PEIC does not hold them, so none is shown here.
      </Callout>

      <ChartFrame
        title="Policy rate and market yields"
        howToRead="The stepped line is the policy rate. The other lines are the last auction yield of each month. A gap means no auction that month. All are percentages."
        legend={
          <ControlBar>
            <Key items={SERIES.map((s) => ({ label: s.label, color: `var(--pe-viz-${s.color})` }))} />
            <Segmented name="market-range" label="Time range" value={range} onChange={setRange} options={RANGE_OPTIONS} />
          </ControlBar>
        }
        source={`Source: SBP EasyData · T-bill ${coverageText(model.tbill)} · PIB ${coverageText(model.pib)} · last auction of each month · policy rate as the rate in effect at month-end`}
        table={{ caption: "Policy rate and auction yields, by month", head: ["Month", ...SERIES.map((s) => s.label)], rows: tableRowsFor(sliced, months, 2, "%") }}
      >
        <MultiLine data={mergeSeries(sliced, months)} series={SERIES} decimals={2} height={340} ariaLabel="SBP policy rate, 3-month T-bill yield and 3-year PIB yield over time" />
      </ChartFrame>

      <dl className="grid gap-3 sm:grid-cols-2">
        {[
          ["3-month T-bill yield vs policy rate", model.tbillLatest, tb],
          ["3-year PIB yield vs policy rate", model.pibLatest, pb],
        ].map(([title, latest, spread]) => {
          const l = latest as { date: string; value: number } | null;
          const sp = spread as { month: string; value: number } | null;
          return (
            <div key={String(title)} className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface px-3 py-2.5">
              <dt className="text-[12px] text-pe-text-2">{String(title)}</dt>
              <dd className="mt-0.5 text-[16px] font-semibold tabular-nums text-pe-text">{sp ? `${signedPp(sp.value)} pp` : "—"}</dd>
              <dd className="mt-0.5 text-[11.5px] leading-snug text-pe-text-2">
                {l ? `Latest auction ${formatDate(l.date)}: ${pct(l.value)}.` : "No auction on record."}
                {sp ? ` Spread for ${monthLabel(sp.month)}: that month's last auction minus the policy rate in effect.` : ""}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
