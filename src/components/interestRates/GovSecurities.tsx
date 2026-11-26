"use client";

// Government securities: Chart 4, the "Government Securities Auction Yield Curve" (the Bond Yields workshop's curve explorer, fed with the interest-rate
// dataset's SBP auction files), plus the policy rate minus the 3M T-bill and the 10Y-3M term spread.

import { useState } from "react";
import YieldCurveExplorer from "@/components/bonds/YieldCurveExplorer";
import { Callout, ChartFrame } from "@/components/analytics/ChartFrame";
import { DateLines } from "@/components/analytics/DateCharts";
import { ControlBar, Segmented } from "@/components/analytics/controls";
import type { AuctionRecord } from "@/lib/bonds/types";
import type { DatedPoint } from "@/lib/policyRate/dateSeries";
import { CsvButton } from "./CsvButton";

export interface GovSecData {
  tbills: AuctionRecord[];
  pibs: AuctionRecord[];
  policyMinusTbill: DatedPoint[];
  termSpread: DatedPoint[];
  sbpTbillFrom: string;
  sbpPibFrom: string;
}

export function AuctionYieldCurve({ data, retrievedOn }: { data: GovSecData; retrievedOn: string }) {
  const [def, setDef] = useState<"cutoff" | "wa">("cutoff");
  const rows = [...data.tbills, ...data.pibs]
    .sort((a, b) => a.auctionDate.localeCompare(b.auctionDate))
    .flatMap((a) => Object.entries(a.tenors).map(([t, r]) => [a.auctionDate, a.settlementDate, a.instrument === "tbill" ? "T-bill" : "PIB", t, r!.cutoffYield, r!.waYield, r!.outcome]));
  return (
    <div className="flex flex-col gap-3">
      <Callout title="Auction yields are not market yields">
        These yields are what the government accepted at its own auctions (the primary market). Each tenor is auctioned on its own schedule, so a curve joins
        auctions held on different days, and an auction can fail (no yield). They are not the daily secondary-market yields at which bonds trade afterwards,
        and this is not a complete market yield curve. Cut-off yield = the highest yield accepted; weighted average = the average accepted yield. The two are
        never mixed.
      </Callout>
      <ControlBar>
        <Segmented label="Yield definition" name="ir-curve-def" options={[{ value: "cutoff", label: "Cut-off yield" }, { value: "wa", label: "Weighted-average yield" }]} value={def} onChange={setDef} />
        <CsvButton
          spec={{
            filename: "pakistan-auction-yields.csv",
            head: ["auction_date", "settlement_date", "instrument", "tenor", "cutoff_yield_pct", "weighted_average_yield_pct", "outcome"],
            rows,
            notes: [`Source: SBP tb.xlsx (T-bills, from ${data.sbpTbillFrom}) and Pakinvestbonds.xlsx (fixed-coupon PIBs, from ${data.sbpPibFrom}). Retrieved ${retrievedOn}.`, "Primary-market auction results; not secondary-market yields. A failed tenor has no yield (outcome column)."],
          }}
        />
      </ControlBar>
      <YieldCurveExplorer tbills={data.tbills} pibs={data.pibs} def={def} />
      <p className="font-mono text-[12px] leading-relaxed text-pe-text-3">
        Source: State Bank of Pakistan auction archives — tb.xlsx (T-bills, {data.sbpTbillFrom} onward) and Pakinvestbonds.xlsx (fixed-coupon PIBs, {data.sbpPibFrom} onward). Retrieved {retrievedOn}.
      </p>
    </div>
  );
}

export function AuctionSpreads({ data, retrievedOn }: { data: GovSecData; retrievedOn: string }) {
  const [which, setWhich] = useState<"policy" | "term">("policy");
  const policy = which === "policy";
  const series = policy
    ? [{ key: "pt", label: "Policy rate − 3M T-bill cut-off", color: "orange" as const, kind: "observed" as const, points: data.policyMinusTbill }]
    : [{ key: "ts", label: "10Y PIB − 3M T-bill (cut-off yields)", color: "teal" as const, kind: "observed" as const, points: data.termSpread, dots: true }];
  return (
    <ChartFrame
      title={policy ? "Policy rate minus the 3-month T-bill yield" : "Term spread: 10-year PIB minus 3-month T-bill"}
      howToRead={
        policy
          ? "At each T-bill auction: the policy rate in force that day minus the 3-month cut-off yield. Below zero, the government paid more than the policy rate (investors expected higher rates); above zero, less (cuts expected). Before 25 May 2015 the policy rate was the reverse repo rate (the top of the corridor)."
          : "At each 10-year PIB auction: its cut-off yield minus the 3-month T-bill cut-off from the nearest auction no more than 7 days earlier. Negative means long-term borrowing cost less than short-term (an inverted curve). Long PIB auctions are infrequent, so the series has gaps."
      }
      legend={
        <ControlBar>
          <Segmented label="Spread" name="ir-auction-spread" options={[{ value: "policy", label: "Policy − 3M T-bill" }, { value: "term", label: "10Y − 3M" }]} value={which} onChange={setWhich} />
          <CsvButton spec={{ filename: policy ? "policy-minus-3m-tbill.csv" : "term-spread-10y-3m.csv", head: ["date", "spread_pp", "note"], rows: series[0].points.map((p) => [p.date, p.value, p.note ?? ""]), notes: [`Derived by PEIC from SBP data. Retrieved ${retrievedOn}.`, policy ? "Policy rate in force on the auction date - 3M cut-off yield." : "10Y PIB cut-off - 3M T-bill cut-off (nearest T-bill auction on or before, max 7 days)."] }} />
        </ControlBar>
      }
      source={`Derived from SBP policy rates and auction results (EasyData before ${data.sbpTbillFrom}; SBP auction files after). Retrieved ${retrievedOn}.`}
    >
      <DateLines series={series} from={policy ? "2004-06-01" : "2009-01-01"} to={series[0].points.at(-1)?.date ?? retrievedOn} unit=" pp" ariaLabel={policy ? "Policy rate minus 3-month T-bill cut-off yield at each auction" : "10-year minus 3-month auction yield spread"} maxGapDays={policy ? 45 : 70} markers={policy ? [{ date: "2015-05-25", label: "target rate introduced" }] : []} />
    </ChartFrame>
  );
}
