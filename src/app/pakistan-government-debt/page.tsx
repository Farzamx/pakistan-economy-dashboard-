import type { Metadata } from "next";
import Link from "next/link";
import { DataPageShell, ShellSection } from "@/components/seo/DataPageShell";
import { DebtRatioChart, DebtStockChart } from "@/components/governmentDebt/DebtCharts";
import { debtProvenance, debtQuarters, debtRatios, fiscalYearLabel, mofReview, quarterLabel } from "@/lib/governmentDebt/dataset";
import { formatDate } from "@/lib/policyRate/format";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

// Pakistan Government Debt: a public data page built on the fingerprinted government-debt dataset (SBP's Pakistan Debt and Liabilities Summary, checked
// against SBP's own summary table; the Ministry of Finance's Annual Debt Review kept as a separate series). scripts/buildGovernmentDebt.ts.

const SLUG = "pakistan-government-debt";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Government Debt — Public Debt, Debt-to-GDP & History";
const DESCRIPTION =
  "Pakistan's public debt from the State Bank of Pakistan: total, domestic and external government debt, IMF debt, the FRDLA measure and debt-to-GDP since 2009, with the Ministry of Finance's figures and how the definitions differ.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const bn = (v: number) => `Rs ${Math.round(v).toLocaleString("en-US")} bn`;
const tn = (v: number) => `Rs ${(v / 1000).toFixed(1)} trillion`;
const pc = (v: number, dp = 1) => `${v.toFixed(dp)}%`;
const FLAG: Record<string, string> = { P: "provisional", R: "revised" };

