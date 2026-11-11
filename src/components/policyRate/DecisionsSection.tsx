// Section 3: the history of rate CHANGES.
//
// SBP's policy-rate series has one row per date the rate took a value. It is not a list of Monetary Policy Committee meetings: a meeting
// that left the rate unchanged leaves no row. So this table is the record of changes, and it says so. The inflation shown beside each
// change is the CPI of the month before the decision month (the latest figure PBS had published), and the "real rate after" is the NEW
// rate set against that inflation, ex-post and by the exact Fisher formula. Nothing in a row says why the committee acted.
//
// Server component.

import { Callout } from "@/components/analytics/ChartFrame";
import { monthLabel } from "@/lib/inflation/periods";
import { formatDate, pct, signedPp } from "@/lib/policyRate/format";
import type { PolicyRateViewModel } from "@/lib/policyRate/viewModel";

export default function DecisionsSection({ model }: { model: PolicyRateViewModel }) {
  const s = model.stats;
  if (!s || model.changeRows.length === 0) {
    return <Callout tone="limit" title="No rate changes to list">Either the policy-rate history is unavailable or it holds a single level.</Callout>;
  }
  const rows = [...model.changeRows].reverse(); // newest first
  return (
    <div className="flex flex-col gap-5">
      <Callout tone="limit" title="What this table is, and is not">
        It lists every date on which SBP&rsquo;s series records a <strong className="font-medium">new</strong> policy rate: {s.changeCount} changes since {formatDate(s.firstDate)} ({s.hikes} increases, {s.cuts} cuts). Meetings at which the rate was <strong className="font-medium">held</strong>{" "}are not in the series, so they are not listed and cannot be counted. Dates are those SBP&rsquo;s series records, which can fall a day after a committee meeting.
      </Callout>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Changes on record", `${s.changeCount}`],
          ["Increases / cuts", `${s.hikes} / ${s.cuts}`],
          ["Largest increase", s.largestHike ? `${signedPp(s.largestHike.change)} pp · ${formatDate(s.largestHike.date)}` : "—"],
          ["Largest cut", s.largestCut ? `${signedPp(s.largestCut.change)} pp · ${formatDate(s.largestCut.date)}` : "—"],
        ].map(([t, d]) => (
          <div key={t} className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface px-3 py-2.5">
            <dt className="text-[12px] text-pe-text-2">{t}</dt>
            <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-pe-text">{d}</dd>
          </div>
        ))}
      </dl>

      <div>
        <div className="relative max-h-[28rem] overflow-auto rounded-[var(--pe-radius)] border border-pe-border" tabIndex={0} role="region" aria-label="Policy-rate changes, newest first (scrolls)">
          <table className="w-full min-w-[720px] border-collapse text-left text-[12.5px] tabular-nums">
            <caption className="sr-only">Every policy-rate change, newest first, with the inflation known at the time and the real policy rate after the change</caption>
            <thead className="sticky top-0 bg-pe-surface-2 text-pe-text-2">
              <tr>
                {["Date", "Change", "From", "To", "Move", "Inflation known then", "Real rate after (ex-post)"].map((h, i) => (
                  <th key={h} scope="col" className={`px-3 py-2 font-medium ${i >= 1 && i <= 3 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-pe-text">
              {rows.map((r) => (
                <tr key={r.date} className="border-t border-pe-border">
                  <th scope="row" className="whitespace-nowrap px-3 py-1.5 text-left font-normal text-pe-text">{formatDate(r.date)}</th>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right font-medium">{signedPp(r.change)} pp</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right text-pe-text-2">{pct(r.from)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right">{pct(r.to)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-pe-text-2">{r.direction === "hike" ? "Increase" : "Cut"}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-pe-text-2">{r.inflation === null || r.inflationMonth === null ? <span className="text-pe-text-3">not in the data</span> : `${r.inflation.toFixed(1)}% (${monthLabel(r.inflationMonth)})`}</td>
                  <td className="whitespace-nowrap px-3 py-1.5">{r.realAfter === null ? <span className="text-pe-text-3">not in the data</span> : pct(r.realAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 max-w-3xl font-mono text-[11px] leading-relaxed text-pe-text-3">
          Source: SBP EasyData (policy rate), SBP / PBS (headline CPI inflation, YoY). &ldquo;Inflation known then&rdquo; is the CPI of the month before the decision month: PBS publishes the monthly CPI at the start of the following month. &ldquo;Not in the data&rdquo; means that month is outside the inflation series PEIC holds (it begins in July 2016), not that it was zero.
        </p>
      </div>
    </div>
  );
}
