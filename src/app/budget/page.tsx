import type { Metadata } from "next";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import BudgetWorkspace from "@/components/budget/BudgetWorkspace";
import BudgetToolkit from "@/components/budget/BudgetToolkit";
import { BUDGET_HISTORICAL } from "@/data/budgetHistorical";
import { getBudgetToolkit } from "@/data/budgetEducation";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/budget`;
const TITLE = "Budget Workshop — Pakistan Federal Budget, FY2010-11 to FY2026-27";
const DESCRIPTION =
  "Explore Pakistan's federal budget across 17 fiscal years — debt servicing, defence, PSDP, subsidies, provincial transfers, and the fiscal deficit, every figure sourced from the official Budget in Brief.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FAQ = [
  { question: "What years does this Budget Workshop cover?", answer: "FY2010-11 through FY2026-27 — 17 fiscal years of Pakistan's federal Budget Estimate figures, each one transcribed and cited from that year's own official Budget in Brief." },
  { question: "Why does this only show 'Budget Estimate' figures, not actuals?", answer: "Because actual and revised figures get restated in later years' documents, which would make year-over-year comparisons inconsistent. Sticking to each year's original Budget Estimate keeps every year on the same basis." },
  { question: "Where does the data come from?", answer: "Every figure is transcribed directly from that fiscal year's official Budget in Brief, published by Pakistan's Finance Division. Each category page lists the exact source document used." },
  { question: "Why isn't this data updated automatically like the rest of the dashboard?", answer: "Pakistan's federal budget is published as a PDF document once a year, not as a live data feed — unlike exchange rates or inflation, there's no machine-readable workbook to pull from automatically, so this dataset is refreshed manually each budget cycle." },
  { question: "What's the difference between the Budget Workshop and the Comparisons page?", answer: "Comparisons tracks live, frequently-updating indicators like the exchange rate and inflation. The Budget Workshop tracks Pakistan's annual federal budget allocations, which change once a year at most." },
  { question: "Does this cover provincial budgets too?", answer: "No — this is the federal budget only. Each of Pakistan's four provinces publishes its own separate budget, tracked separately in the Provincial Budget Intelligence section of this dashboard." },
  { question: "What does 'fiscal year' mean in Pakistan?", answer: "Pakistan's fiscal year runs from July to June, not January to December. FY2025-26 means July 2025 through June 2026." },
  { question: "Can I download this data?", answer: "Yes — use the PNG or CSV export buttons on the Historical Budget Explorer chart to save the data you're viewing." },
  { question: "Why does Debt Servicing Share of Budget get special attention here?", answer: "Because it's one of the most important, least-discussed facts about Pakistan's finances — interest payments on past borrowing now take up a larger share of the budget than defence, leaving less room for everything else." },
  { question: "How is 'Total Outlay' different from 'Total Expenditure'?", answer: "They mean the same thing in this dataset — both refer to the government's full planned spending for the fiscal year, current and development spending combined." },
];

export default function BudgetPage() {
  const toolkit = getBudgetToolkit("overview");

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
        <div className="flex flex-col gap-10">
          {toolkit && <BudgetToolkit toolkit={toolkit} />}

          <BudgetWorkspace years={BUDGET_HISTORICAL.years} />

          <Link
            href="/provincial-budget"
            className="glass-card flex items-center justify-between rounded-2xl border-emerald-400/30 p-6 transition-all hover:scale-[1.005]"
          >
            <div>
              <h2 className="text-lg font-semibold text-white light:text-slate-900">Looking for Provincial Budgets?</h2>
              <p className="text-sm text-white/60 light:text-slate-500">Punjab, Sindh, Khyber Pakhtunkhwa, and Balochistan each publish their own separate budget — explore them in the Provincial Budget Intelligence Workshop.</p>
            </div>
            <span className="text-emerald-400">→</span>
          </Link>

          <section className="glass-card flex flex-col gap-4 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white light:text-slate-900">Frequently Asked Questions</h2>
            <div className="space-y-5">
              {FAQ.map((item, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold text-white/85 light:text-slate-800">{item.question}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/60 light:text-slate-600">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
