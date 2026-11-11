"use client";

// Section 8: the policy rate beside market interest rates.
//
// These are DIFFERENT THINGS and are kept visibly apart:
//   - the policy rate is set by the Monetary Policy Committee and changes on decision dates (a step);
//   - the 3-month T-bill and 3-year PIB yields are set at government auctions and move from auction to auction.
// A yield above or below the policy rate is an observation about two instruments on a given date, not an error and not a forecast.
//
// FREQUENCIES. Nothing here is resampled onto months. Each yield is drawn on the dates of its own auctions (the bill roughly fortnightly,
// the bond roughly monthly with long silences, which are drawn as breaks, not joined). A spread is a yield minus the policy rate in effect
// ON the auction day, so a rate change made later in the same month does not distort it. The term spread (3-year PIB minus 3-month bill)
// pairs each PIB auction with the latest bill auction that is at most 21 days older, and is left out where there is none.
//
// WHAT IS NOT HELD. PEIC holds two government-security maturities (3 months, 3 years). A yield curve needs more maturities, so none is
// drawn. KIBOR, deposit rates, lending rates and mortgage rates are not held either.

import { useMemo, useState } from "react";
import { Callout, ChartFrame } from "@/components/analytics/ChartFrame";
import { ControlBar, Key, Segmented } from "@/components/analytics/controls";
import { DateLines, type DateLineSeries } from "@/components/analytics/DateCharts";
import StatStrip from "@/components/policyRate/StatStrip";
import { RANGE_OPTIONS, type RangeKey } from "@/lib/inflation/chartData";
import { rangeStartDate } from "@/lib/policyRate/analytics";
import { formatDate, pct, signedPp } from "@/lib/policyRate/format";
import { TERM_SPREAD_MAX_LAG_DAYS, type PolicyRateViewModel } from "@/lib/policyRate/viewModel";

const inRange = <T extends { date: string }>(xs: readonly T[], from: string | null) => (from === null ? [...xs] : xs.filter((x) => x.date >= from));

