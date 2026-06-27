import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import BudgetTrendChart from "@/components/budget/BudgetTrendChart";
import BudgetInsightsPanel from "@/components/budget/BudgetInsightsPanel";
import BudgetToolkit from "@/components/budget/BudgetToolkit";
import RelatedContent from "@/components/RelatedContent";
import ProtectedLink from "@/components/ProtectedLink";
import { getCategoryTrendSeries, generateBudgetInsights } from "@/lib/budget/budgetData";
import { BUDGET_HISTORICAL } from "@/data/budgetHistorical";
import { getBudgetToolkit } from "@/data/budgetEducation";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const SLUG = "debt-servicing-vs-defence";
const PAGE_URL = `${SITE_URL}/budget/${SLUG}`;
const TITLE = "Debt Servicing vs Defence Spending — Pakistan's Federal Budget";
const DESCRIPTION =
  "Pakistan's debt servicing (interest payments) compared against the defence budget, FY2010-11 to FY2026-27 — when one overtook the other, and by how much.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FAQ = [
  {
    question: "Is debt servicing really bigger than defence spending now?",
    answer: "Yes — since debt servicing (interest payments on public debt) first overtook defence spending, it has remained the larger of the two in every subsequent Budget Estimate in this dataset.",
  },
  {
    question: "Why did debt servicing overtake defence?",
    answer: "A growing debt stock, persistently high domestic interest rates, and Rupee depreciation (which raises the local-currency cost of servicing foreign debt) pushed interest payments up faster than defence spending grew.",
  },
  {
    question: "Are these directly comparable figures?",
    answer: "Yes — both are Budget Estimate figures from the same Table 1 (\"Budget at a Glance\") of each year's official Budget in Brief, using the same economic classification.",
  },
  {
    question: "When did debt servicing first overtake defence spending?",
    answer: "Check the Key Finding panel above this FAQ — it states the exact fiscal year this dataset shows the crossover happening, computed directly from the underlying figures, not from a fixed assumption.",
  },
  {
    question: "Could defence spending overtake debt servicing again?",
    answer: "It's possible, if the government managed to sharply reduce its debt stock or interest rates fell significantly — but given Pakistan's current debt levels, most economists expect debt servicing to stay the larger of the two for the foreseeable future.",
  },
  {
    question: "Does this comparison include provincial defence-related spending?",
    answer: "No — defence is a purely federal subject in Pakistan, so this comparison only involves federal figures on both sides, with no provincial spending involved.",
  },
  {
    question: "Is Pakistan unusual in spending more on debt than defence?",
    answer: "No — many heavily indebted countries reach a point where interest costs exceed defence spending. It's a common warning sign that debt-servicing costs are crowding out other government priorities.",
  },
  {
    question: "What would it take to bring debt servicing back below defence spending?",
    answer: "Realistically, a combination of smaller fiscal deficits over several years, lower domestic interest rates, and a more stable Rupee — none of which tend to happen quickly.",
  },
];

export default function DebtServicingVsDefencePage() {
  const years = BUDGET_HISTORICAL.years;
  const trendPoints = getCategoryTrendSeries(["debtServicing", "defence"], "nominal", years);
  const insights = generateBudgetInsights(years).filter((i) => i.text.toLowerCase().includes("debt servicing"));
  const toolkit = getBudgetToolkit("debt-servicing-vs-defence");

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
          <ProtectedLink href="/budget" className="flex items-center gap-2 text-xs font-medium text-white/50 light:text-slate-500 transition-colors hover:text-white light:hover:text-slate-900">
            <span aria-hidden="true">←</span> {SITE_NAME} Budget Workshop
          </ProtectedLink>

          <h1 className="mt-8 text-3xl font-bold tracking-tight text-white light:text-slate-900 sm:text-4xl">{TITLE}</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/60 light:text-slate-500 sm:text-base">{DESCRIPTION}</p>

          <div className="glass-card mt-8 flex flex-col gap-4 rounded-2xl p-5">
            <BudgetTrendChart points={trendPoints} fields={["debtServicing", "defence"]} mode="nominal" />
            <p className="text-[11px] text-white/40 light:text-slate-400">Source: Budget in Brief, each fiscal year&apos;s own Budget Estimate.</p>
          </div>

          <div className="mt-6">
            <BudgetInsightsPanel insights={insights} title="Key Finding" />
          </div>

          {toolkit && (
            <div className="mt-6">
              <BudgetToolkit toolkit={toolkit} />
            </div>
          )}

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

          <RelatedContent
            groups={[
              {
                heading: "Related Budget Categories",
                links: [
                  { href: "/budget/debt-servicing", label: "Debt Servicing" },
                  { href: "/budget/defence-spending", label: "Defence" },
                  { href: "/budget/where-does-tax-money-go", label: "Where Does Tax Money Go?" },
                ],
              },
              {
                heading: "Related Provincial Pages",
                links: [
                  { href: "/provincial-budget/debt-burden-rankings", label: "Provincial Debt Burden Rankings" },
                  { href: "/provincial-budget/provincial-debt-comparison", label: "Provincial Debt Comparison" },
                ],
              },
            ]}
          />

          <div className="mt-10 mb-4 text-center">
            <ProtectedLink href="/budget" className="inline-flex items-center gap-2 rounded-lg bg-neon-blue/10 border border-neon-blue/20 px-5 py-2.5 text-sm font-medium text-neon-blue transition-colors hover:bg-neon-blue/20">
              View the full Budget Workshop →
            </ProtectedLink>
          </div>
        </div>
      </main>
    </div>
  );
}
