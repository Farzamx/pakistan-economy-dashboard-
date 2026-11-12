"use client";

import { useState } from "react";
import { Callout } from "@/components/analytics/ChartFrame";
import { Segmented } from "@/components/analytics/controls";
import { KpiTile } from "@/components/analytics/KpiTile";
import AnimatedFigure from "@/components/policyRate/AnimatedFigure";
import Section from "@/components/shell/Section";
import AuctionFlowExplorer from "./AuctionFlowExplorer";
import TermStructureSection from "./TermStructureSection";
import YieldCurveExplorer from "./YieldCurveExplorer";
import YieldHistorySection from "./YieldHistorySection";
import { YIELD_DEFINITION_LABEL, YIELD_DEFINITION_NOTE, type YieldDefinition } from "@/lib/bonds/analytics";
import type { DataFreshness, SnapshotTile } from "@/lib/bonds/snapshot";
import type { AuctionRecord } from "@/lib/bonds/types";
import type { DatedPoint } from "@/lib/policyRate/dateSeries";
import { formatDate } from "@/lib/policyRate/format";

interface BondWorkshopProps {
  tbills: AuctionRecord[];
  pibs: AuctionRecord[];
  policy: DatedPoint[] | null;
  /** The snapshot tiles under each definition, built on the server. */
  snapshot: Record<YieldDefinition, SnapshotTile[]>;
  freshness: DataFreshness;
}

/**
 * The interactive part of the workshop. One choice, cut-off or weighted-average yield, drives every figure and chart below it, so the page never shows
 * two definitions side by side without saying which is which.
 */
export default function BondWorkshop({ tbills, pibs, policy, snapshot, freshness }: BondWorkshopProps) {
  const [def, setDef] = useState<YieldDefinition>("cutoff");
  const tiles = snapshot[def];
  return (
    <>
      <Section
        id="latest"
        title="Latest auctions"
        description={`${YIELD_DEFINITION_LABEL[def]} at each tenor's most recent auction.`}
        actions={<Segmented label="Yield" name="bond-def" value={def} onChange={setDef} options={[{ value: "cutoff", label: "Cut-off" }, { value: "wa", label: "Weighted average" }]} />}
      >
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="bond-snapshot">
            {tiles.map((t) => (
              <KpiTile key={t.key} label={t.label} kind={t.kind} value={<AnimatedFigure value={t.value} />} period={t.period} previous={t.previous} change={t.change} source="SBP auction archive" note={t.note} warning={t.warning} />
            ))}
          </div>
          <p className="text-[12px] text-pe-text-3" data-testid="bond-definition-note">
            {YIELD_DEFINITION_LABEL[def]}: {YIELD_DEFINITION_NOTE[def]} Auction (primary-market) yields, percent per annum. T-bills: {freshness.latestTBillAuction ? formatDate(freshness.latestTBillAuction) : "n/a"}. PIBs: {freshness.latestPibAuction ? formatDate(freshness.latestPibAuction) : "n/a"}.
          </p>
          {freshness.stale && (
            <Callout tone="limit" title="This data may be out of date">
              The auction archive was last read on {formatDate(freshness.retrievedOn)}, {freshness.ageDays} days ago. SBP holds T-bill auctions every two weeks, so newer auctions probably exist that this page does not show yet.
            </Callout>
          )}
        </div>
      </Section>

      <Section id="curve" title="Yield curve explorer" description="Yield by maturity. Pick an auction, compare it with another.">
        <YieldCurveExplorer tbills={tbills} pibs={pibs} def={def} />
      </Section>

      <Section id="history" title="Yield history" description="Every auction since 2014, beside the policy rate.">
        <YieldHistorySection tbills={tbills} pibs={pibs} policy={policy} def={def} />
      </Section>

      <Section id="term" title="Curve shape over time" description="When long yields sat above or below short ones.">
        <TermStructureSection tbills={tbills} pibs={pibs} def={def} />
      </Section>

      <Section id="auctions" title="Auction demand" description="Bids offered and accepted, against each target.">
        <AuctionFlowExplorer tbills={tbills} pibs={pibs} def={def} />
      </Section>
    </>
  );
}
