// Section 13: methodology, formulas, data coverage and limitations.
//
// The coverage table is computed from the data this render actually received —
// not typed in — so it cannot claim a range the data does not have, and it lists
// what PEIC does NOT hold alongside what it does. The data-check list reports
// the measured agreement between sources on this render. Server component.

import Link from "next/link";
import { coverageText, monthsCoverage } from "@/lib/inflation/chartData";
import { monthLabel } from "@/lib/inflation/periods";
import type { InflationViewModel } from "@/lib/inflation/viewModel";
import { DataStatusPanel } from "@/components/inflation/DataSourceStatus";

const DEFS: [string, string][] = [
  ["What CPI measures", "The Consumer Price Index tracks the cost of a fixed basket of goods and services bought by households, as priced by the Pakistan Bureau of Statistics (PBS). It is an index: a price LEVEL, with 2015-16 set to 100."],
  ["Inflation rate vs index level", "The inflation rate is the percentage change in the index. An index of 307 is not 307% inflation; it means prices are about 3.07 times their 2015-16 level. The two are never plotted on the same axis here."],
  ["Year on year vs month on month", "Year on year compares a month with the same month a year earlier (the rate usually quoted, and the published series). Month on month compares with the previous month, is much more volatile and is not an annual rate. It is derived on this page from the index."],
  ["Headline vs core", "Headline covers the whole basket. Core (NFNE, non-food non-energy) removes food and energy to show the underlying trend. The core and food series PEIC holds are for urban households only."],
  ["Expenditure weights", "PBS assigns each of 12 groups a fixed share of the basket (2015-16 base weights). A weight is a size, not an inflation rate and not a contribution."],
  ["Contributions to headline inflation", "A group's contribution is how many percentage points it adds to the headline change. It depends on the group's weight, its price change and the headline's starting level. Contributions add up to the headline change."],
  ["Urban and rural", "PBS publishes separate urban and rural indices. PEIC holds only urban core and urban food series, not a rural series, so urban and rural cannot be compared here."],
];

const FORMULAS: [string, string][] = [
  ["Year-on-year rate from the index", "(index this month ÷ index twelve months earlier − 1) × 100. Used to cross-check the published series and for every group's rate."],
  ["Month-on-month rate", "(index this month ÷ index last month − 1) × 100."],
  ["Group contribution (percentage points)", "(group weight ÷ total weight) × (group index now − group index then) ÷ headline index then × 100. The twelve contributions sum to the headline's twelve-month change; the page checks this on every load."],
  ["All other groups (not 'non-food')", "Σ(weight × index) over groups 2–12 ÷ Σ(weight) over groups 2–12: a fixed-weight sub-aggregate of the same basket. PBS publishes no non-food series, and its food definition is wider than group 1, so this is not PBS's non-food measure."],
  ["Acceleration", "This month's year-on-year rate minus last month's, in percentage points, for consecutive months only."],
  ["Policy rate in effect", "The latest SBP decision dated in or before the month. The policy rate is a step function, so this is its definition, not an interpolation, and it is never carried past the latest inflation month."],
  ["Distributions", "Histogram bands are 2 percentage points wide. Box plots use quartiles by linear interpolation, whiskers at 1.5 × the interquartile range, and need at least 8 observations."],
];