export default function MarketRatesSection({ model }: { model: PolicyRateViewModel }) {
  const [range, setRange] = useState<RangeKey>("60");
  const from = rangeStartDate(model.asOf, range);

  const yields: DateLineSeries[] = useMemo(
    () => [
      { key: "policy", label: "SBP policy rate (set by the MPC)", color: "purple", kind: "step", points: model.decisions },
      { key: "tbill", label: "3-month T-bill yield (auction)", color: "orange", kind: "observed", points: model.tbillAuctions },
      { key: "pib", label: "3-year PIB yield (auction)", color: "teal", kind: "observed", points: model.pibAuctions, dash: "6 3", dots: true },
    ],
    [model.decisions, model.tbillAuctions, model.pibAuctions],
  );
  const spreads: DateLineSeries[] = useMemo(
    () => [
      { key: "tbill", label: "3-month T-bill minus policy rate", color: "orange", kind: "observed", points: model.tbillSpreadAt.map((s) => ({ date: s.date, value: s.spread, note: `yield ${pct(s.yield)}, policy rate ${pct(s.policy)} that day` })) },
      { key: "pib", label: "3-year PIB minus policy rate", color: "teal", kind: "observed", dash: "6 3", dots: true, points: model.pibSpreadAt.map((s) => ({ date: s.date, value: s.spread, note: `yield ${pct(s.yield)}, policy rate ${pct(s.policy)} that day` })) },
    ],
    [model.tbillSpreadAt, model.pibSpreadAt],
  );
  const term: DateLineSeries[] = useMemo(
    () => [
      {
        key: "term",
        label: "3-year PIB minus 3-month T-bill",
        color: "blue",
        kind: "observed",
        dots: true,
        points: model.termSpreadAt.map((t) => ({ date: t.date, value: t.spread, note: `PIB ${pct(t.long)} against the bill of ${formatDate(t.shortDate)} at ${pct(t.short)}${t.lagDays > 0 ? ` (${t.lagDays} days earlier)` : ""}` })),
      },
    ],
    [model.termSpreadAt],
  );

  if (model.decisions.length === 0 || (model.tbillAuctions.length === 0 && model.pibAuctions.length === 0)) {
    return <Callout tone="limit" title="Market yields are unavailable right now">The T-bill and PIB auction yields, or the policy-rate history, could not be loaded.</Callout>;
  }

  const tb = model.tbillSpreadAt.length ? model.tbillSpreadAt[model.tbillSpreadAt.length - 1] : null;
  const pb = model.pibSpreadAt.length ? model.pibSpreadAt[model.pibSpreadAt.length - 1] : null;
  const ts = model.termSpreadAt.length ? model.termSpreadAt[model.termSpreadAt.length - 1] : null;
  const current = model.stats?.current ?? null;
  const auctionRows = [
    ...inRange(model.tbillSpreadAt, from).map((s) => ({ date: s.date, row: [formatDate(s.date), "3-month T-bill", pct(s.yield), pct(s.policy), signedPp(s.spread)] })),
    ...inRange(model.pibSpreadAt, from).map((s) => ({ date: s.date, row: [formatDate(s.date), "3-year PIB", pct(s.yield), pct(s.policy), signedPp(s.spread)] })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((x) => x.row);
  const spreadRows = auctionRows.map((r) => [r[0], r[1], r[4]]);

  return (
    <div className="flex flex-col gap-7">
      <Callout title="Three different rates">
        The <strong className="font-medium">policy rate</strong> is decided by the Monetary Policy Committee. The <strong className="font-medium">T-bill and PIB yields</strong> are what investors accept at government auctions, so they move at every auction and can sit above or below the policy rate. Bank deposit rates, lending rates and KIBOR are different again, and PEIC does not hold them, so none is shown here.
      </Callout>

      <StatStrip
        label="Latest auction yields"
        items={[
          ...(current ? [{ label: "SBP policy rate", value: pct(current.value), detail: `in effect since ${formatDate(current.since)}` }] : []),
          ...(model.tbillLatest ? [{ label: "3-month T-bill yield", value: pct(model.tbillLatest.value), detail: <>auction of {formatDate(model.tbillLatest.date)}{tb && tb.date === model.tbillLatest.date ? <>; {signedPp(tb.spread)} pp against the {pct(tb.policy)} policy rate in effect that day</> : null}</> }] : []),
          ...(model.pibLatest ? [{ label: "3-year PIB yield", value: pct(model.pibLatest.value), detail: <>auction of {formatDate(model.pibLatest.date)}{pb && pb.date === model.pibLatest.date ? <>; {signedPp(pb.spread)} pp against the {pct(pb.policy)} policy rate in effect that day</> : null}</> }] : []),
          ...(ts ? [{ label: "Term spread, 3-year minus 3-month", value: `${signedPp(ts.spread)} pp`, detail: `PIB of ${formatDate(ts.date)} against the bill of ${formatDate(ts.shortDate)}${ts.lagDays > 0 ? ` (${ts.lagDays} days earlier)` : ""}` }] : []),
        ]}
      />

      <ControlBar>
        <Segmented name="market-range" label="Time range (all three charts)" value={range} onChange={setRange} options={RANGE_OPTIONS} />
      </ControlBar>

      <ChartFrame
        title="Policy rate and auction yields, on their own dates"
        howToRead="The stepped line is the policy rate. The orange line is each 3-month T-bill auction and the teal dotted line each 3-year PIB auction, drawn on the day of the auction (not averaged into months). A line is broken where there was no auction for more than 75 days. Hover for the latest observation of each series and its date. Percentages."
        legend={<Key items={yields.map((x) => ({ label: x.label, color: `var(--pe-viz-${x.color})` }))} />}
        source={`Source: SBP EasyData · T-bill ${model.tbillAuctions.length} auctions, ${model.tbillAuctions[0] ? formatDate(model.tbillAuctions[0].date) : "none"} to ${model.tbillLatest ? formatDate(model.tbillLatest.date) : "none"} · PIB ${model.pibAuctions.length} auctions, ${model.pibAuctions[0] ? formatDate(model.pibAuctions[0].date) : "none"} to ${model.pibLatest ? formatDate(model.pibLatest.date) : "none"} · policy rate as decided`}
        table={{
          caption: "Auction yields and the policy rate in effect that day",
          head: ["Auction date", "Instrument", "Yield", "Policy rate that day", "Spread (pp)"],
          rows: auctionRows,
        }}
      >
        <DateLines series={yields} from={from} to={model.asOf} height={340} animate ariaLabel="SBP policy rate, 3-month T-bill yield and 3-year PIB yield over time, each on its own dates" />
      </ChartFrame>

      <ChartFrame
        title="Yield minus the policy rate"
        howToRead="Each auction yield less the policy rate that was in effect on the day of that auction, in percentage points. Above zero: the market yield was higher than the policy rate that day; below zero: lower. This is an observation about two instruments on one date, not a forecast."
        legend={<Key items={spreads.map((x) => ({ label: x.label, color: `var(--pe-viz-${x.color})` }))} />}
        source="Source: derived · SBP EasyData · each auction compared with the rate in effect on its own date"
        table={{ caption: "Yield minus the policy rate in effect on each auction day", head: ["Auction date", "Instrument", "Spread (pp)"], rows: spreadRows }}
      >
        <DateLines series={spreads} from={from} to={model.asOf} unit=" pp" decimals={2} axisDecimals={1} height={300} animate ariaLabel="Gap between the 3-month T-bill yield, the 3-year PIB yield and the policy rate in effect on each auction date" />
      </ChartFrame>

      <div className="flex flex-col gap-3">
        <Callout tone="limit" title="Two maturities, not a yield curve">
          PEIC holds two government-security maturities: the 3-month T-bill and the 3-year PIB. A yield curve needs more points on the maturity axis (for example 6-month and 12-month bills and 5- and 10-year bonds), which are not held, so no curve is drawn and no line between the two is implied. What is shown instead is the gap between the two yields, at each PIB auction against the latest bill auction no more than {TERM_SPREAD_MAX_LAG_DAYS} days older. A PIB auction with no such bill auction is left out.
        </Callout>
        <ChartFrame
          title="Term spread: 3-year PIB minus 3-month T-bill"
          howToRead="Positive: the 3-year bond yielded more than the 3-month bill at that point. Negative: it yielded less. Hover for the two yields and the two auction dates. Percentage points."
          legend={<Key items={[{ label: "3-year PIB minus 3-month T-bill", color: "var(--pe-viz-blue)" }]} />}
          source={`Source: derived · SBP EasyData · ${model.termSpreadAt.length} PIB auctions with a bill auction at most ${TERM_SPREAD_MAX_LAG_DAYS} days earlier · the two auctions are on different dates, shown in the tooltip`}
          table={{
            caption: "Term spread at each PIB auction",
            head: ["PIB auction", "PIB yield", "Bill auction used", "Bill yield", "Days earlier", "Spread (pp)"],
            rows: inRange(model.termSpreadAt, from).map((t) => [formatDate(t.date), pct(t.long), formatDate(t.shortDate), pct(t.short), String(t.lagDays), signedPp(t.spread)]),
          }}
        >
          <DateLines series={term} from={from} to={model.asOf} unit=" pp" decimals={2} axisDecimals={1} height={280} animate ariaLabel="Gap between the 3-year PIB yield and the 3-month T-bill yield at each PIB auction" />
        </ChartFrame>
      </div>
    </div>
  );
}
