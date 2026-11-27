import type { Metadata } from "next";
import Link from "next/link";
import { DataPageShell, ShellSection } from "@/components/seo/DataPageShell";
import { KiborTenorChart, PolicyKiborSpread } from "@/components/interestRates/KiborCharts";
import { kiborFacts } from "@/lib/interestRates/marketPages";
import { buildDashboard } from "@/lib/interestRates/viewModel";
import { PROVENANCE } from "@/lib/interestRates/dataset";
import { formatDate } from "@/lib/policyRate/format";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

// KIBOR Rates in Pakistan: a public data page built on the validated interest-rate dataset (SBP EasyData, daily KIBOR fixings; scripts/buildInterestRates.ts).
// Every number below is read from that dataset with its own date; nothing is typed in.

const SLUG = "pakistan-kibor-rates";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "KIBOR Rates in Pakistan — Today's Fixings & History";
const DESCRIPTION =
  "Today's KIBOR (Karachi Interbank Offered Rate) for 1 week to 1 year, compared with the SBP policy rate, with daily history since 2005, tenor curves and how KIBOR prices bank loans.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const revalidate = 3600;

const pct = (v: number) => `${v.toFixed(2)}%`;
// Signed percentage points; a change that rounds to zero is written "0.00 pp", never "−0.00".
const pp = (v: number) => {
  const r = Math.round(v * 100) / 100;
  return r === 0 ? "0.00 pp" : `${r > 0 ? "+" : "−"}${Math.abs(r).toFixed(2)} pp`;
};