export default function MethodologySection({ model, relatedLinks }: { model: InflationViewModel; relatedLinks: { href: string; label: string }[] }) {
  const g = model.groups;
  const gMonths = g ? g.yoy[1] : [];
  const intlYears = model.intl?.series.PAK;
  const policyFirst = model.policy[0]?.date;
  const policyLast = model.policy[model.policy.length - 1]?.date;

  // Which path supplied the group panel on THIS render (ledger, or PBS's file as the fallback) — never a fixed claim.
  const gs = model.groupSource;
  const groupSourceText =
    gs?.source === "ledger"
      ? "PEIC observation ledger (PBS SDMX file, ingested), validated on load"
      : gs?.source === "pbs-live"
        ? "PBS SDMX file, read directly (fallback), validated on load"
        : "PBS SDMX file (not available on this load)";

  const coverage: { series: string; freq: string; span: string; unit: string; source: string }[] = [
    { series: "Headline CPI inflation (national)", freq: "Monthly", span: coverageText(model.headline), unit: "% year on year", source: "SBP EasyData; PBS release overrides when newer" },
    { series: "Core inflation, NFNE (urban)", freq: "Monthly", span: coverageText(model.core), unit: "% year on year", source: "SBP EasyData; PBS release overrides when newer" },
    { series: "Food inflation (urban)", freq: "Monthly", span: coverageText(model.food), unit: "% year on year", source: "SBP EasyData" },
    { series: "National CPI index", freq: "Monthly", span: coverageText(model.index), unit: "index, 2015-16 = 100", source: "PBS (SDMX file)" },
    { series: "Month-on-month change (derived)", freq: "Monthly", span: coverageText(model.mom), unit: "% month on month", source: "Derived from the PBS index" },
    { series: "CPI group indices and weights (12 groups)", freq: "Monthly", span: g ? monthsCoverage(g.indexMonths) : "unavailable on this load", unit: "index; weight %", source: groupSourceText },
    { series: "Group year-on-year rates (derived)", freq: "Monthly", span: coverageText(gMonths), unit: "% year on year", source: "Derived from the group indices" },
    { series: "SBP policy rate", freq: "On decision", span: policyFirst ? `${policyFirst} – ${policyLast} (${model.policy.length} decisions)` : "no observations", unit: "%", source: "SBP EasyData" },
    { series: "Annual CPI inflation, four countries", freq: "Annual", span: intlYears?.length ? `${intlYears[0].year} – ${intlYears[intlYears.length - 1].year}` : "unavailable on this load", unit: "% (annual average)", source: "World Bank FP.CPI.TOTL.ZG" },
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
        <h3 className="mb-2 text-[14px] font-semibold text-pe-text">How derived figures are calculated</h3>
        <p className="mb-2 max-w-3xl text-[13px] leading-relaxed text-pe-text-2">Anything not published as such is derived, and is labelled &ldquo;derived&rdquo; where it appears. These are the formulas.</p>
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
          <li>Rural headline, core and food inflation; urban headline and urban group series</li>
          <li>A national core or national food series (the core and food series held are urban)</li>
          <li>A published non-food series, and perishable / non-perishable food</li>
          <li>Monthly peer-country inflation (only annual figures are held)</li>
          <li>CPI group data before {g ? monthLabel(g.indexMonths[0]) : "the start of PBS’s group file"}</li>
        </ul>
      </div>

      <div id="data-status" className="scroll-mt-20">
        <h3 className="mb-2 text-[14px] font-semibold text-pe-text">Where the group data comes from, and how fresh it is</h3>
        <DataStatusPanel source={model.groupSource} />
      </div>

      <div>
        <h3 className="mb-2 text-[14px] font-semibold text-pe-text">Checks run on this page&rsquo;s data</h3>
        {model.checks.length === 0 ? (
          <p className="text-[13px] text-pe-text-2">No cross-source checks could be run on this load.</p>
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
          <li><strong className="font-medium text-pe-text">Revisions and rebasing.</strong> The SBP series reflect the current 2015-16 base. Early values (before 2019) differ from the figures first published under the earlier base, and annual averages of the monthly series can differ from other sources&rsquo; annual figures by more than a point in some years.</li>
          <li><strong className="font-medium text-pe-text">Publication timing.</strong> PBS publishes CPI at the start of the following month; SBP EasyData can lag it. A series that ends earlier than the headline is flagged where it appears.</li>
          <li><strong className="font-medium text-pe-text">Group data has a short history.</strong> PBS&rsquo;s machine-readable group indices begin in {g ? monthLabel(g.indexMonths[0]) : "mid-2022"}, so group year-on-year rates begin a year later, and group month-on-month rates span only {g ? `${(g.indexMonths.length / 12).toFixed(1)} years` : "a few years"}. Patterns across so few years are suggestive, not conclusive.</li>
          <li><strong className="font-medium text-pe-text">Fixed weights.</strong> PBS weights are from the 2015-16 survey. Households have since changed what they buy, so the weights describe the basket PBS prices, not today&rsquo;s spending.</li>
          <li><strong className="font-medium text-pe-text">International comparison.</strong> Annual averages, calendar years, each country&rsquo;s own CPI basket and method. They show how fast each country&rsquo;s own consumer prices rose.</li>
          <li><strong className="font-medium text-pe-text">No causes.</strong> Differences between urban and national figures, between groups, and between inflation and the policy rate are observations. The data here cannot show why they occur.</li>
        </ul>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-[14px] font-semibold text-pe-text">Download the data</h3>
          <ul className="flex flex-col gap-1.5 text-[13px]">
            {[
              ["/api/datasets/sbp-cpi-inflation", "Headline CPI inflation (Excel)"],
              ["/api/datasets/sbp-core-inflation", "Core inflation, NFNE (Excel)"],
              ["/api/datasets/sbp-policy-rate", "SBP policy rate (Excel)"],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} download className="text-pe-accent hover:underline">{label}</a>
              </li>
            ))}
            <li>
              <Link href="/download-datasets" className="text-pe-accent hover:underline">All datasets, with source and period details →</Link>
            </li>
          </ul>
          <p className="mt-2 text-[12px] leading-relaxed text-pe-text-3">The downloads carry the published series with their provenance. Derived figures on this page (month-on-month, group rates, contributions) are not part of them; their formulas are above.</p>
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
