// Section 11: methodology, formulas, data coverage, data status and limitations.
//
// The coverage table is computed from the data this render actually received, not typed in, so it cannot claim a range the data does not
// have, and it lists what PEIC does NOT hold alongside what it does. The data-check list reports what the checks found on this render.
// Server component.

import Link from "next/link";
import { formatUtc } from "@/components/inflation/DataSourceStatus";
import { coverageText, monthsCoverage } from "@/lib/inflation/chartData";
import { formatDate } from "@/lib/policyRate/format";
import type { PolicyRateViewModel } from "@/lib/policyRate/viewModel";

const DEFS: [string, string][] = [
  ["The policy rate", "The State Bank of Pakistan's benchmark interest rate, decided by its Monetary Policy Committee. PEIC uses SBP's own series, the policy (target) rate, in percent. It changes on decision dates and holds its level in between."],
  ["Percent and percentage points", "A move from 11.5% to 12% is +0.5 percentage points (pp). It is not 0.5%, and it is not a 4.3% rise in the rate. Changes in this page are always in percentage points."],
  ["Increase, cut, tightening, easing", "An increase raises the policy rate and a cut lowers it. A tightening cycle is a run of increases and an easing cycle is a run of cuts, as defined below."],
  ["Policy rate, market yields and bank rates", "The policy rate is set by committee. Treasury-bill and PIB yields are set at government auctions and move at every auction. KIBOR, deposit rates and lending rates are set in the market and by banks. They are different rates; PEIC holds the first two only, and compares them with the policy rate without treating them as the same thing."],
  ["Real policy rate", "The policy rate set against inflation that has already happened. It is an ex-post, backward-looking measure, not a market real rate and not an expected one: no inflation forecast is used. It is not what a saver earns or a borrower pays."],
];

const FORMULAS: [string, string][] = [
  ["Change in the policy rate", "New rate − previous rate, in percentage points. The first observation is a starting level, not a change. A row that repeats the previous rate is not a change."],
  ["Cycle", "A maximal run of consecutive changes in the same direction. A cycle ends only when the next change goes the other way, so a long pause between two increases does not split a run. Its span runs from its first change to its last."],
  ["Policy rate in a month", "The latest observation dated in or before that month: a step function, never interpolated, and never carried past the newest month of data. This is the same rule the Inflation page uses."],
  ["Real policy rate", "((1 + policy rate) ÷ (1 + inflation) − 1) × 100, using year-on-year inflation for the month. The simple difference (policy rate − inflation) is only an approximation and is poor when inflation is high."],
  ["Inflation known at a change", "The CPI of the month before the month of the change: PBS publishes the monthly CPI at the start of the following month, so a decision in October is made with September's figure. If that month is missing the figure is left blank, never the nearest month."],
  ["Time-weighted average", "Σ (rate × days in effect) ÷ total days, from the first observation to the date this page was generated. A rate that lasted two years counts for two years, whatever the number of observations."],
  ["Market yield each month, and the spread", "For the T-bill and PIB: the last auction of the month (a month with no auction is a gap). Spread = that yield − the policy rate in effect at the month-end."],
  ["Gap to the US", "Pakistan's policy rate in effect at the month-end − the US effective federal funds rate for the month, in percentage points."],
];

