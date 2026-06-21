import type { Metadata } from "next";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import BudgetAllocationChart from "@/components/budget/BudgetAllocationChart";
import BudgetRs100Card from "@/components/budget/BudgetRs100Card";
import { getAllocationBreakdown, getRs100Breakdown } from "@/lib/budget/budgetData";
import { getLatestBudgetYear } from "@/data/budgetHistorical";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const SLUG = "where-does-tax-money-go";
const PAGE_URL = `${SITE_URL}/budget/${SLUG}`;
const TITLE = "Where Does Pakistan's Tax Money Actually Go?";
const DESCRIPTION =
  "A plain-English breakdown of where every Rupee of Pakistan's federal budget goes — debt servicing, defence, development, and provincial transfers — sourced from the official Budget in Brief.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FAQ = [
  {
    question: "What's the single biggest use of Pakistan's tax money?",
    answer: "In most recent years, debt servicing (interest payments on public debt) is the largest single allocation — larger than defence, PSDP, or subsidies.",
  },
  {
    question: "Does this include provincial government spending?",
    answer: "No — this is the federal budget only. Each province (Punjab, Sindh, Khyber Pakhtunkhwa, Balochistan) has its own separate budget, not included here.",
  },
  {
    question: "Where does the \"Other\" category come from?",
    answer: "\"Other\" is the residual after subtracting Debt Servicing, Defence, PSDP, Subsidies, Provincial Transfers, and Pension from Total Outlay — it includes Grants & Transfers to Provinces and Others, Running of Civil Government, Net Lending, and contingency provisions.",
  },
];

export default function WhereDoesTaxMoneyGoPage() {
  const latest = getLatestBudgetYear();
  const allocation = getAllocationBreakdown(latest);
  const rs100 = getRs100Breakdown(latest);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
        />
        <div className="mx-auto max-w-4xl">
          <Link href="/budget" className="flex items-center gap-2 text-xs font-medium text-white/50 light:text-slate-500 transition-colors hover:text-white light:hover:text-slate-900">
            <span aria-hidden="true">←</span> {SITE_NAME} Budget Workshop
          </Link>

          <h1 className="mt-8 text-3xl font-bold tracking-tight text-white light:text-slate-900 sm:text-4xl">{TITLE}</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/60 light:text-slate-500 sm:text-base">{DESCRIPTION}</p>

          <div className="glass-card mt-8 rounded-2xl p-5">
            <BudgetAllocationChart data={allocation} />
            <p className="mt-2 text-[11px] text-white/40 light:text-slate-400">
              Source: Budget in Brief, FY{latest.fiscalYear} Budget Estimate.
            </p>
          </div>

          <div className="mt-6">
            <BudgetRs100Card data={rs100} fiscalYear={latest.fiscalYear} />
          </div>

          <section className="glass-card mt-6 p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white light:text-slate-900">Frequently Asked Questions</h2>
            <div className="mt-4 space-y-5">
              {FAQ.map((item, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold text-white/85 light:text-slate-800">{item.question}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/60 light:text-slate-600">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-10 mb-4 text-center">
            <Link href="/budget" className="inline-flex items-center gap-2 rounded-lg bg-neon-blue/10 border border-neon-blue/20 px-5 py-2.5 text-sm font-medium text-neon-blue transition-colors hover:bg-neon-blue/20">
              View the full Budget Workshop →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