export default function GovernmentDebtPage() {
  const q = debtQuarters();
  const ratios = debtRatios();
  const mof = mofReview();
  const prov = debtProvenance();
  const retrievedOn = prov.sources[0].retrievedOn;
  const last = q[q.length - 1];
  const yearAgo = q.find((x) => x.date === `${Number(last.date.slice(0, 4)) - 1}${last.date.slice(4)}`) ?? null;
  const fy = ratios[ratios.length - 1];
  const mofFy = mof.find((m) => m.date === fy.date) ?? null;
  const peak = ratios.reduce((a, b) => (b.grossPublicPct > a.grossPublicPct ? b : a));
  const low = ratios.reduce((a, b) => (b.grossPublicPct < a.grossPublicPct ? b : a));
  const first = ratios[0];
  const domShare = (last.domestic / last.grossPublic) * 100;

  const faq = [
    {
      question: "How much debt does Pakistan's government owe?",
      answer: `At the end of ${quarterLabel(last.date)} (${FLAG[last.flag] ?? "latest"} data), Pakistan's gross public debt was ${bn(last.grossPublic)} (${tn(last.grossPublic)}), according to the State Bank of Pakistan: ${bn(last.domestic)} owed domestically, ${bn(last.external)} owed externally and ${bn(last.imf)} owed to the IMF. Under the narrower legal (FRDLA) definition, which subtracts the government's bank deposits, it was ${bn(last.frdla)}.`,
    },
    {
      question: "What is Pakistan's debt-to-GDP ratio?",
      answer: `At the end of ${fiscalYearLabel(fy.date)}, gross public debt was ${pc(fy.grossPublicPct)} of GDP and FRDLA debt ${pc(fy.frdlaPct)}, by SBP's figures.${mofFy ? ` The Ministry of Finance's Annual Debt Review gives ${pc(mofFy.totalPct)} and ${pc(mofFy.frdlaPct)} for the same date; the small gap comes from the two using different estimates of nominal GDP.` : ""} SBP publishes the ratio only at fiscal-year ends.`,
    },
    {
      question: "Is external debt the same as government debt?",
      answer: `No. Government debt is what the federal and provincial governments owe, at home and abroad. "Total external debt and liabilities" is what the whole country owes abroad, including banks, companies and public enterprises: ${bn(last.totalExternal)} at the end of ${quarterLabel(last.date)}. It overlaps with government debt only in the government's external borrowing and IMF loans. The external debt page covers that wider measure.`,
    },
    {
      question: "What is the FRDLA definition of debt?",
      answer: "The Fiscal Responsibility and Debt Limitation Act, 2005 (amended in 2017) defines the total debt of the government as debt of the federal and provincial governments serviced out of the consolidated fund, plus debt owed to the IMF, less the governments' accumulated deposits with the banking system. It is the legal measure; gross public debt is the larger figure before deposits are subtracted.",
    },
    {
      question: "Why do different sources give different numbers?",
      answer: "Mostly definitions and dates: gross public debt versus the FRDLA measure (net of deposits), whether IMF debt is counted inside external debt (the Ministry does, SBP lists it separately), government debt versus the whole country's debt, and which GDP estimate the ratio uses. Revisions also change recent quarters. This page labels each figure with its source and definition.",
    },
  ];

  return (
    <DataPageShell
      path={`/${SLUG}`}
      title="Pakistan Government Debt"
      lead={
        <>
          How much the federal and provincial governments owe, at home and abroad, from the State Bank of Pakistan&rsquo;s quarterly debt statistics, with
          the Ministry of Finance&rsquo;s own figures alongside. Government debt is built up by borrowing to cover the{" "}
          <Link href="/pakistan-fiscal-deficit" className="text-pe-accent hover:underline">fiscal deficit</Link>; the country&rsquo;s wider borrowing abroad is
          on the <Link href="/pakistan-external-debt" className="text-pe-accent hover:underline">external debt</Link> page.
        </>
      }
      tiles={[
        { label: "Gross public debt", value: tn(last.grossPublic), date: `end ${quarterLabel(last.date)}`, flag: FLAG[last.flag], note: yearAgo ? `${last.grossPublic >= yearAgo.grossPublic ? "+" : "−"}${tn(Math.abs(last.grossPublic - yearAgo.grossPublic))} in a year (vs ${quarterLabel(yearAgo.date)})` : undefined },
        { label: "Debt-to-GDP (gross)", value: pc(fy.grossPublicPct), date: fiscalYearLabel(fy.date), note: `FRDLA measure ${pc(fy.frdlaPct)}` },
        { label: "Domestic share", value: pc(domShare), date: `end ${quarterLabel(last.date)}`, note: `${bn(last.domestic)} of ${bn(last.grossPublic)}` },
        { label: "Owed to the IMF", value: bn(last.imf), date: `end ${quarterLabel(last.date)}`, flag: FLAG[last.flag] },
      ]}
      facts={[
        { label: "Source", value: "State Bank of Pakistan, Pakistan's Debt and Liabilities Summary (EasyData TS_GP_BAM_PKDLP_Q), checked against SBP's published summary table; Ministry of Finance, Annual Debt Review FY-26" },
        { label: "Unit", value: "Billion Pakistani rupees, end of period; ratios in percent of nominal GDP at market prices" },
        { label: "Frequency and coverage", value: `End of ${quarterLabel(q[0].date)}, then quarterly from ${quarterLabel(q[1].date)} to ${quarterLabel(last.date)} (${q.length} observations; SBP does not publish the three quarters in between); debt-to-GDP at fiscal-year ends only, ${fiscalYearLabel(first.date)} to ${fiscalYearLabel(fy.date)}` },
        { label: "Latest observation", value: `${quarterLabel(last.date)}${last.flag ? ` (${FLAG[last.flag]}, as marked by SBP)` : ""}` },
        { label: "Data retrieved", value: formatDate(retrievedOn) },
        { label: "Type", value: "Observed (published by SBP and the Ministry of Finance); shares and changes on this page are derived" },
      ]}
      methodology={[
        "Gross public debt is the sum of three parts SBP reports separately: gross government domestic debt (federal and provincial), government external debt, and debt owed to the IMF. The FRDLA measure subtracts the federal and provincial governments' deposits with the banking system. Both identities were checked for every quarter.",
        "SBP's debt-to-GDP ratios divide the end-June stock by that fiscal year's nominal GDP, per PBS's revised estimates; they were reproduced from the stocks and GDP for every year. No quarterly ratio is computed, because GDP is annual.",
        "The Ministry of Finance's review counts IMF debt inside external debt and divides by a slightly different GDP estimate. Its figures are shown as published, next to SBP's, without adjusting either.",
      ]}
      limitations={[
        `The latest quarter is provisional and recent quarters are revised by SBP (flags shown where SBP prints them: ${q.filter((x) => x.flag).map((x) => `${quarterLabel(x.date)} ${FLAG[x.flag]}`).join(", ")}).`,
        "SBP's notes record breaks in coverage: external debt statistics enhanced from March 2010; long-term zero-coupon PIBs counted at nominal value from June 2025; coverage of public-enterprise domestic debt enhanced from June 2024 (this affects total debt and liabilities, not government debt).",
        "Debt servicing and interest costs are not included in this release, and the series starts in June 2009.",
      ]}
      faq={faq}
      related={getRelatedLinks(SLUG)}
      dataset={{
        name: "Pakistan government debt (quarterly) and debt-to-GDP (fiscal years)",
        description: "Gross government domestic debt, government external debt, debt from the IMF, gross public debt and the FRDLA total debt of the government, end of quarter, with debt-to-GDP ratios at fiscal-year ends, from the State Bank of Pakistan.",
        temporalCoverage: `${q[0].date}/${last.date}`,
        sourceName: "State Bank of Pakistan",
        sourceUrl: "https://www.sbp.org.pk/assets/document/Summary.pdf",
        variables: ["Gross government domestic debt", "Government external debt", "Debt from IMF", "Gross public debt", "Total debt of the government (FRDLA)", "Gross public debt to GDP"],
      }}
    >
      <ShellSection id="what-the-data-shows" title="What the data shows" description="Computed from SBP's series; each statement gives its period.">
        <div className="flex max-w-3xl flex-col gap-2 text-[15px] leading-relaxed text-pe-text-2">
          <p>
            Gross public debt was {pc(first.grossPublicPct)} of GDP at the end of {fiscalYearLabel(first.date)}. It peaked at {pc(peak.grossPublicPct)} in{" "}
            {fiscalYearLabel(peak.date)} and stood at {pc(fy.grossPublicPct)} at the end of {fiscalYearLabel(fy.date)}; the lowest reading in the series was{" "}
            {pc(low.grossPublicPct)}, at the end of FY{low.date.slice(2, 4)}.
          </p>
          <p>
            About {Math.round(domShare)}% of the government&rsquo;s debt is owed at home, mostly in rupee securities such as{" "}
            <Link href="/pakistan-t-bill-rates" className="text-pe-accent hover:underline">Treasury bills</Link> and{" "}
            <Link href="/pakistan-bond-yields" className="text-pe-accent hover:underline">PIBs</Link>, so the interest rates set at those auctions drive much
            of the government&rsquo;s interest bill. The external part, including {bn(last.imf)} owed to the IMF, is exposed to the exchange rate.
          </p>
        </div>
      </ShellSection>

      <ShellSection id="stock" title="The debt stock" description="Quarter-end stocks since June 2009.">
        <DebtStockChart data={{ quarterly: q, ratios, mof, retrievedOn }} />
      </ShellSection>

      <ShellSection id="ratio" title="Debt as a share of GDP" description="Fiscal-year ends; SBP and the Ministry of Finance shown separately.">
        <DebtRatioChart data={{ quarterly: q, ratios, mof, retrievedOn }} />
        <div className="mt-4 overflow-x-auto rounded-[var(--pe-radius)] border border-pe-border" tabIndex={0} role="region" aria-label="Debt-to-GDP by fiscal year (scrolls)">
          <table className="w-full min-w-[640px] border-collapse text-[13px] tabular-nums">
            <caption className="sr-only">Pakistan government debt to GDP by fiscal year</caption>
            <thead className="bg-pe-surface-2 text-pe-text-2">
              <tr>
                {["Fiscal year end", "Gross public debt (SBP)", "FRDLA (SBP)", "Domestic (SBP)", "Nominal GDP (SBP)", "Public debt (MoF)"].map((h, i) => (
                  <th key={h} scope="col" className={`px-2.5 py-1.5 font-medium ${i ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...ratios].reverse().map((r) => {
                const m = mof.find((x) => x.date === r.date);
                return (
                  <tr key={r.date} className="border-t border-pe-border">
                    <th scope="row" className="px-2.5 py-1 text-left font-normal text-pe-text-2">{fiscalYearLabel(r.date)}</th>
                    <td className="px-2.5 py-1 text-right">{pc(r.grossPublicPct)}</td>
                    <td className="px-2.5 py-1 text-right">{pc(r.frdlaPct)}</td>
                    <td className="px-2.5 py-1 text-right">{pc(r.domesticPct)}</td>
                    <td className="px-2.5 py-1 text-right">{bn(r.gdp)}</td>
                    <td className="px-2.5 py-1 text-right">{m ? pc(m.totalPct) : <span className="text-pe-text-3">not in this review</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ShellSection>

      <ShellSection id="definitions" title="Which debt figure is which" description="The measures reported for Pakistan, and what each includes.">
        <div className="overflow-x-auto rounded-[var(--pe-radius)] border border-pe-border" tabIndex={0} role="region" aria-label="Debt definitions (scrolls)">
          <table className="w-full min-w-[640px] border-collapse text-[13px]">
            <thead className="bg-pe-surface-2 text-pe-text-2">
              <tr>
                <th scope="col" className="px-2.5 py-1.5 text-left font-medium">Measure</th>
                <th scope="col" className="px-2.5 py-1.5 text-left font-medium">What it covers</th>
                <th scope="col" className="px-2.5 py-1.5 text-right font-medium">{quarterLabel(last.date)}</th>
              </tr>
            </thead>
            <tbody className="text-pe-text-2">
              {[
                ["Gross public debt (SBP)", "Government domestic debt + government external debt + debt from the IMF", last.grossPublic],
                ["Total debt of the government, FRDLA (SBP)", "Gross public debt less the federal and provincial governments' deposits with banks; the legal measure", last.frdla],
                ["Government domestic debt", "Rupee debt of the federal and provincial governments (T-bills, PIBs, savings schemes and others)", last.domestic],
                ["Government external debt", "Loans and bonds owed abroad by the government, excluding the IMF", last.external],
                ["Debt from the IMF", "Fund credit to Pakistan", last.imf],
                ["Total external debt and liabilities", "Everything Pakistan owes abroad: government, IMF, public enterprises, banks, private sector, intercompany. Not government debt.", last.totalExternal],
                ["Total debt and liabilities", "The whole economy's debt, domestic and external, including public enterprises and commodity operations. Not government debt.", last.totalDebtLiabilities],
              ].map(([m, c, v]) => (
                <tr key={m as string} className="border-t border-pe-border align-top">
                  <th scope="row" className="px-2.5 py-1.5 text-left font-medium text-pe-text">{m}</th>
                  <td className="px-2.5 py-1.5">{c}</td>
                  <td className="whitespace-nowrap px-2.5 py-1.5 text-right tabular-nums">{bn(v as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {mof.length > 0 && (
          <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-pe-text-2">
            The Ministry of Finance&rsquo;s Annual Debt Review FY-26 reports total public debt of {bn(mof[mof.length - 1].totalPublic)} at the end of June{" "}
            {mof[mof.length - 1].date.slice(0, 4)} ({bn(mof[mof.length - 1].domestic)} domestic, {bn(mof[mof.length - 1].external)} external including the IMF),{" "}
            {pc(mof[mof.length - 1].totalPct)} of GDP, and {bn(mof[mof.length - 1].frdla)} ({pc(mof[mof.length - 1].frdlaPct)}) under the FRDLA definition.
          </p>
        )}
      </ShellSection>
    </DataPageShell>
  );
}