export default function KiborPage() {
  const f = kiborFacts();
  const kibor = buildDashboard().kibor;
  const retrievedOn = PROVENANCE.kibor.sources[0].retrievedOn;
  const six = f.rows.find((r) => r.tenor === "6M")!;
  const three = f.rows.find((r) => r.tenor === "3M")!;

  const faq = [
    {
      question: "What is the KIBOR rate today?",
      answer: `On ${formatDate(f.date)}, the latest fixing in the data, 6-month KIBOR was ${pct(six.latest.value)} and 3-month KIBOR ${pct(three.latest.value)}. The full set, from 1 week to 1 year, is in the table on this page. KIBOR is fixed on business days, so on a weekend or holiday the latest fixing is from the previous working day.`,
    },
    {
      question: "Is KIBOR the same as the SBP policy rate?",
      answer: `No. The policy rate is set by the State Bank of Pakistan's Monetary Policy Committee. KIBOR is the average of the rates that contributing banks quote for lending to each other; it is not set by SBP. It usually sits close to the policy rate: on ${formatDate(f.date)} 6-month KIBOR was ${Math.abs(f.spread6m).toFixed(2)} percentage points ${f.spread6m >= 0 ? "above" : "below"} the ${pct(f.policy)} policy rate. KIBOR tends to move before a policy decision when the market expects one.`,
    },
    {
      question: "Why does KIBOR matter for loans?",
      answer: "Most variable-rate bank loans in Pakistan, including business finance, car loans and many mortgages, are priced as KIBOR plus a margin and reset at agreed intervals. When KIBOR rises, the instalments on those loans rise at the next reset.",
    },
    {
      question: "What is the difference between KIBOR and KIBID?",
      answer: "KIBOR is the offer rate: what banks quote for lending. KIBID is the bid rate: what they quote for borrowing, and it is slightly lower. The official benchmark used to price loans is KIBOR. This page shows KIBOR; SBP also publishes KIBID.",
    },
    {
      question: "Why are there no 2-year or 3-year KIBOR rates?",
      answer: "SBP's KIBOR series for 2 and 3 years end on 4 February 2020, when those tenors were discontinued. The page does not extend them; the current tenors run from 1 week to 1 year.",
    },
  ];

  return (
    <DataPageShell
      path={`/${SLUG}`}
      title="KIBOR Rates in Pakistan"
      lead={
        <>
          The Karachi Interbank Offered Rate (KIBOR) is the rate at which banks in Pakistan offer to lend to each other, from one week to one year. It is the
          benchmark most variable-rate loans are priced on. It follows the{" "}
          <Link href="/pakistan-interest-rate" className="text-pe-accent hover:underline">SBP policy rate</Link> closely but is quoted by banks, not set by
          the State Bank.
        </>
      }
      tiles={[
        { label: "6-month KIBOR", value: pct(six.latest.value), date: formatDate(six.latest.date), note: six.yearAgo ? `${pp(six.latest.value - six.yearAgo.value)} vs ${formatDate(six.yearAgo.date)}` : undefined },
        { label: "3-month KIBOR", value: pct(three.latest.value), date: formatDate(three.latest.date), note: three.yearAgo ? `${pp(three.latest.value - three.yearAgo.value)} vs ${formatDate(three.yearAgo.date)}` : undefined },
        { label: "SBP policy rate", value: pct(f.policy), date: `in force on ${formatDate(f.date)}`, note: "Set by the Monetary Policy Committee" },
        { label: "Policy rate − 6M KIBOR", value: pp(-f.spread6m), date: formatDate(f.date), note: "Below zero: KIBOR is above the policy rate (as in the spread chart below)" },
      ]}
      facts={[
        { label: "Source", value: "State Bank of Pakistan, EasyData dataset TS_GP_BAM_SIRKIBOR_D (KIBOR offer rates)" },
        { label: "Unit and frequency", value: "Percent per annum; daily, on business days" },
        { label: "Coverage", value: `${formatDate(f.first)} to ${formatDate(f.date)}, ${f.fixings.toLocaleString("en-US")} fixing days (6-month)` },
        { label: "Latest observation", value: formatDate(f.date) },
        { label: "Data retrieved", value: formatDate(retrievedOn) },
        { label: "Type", value: "Observed (published by SBP); spreads on this page are derived" },
      ]}
      methodology={[
        "KIBOR is fixed each business day from the offer rates quoted by a panel of contributing banks, under the KIBOR framework overseen by the State Bank of Pakistan. SBP publishes the fixings, which are what this page shows, exactly as published.",
        "Monthly figures in the 'over time' view are the average of the fixings actually published in that month; each carries the number of days averaged. The spread is the policy rate in force on the day minus that day's fixing.",
      ]}
      limitations={[
        "SBP's EasyData series lacks some fixing days that SBP prints in its own bulletin (for example 13 and 20 October 2026). They are left missing, not filled in; monthly averages show how many days they use.",
        "2-year and 3-year KIBOR were discontinued on 4 February 2020 and are not shown beyond that date. KIBID (the bid side) is published by SBP but not shown here.",
        "Before 25 May 2015 SBP's policy rate was its reverse repo rate (the top of the interest-rate corridor), so the gap between KIBOR and the policy rate was larger by construction in those years.",
      ]}
      faq={faq}
      related={[...getRelatedLinks(SLUG), { href: "/pakistan-interest-rate#kibor", label: "KIBOR in the Interest Rates dashboard" }]}
      dataset={{
        name: "KIBOR (Karachi Interbank Offered Rate), daily fixings",
        description: "Daily KIBOR offer rates for 1 week to 1 year (2 and 3 years until February 2020), as published by the State Bank of Pakistan.",
        temporalCoverage: `${f.first}/${f.date}`,
        sourceName: "State Bank of Pakistan",
        sourceUrl: "https://easydata.sbp.org.pk/",
        variables: ["KIBOR 1 week", "KIBOR 2 weeks", "KIBOR 1 month", "KIBOR 3 months", "KIBOR 6 months", "KIBOR 9 months", "KIBOR 1 year"],
      }}
    >
      <ShellSection id="latest" title={`KIBOR on ${formatDate(f.date)}`} description="Every published tenor, with the change against earlier fixings.">
        <div className="overflow-x-auto rounded-[var(--pe-radius)] border border-pe-border" tabIndex={0} role="region" aria-label="KIBOR by tenor (scrolls)">
          <table className="w-full min-w-[560px] border-collapse text-[14px] tabular-nums">
            <caption className="sr-only">KIBOR offer rates by tenor on {formatDate(f.date)}, with changes</caption>
            <thead className="bg-pe-surface-2 text-[13px] text-pe-text-2">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium">Tenor</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">KIBOR</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">vs previous fixing</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">vs 1 month earlier</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">vs 1 year earlier</th>
              </tr>
            </thead>
            <tbody>
              {f.rows.map((r) => (
                <tr key={r.tenor} className="border-t border-pe-border">
                  <th scope="row" className="px-3 py-1.5 text-left font-normal text-pe-text-2">{r.tenor}</th>
                  <td className="px-3 py-1.5 text-right font-medium text-pe-text">{pct(r.latest.value)}</td>
                  {[r.previous, r.monthAgo, r.yearAgo].map((o, i) => (
                    <td key={i} className="px-3 py-1.5 text-right text-pe-text-2">
                      {o ? (
                        <>
                          {pp(r.latest.value - o.value)}
                          <span className="block text-[11px] text-pe-text-3">{formatDate(o.date)}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-pe-text-2">
          Since daily fixings began in the data ({formatDate(f.first)}), 6-month KIBOR has ranged from {pct(f.low6m.value)} ({formatDate(f.low6m.date)}) to{" "}
          {pct(f.high6m.value)} ({formatDate(f.high6m.date)}), when the policy rate stood at its 22% peak. A curve that rises from 1 week to 1 year means
          banks charge more for longer loans, often because they expect rates to stay high or rise; a falling curve usually means cuts are expected.
        </p>
      </ShellSection>

      <ShellSection id="tenors" title="KIBOR across tenors and over time" description="Compare tenors on chosen dates, or follow them month by month since 2005.">
        <KiborTenorChart data={kibor} retrievedOn={retrievedOn} />
      </ShellSection>

      <ShellSection id="spread" title="KIBOR and the SBP policy rate" description="How far the interbank rate sits from the policy rate, in percentage points.">
        <PolicyKiborSpread data={kibor} retrievedOn={retrievedOn} />
      </ShellSection>
    </DataPageShell>
  );
}
