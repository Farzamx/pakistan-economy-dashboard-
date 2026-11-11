// Section 1: the opening KPI strip.
//
// The policy-rate tile shows the EXISTING canonical KPI (value, change and freshness verdict exactly as every other page shows them);
// nothing here recomputes or restyles that number. The other tiles each say what KIND of number they are, when it is for, and where it
// came from: the real rate is labelled ex-post, the T-bill yield is labelled a market yield and is dated by its own auction.
//
// Server component.

import DataQualityBadge from "@/components/DataQualityBadge";
import AnimatedFigure from "@/components/policyRate/AnimatedFigure";
import { Callout } from "@/components/analytics/ChartFrame";
import { KpiTile } from "@/components/analytics/KpiTile";
import type { SbpIndicatorResult } from "@/lib/data/sbp";
import { monthLabel } from "@/lib/inflation/periods";
import { formatDate, pct, signedPp } from "@/lib/policyRate/format";
import type { PolicyRateViewModel } from "@/lib/policyRate/viewModel";

export default function OverviewSection({ kpi, model }: { kpi: SbpIndicatorResult; model: PolicyRateViewModel }) {
  const s = model.stats;
  if (!s) {
    return (
      <Callout tone="limit" title="The policy-rate history is unavailable right now">
        The SBP policy-rate observations could not be loaded, so the figures and charts that depend on them are not shown. Nothing is estimated in their place.
      </Callout>
    );
  }
  const k = kpi.kpi;
  const last = model.changes[model.changes.length - 1] ?? null;
  const real = model.realHeadline[model.realHeadline.length - 1] ?? null;
  const tb = model.tbillLatest;
  // Against the policy rate in effect ON the auction day (the rate may have changed since): the date-exact spread, not today's rate.
  const tbAt = model.tbillSpreadAt.length ? model.tbillSpreadAt[model.tbillSpreadAt.length - 1] : null;
  const tbVsPolicy = tb && tbAt && tbAt.date === tb.date ? tbAt : null;
  const run = model.cycles[model.cycles.length - 1] ?? null;

  return (
    <div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        <KpiTile
          label="SBP policy rate"
          kind="Policy rate"
          value={<AnimatedFigure value={`${k.value}${k.unit ?? "%"}`} />}
          change={k.change}
          period={`In effect since ${formatDate(s.current.since)}`}
          previous={s.previous ? `${pct(s.previous.value)} until ${formatDate(s.previous.until)}` : null}
          source="SBP policy (target) rate · SBP EasyData"
          badge={k.freshness ? <DataQualityBadge kpi={k} freshness={k.freshness} /> : undefined}
          note="The benchmark rate set by the Monetary Policy Committee."
        />
        {last && (
          <KpiTile
            label="Latest rate change"
            kind="Change in pp"
            value={<AnimatedFigure value={`${signedPp(last.change)} pp`} />}
            period={formatDate(last.date)}
            previous={`${pct(last.from)} to ${pct(last.to)}`}
            source="Derived from the policy-rate history"
            note={`${last.direction === "hike" ? "An increase" : "A cut"}. Percentage points, not percent.`}
          />
        )}
        {real && (
          <KpiTile
            label="Real policy rate"
            kind="Ex-post, derived"
            value={<AnimatedFigure value={pct(real.real)} />}
            period={monthLabel(real.month)}
            previous={`policy ${pct(real.policy)} vs inflation ${pct(real.inflation, 1)}`}
            source="Policy rate and headline CPI inflation (YoY)"
            note="Policy rate set against inflation that has already happened; not a market or expected real rate."
          />
        )}
        {tb && (
          <KpiTile
            label="3-month T-bill yield"
            kind="Market yield"
            value={<AnimatedFigure value={pct(tb.value)} />}
            period={`Auction of ${formatDate(tb.date)}`}
            change={tbVsPolicy === null ? null : `${signedPp(tbVsPolicy.spread)} pp vs the ${pct(tbVsPolicy.policy)} policy rate in effect that day`}
            source="SBP EasyData · set at auction"
            note="A market yield, not the policy rate. Dated by its own auction."
          />
        )}
      </div>
      {run && (
        <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-pe-text-2">
          {run.latest ? "Latest run of changes: " : ""}
          {run.changes} {run.direction === "tightening" ? (run.changes === 1 ? "increase" : "increases") : run.changes === 1 ? "cut" : "cuts"} between {formatDate(run.startDate)} and {formatDate(run.endDate)} ({signedPp(run.totalChange)} pp, {pct(run.startRate)} to {pct(run.endRate)}). Meetings that left the rate unchanged are not in SBP&rsquo;s series.
        </p>
      )}
    </div>
  );
}