export default function MethodologySection({ model, generatedAt, relatedLinks }: { model: PolicyRateViewModel; generatedAt: string; relatedLinks: { href: string; label: string }[] }) {
  const s = model.stats;
  const src = model.source;
  const first = model.decisions[0];
  const last = model.decisions[model.decisions.length - 1];

  const coverage: { series: string; freq: string; span: string; unit: string; source: string }[] = [
    { series: "SBP policy rate (each observation)", freq: "On a change", span: first && last ? `${formatDate(first.date)} – ${formatDate(last.date)} (${model.decisions.length} observations)` : "unavailable on this load", unit: "%", source: "SBP EasyData, series SBPOL0030, via the PEIC ledger" },
    { series: "Policy rate by month (derived)", freq: "Monthly", span: coverageText(model.policyMonthly), unit: "%", source: "Derived from the observations above" },
    { series: "Headline CPI inflation (national)", freq: "Monthly", span: coverageText(model.headline), unit: "% year on year", source: "SBP EasyData; PBS release overrides when newer" },
    { series: "Core inflation, NFNE (urban)", freq: "Monthly", span: coverageText(model.core), unit: "% year on year", source: "SBP EasyData; PBS release overrides when newer" },
    { series: "Real policy rate (derived)", freq: "Monthly", span: model.realHeadline.length ? monthsCoverage(model.realHeadline.map((p) => p.month)) : "unavailable on this load", unit: "%", source: "Policy rate and headline or core inflation" },
    { series: "3-month T-bill yield", freq: "Each auction (last per month shown)", span: coverageText(model.tbill), unit: "%", source: "SBP EasyData" },
    { series: "3-year PIB yield", freq: "Each auction (last per month shown)", span: coverageText(model.pib), unit: "%", source: "SBP EasyData" },
    { series: "US effective federal funds rate", freq: "Monthly", span: coverageText(model.fedFunds), unit: "%", source: "FRED" },
  ];

  const status: [string, React.ReactNode][] = [
    ["Series", src?.seriesKey ? `${src.seriesName ?? "SBP policy (target) rate"} (${src.seriesKey})` : "not available on this load"],
    ["Where it was read from", src?.status === "ledger" ? "The PEIC observation ledger (SBP EasyData series, ingested)" : src?.status === "fallback" ? "Not the ledger: only a static fallback snapshot was available, which this page does not analyse" : "unavailable"],
    ["Newest observation", src?.latestObservation ? formatDate(src.latestObservation) : "—"],
    ["Stored in PEIC at", src?.lastStoredAt ? formatUtc(src.lastStoredAt) : "—"],
    ["Observations held", src ? String(src.observations) : "—"],
    ["Page generated", `${formatUtc(generatedAt)}, regenerated at most once an hour`],
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="mb-2 text-[14px] font-semibold text-pe-text">What the terms mean</h3>
        <dl className="grid gap-x-8 gap-y-3 md:grid-cols-2">
          {DEFS.map(([t, d]) => (
            <div key={t}>
              <dt className="text-[13px] font-medium text-pe-text">{t}</dt>
              <dd className="mt-0.5 text-[13px] leading-relaxed text-pe-text-2">{d}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <h3 className="mb-2 text-[14px] font-semibold text-pe-text">How the figures are calculated</h3>
        <p className="mb-2 max-w-3xl text-[13px] leading-relaxed text-pe-text-2">Anything not published as such is derived, and is labelled &ldquo;derived&rdquo; where it appears. These are the rules.</p>
        <dl className="flex flex-col divide-y divide-pe-border rounded-[var(--pe-radius)] border border-pe-border">
          {FORMULAS.map(([t, d]) => (
            <div key={t} className="grid gap-1 px-3 py-2.5 md:grid-cols-[16rem_1fr] md:gap-4">
              <dt className="text-[13px] font-medium text-pe-text">{t}</dt>
              <dd className="text-[13px] leading-relaxed text-pe-text-2">{d}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <h3 className="mb-2 text-[14px] font-semibold text-pe-text">Data coverage on this page</h3>
        <div className="relative overflow-x-auto rounded-[var(--pe-radius)] border border-pe-border" tabIndex={0} role="region" aria-label="Series used on this page (scrolls sideways)">
          <table className="w-full min-w-[720px] border-collapse text-left text-[12.5px]">
            <caption className="sr-only">Series used on this page: frequency, coverage, unit and source</caption>
            <thead className="bg-pe-surface-2 text-pe-text-2">
              <tr>
                {["Series", "Frequency", "Coverage", "Unit", "Source"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-pe-text-2">
              {coverage.map((r) => (
                <tr key={r.series} className="border-t border-pe-border">
                  <th scope="row" className="px-3 py-1.5 text-left font-normal text-pe-text">{r.series}</th>
                  <td className="px-3 py-1.5">{r.freq}</td>
                  <td className="px-3 py-1.5 tabular-nums">{r.span}</td>
                  <td className="px-3 py-1.5">{r.unit}</td>
                  <td className="px-3 py-1.5">{r.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[13px] font-medium text-pe-text">Not held by PEIC, so not shown:</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] leading-relaxed text-pe-text-2">
          <li>Meetings at which the policy rate was held, and any record of how members voted</li>
          <li>KIBOR, bank deposit rates, lending rates and mortgage rates</li>
          <li>Policy rates of any country other than the United States</li>
          <li>Inflation expectations or forecasts, so no expected (ex-ante) real rate</li>
          <li>Policy-rate history before {first ? formatDate(first.date) : "the start of the series"}</li>
        </ul>
      </div>

      <div id="data-status" className="scroll-mt-20">
        <h3 className="mb-2 text-[14px] font-semibold text-pe-text">Where the policy-rate data comes from</h3>
        <dl className="flex flex-col divide-y divide-pe-border rounded-[var(--pe-radius)] border border-pe-border">
          {status.map(([t, d]) => (
            <div key={t} className="grid gap-1 px-3 py-2.5 md:grid-cols-[15rem_1fr] md:gap-4">
              <dt className="text-[13px] font-medium text-pe-text">{t}</dt>
              <dd className="text-[13px] leading-relaxed text-pe-text-2">{d}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-pe-text-3">
          SBP publishes a new row only when the rate takes a new value, so a long gap since the newest observation is normal between decisions and does not by itself mean the data is stale. The headline figure at the top of the page carries the existing freshness verdict.
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-[14px] font-semibold text-pe-text">Checks run on this page&rsquo;s data</h3>
        {model.checks.length === 0 ? (
          <p className="text-[13px] text-pe-text-2">No checks could be run on this load.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {model.checks.map((c) => (
              <li key={c.id} className="flex gap-2 text-[13px] leading-relaxed text-pe-text-2">
                <span
                  aria-label={c.status === "ok" ? "passed" : c.status === "warn" ? "warning" : "note"}
                  className="mt-0.5 inline-block h-4 shrink-0 rounded-[var(--pe-radius-sm)] px-1.5 text-[10px] font-semibold uppercase leading-4"
                  style={c.status === "ok" ? { background: "var(--pe-surface-2)", color: "var(--pe-up)", border: "1px solid var(--pe-border)" } : { background: "var(--pe-warn-bg)", color: "var(--pe-warn-text)", border: "1px solid var(--pe-warn-border)" }}
                >
                  {c.status === "ok" ? "ok" : c.status === "warn" ? "check" : "note"}
                </span>
                <span>{c.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-[14px] font-semibold text-pe-text">Limitations</h3>
        <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-pe-text-2">
          <li><strong className="font-medium text-pe-text">Changes, not meetings.</strong> SBP&rsquo;s series has a row only when the rate takes a new value. Meetings that held the rate are not in it, so this page cannot count them, and a &ldquo;cycle&rdquo; says nothing about pauses inside it. The economic calendar&rsquo;s meeting records are not used here because they are sparse and do not always agree with the series.</li>
          <li><strong className="font-medium text-pe-text">Dates.</strong> Each date is the one SBP&rsquo;s series records. It can fall a day after the committee&rsquo;s meeting.</li>
          <li><strong className="font-medium text-pe-text">Short history.</strong> The series PEIC holds begins in {first ? formatDate(first.date) : "May 2016"}. {s ? `It contains ${s.changeCount} changes in ${model.cycles.length} runs` : "It contains few runs"}, so patterns across cycles are suggestive, not conclusive.</li>
          <li><strong className="font-medium text-pe-text">The real rate is backward-looking.</strong> It uses inflation that has already occurred, headline or core (urban only), and no forecast. It is not a market rate and not what savers or borrowers earn or pay.</li>
          <li><strong className="font-medium text-pe-text">Early inflation figures.</strong> The inflation series reflects the current 2015-16 base. Values before 2019 can differ from the figures first published under the earlier base, so the inflation shown beside the earliest rate changes is the series PEIC holds, not necessarily what was reported at the time.</li>
          <li><strong className="font-medium text-pe-text">Market yields.</strong> Auctions are irregular, so a month can have none, and the last auction of a month is not an average. The 3-month T-bill and 3-year PIB are two points on the yield curve, not &ldquo;the&rdquo; market rate.</li>
          <li><strong className="font-medium text-pe-text">One comparable country.</strong> Only the United States is compared. Differences between countries&rsquo; policy rates do not account for different inflation, mandates or exchange-rate regimes.</li>
          <li><strong className="font-medium text-pe-text">No revisions to show.</strong> Each observation holds a single stored version, so there is no revision history to display; if SBP restated a value, the page would show the latest one.</li>
          <li><strong className="font-medium text-pe-text">No causes.</strong> Co-movement of the policy rate with inflation, yields or the US rate is an observation. This page does not show that one caused another, and it makes no forecast.</li>
        </ul>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-[14px] font-semibold text-pe-text">Download the data</h3>
          <ul className="flex flex-col gap-1.5 text-[13px]">
            <li>
              <a href="/api/datasets/sbp-policy-rate" download className="text-pe-accent underline underline-offset-2">SBP policy rate (Excel)</a>
            </li>
            <li>
              <Link href="/download-datasets" className="text-pe-accent underline underline-offset-2">All datasets, with source and period details →</Link>
            </li>
          </ul>
          <p className="mt-2 text-[12px] leading-relaxed text-pe-text-3">The download carries the published series with its provenance. Derived figures on this page (changes, cycles, real rates, spreads) are not part of it; their rules are above.</p>
        </div>
        {relatedLinks.length > 0 && (
          <div>
            <h3 className="mb-2 text-[14px] font-semibold text-pe-text">Related indicators</h3>
            <ul className="flex flex-wrap gap-2">
              {relatedLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-block rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface px-3 py-1.5 text-[13px] text-pe-text-2 transition-colors hover:border-pe-border-strong hover:text-pe-text">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
