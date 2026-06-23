import type { Metadata } from "next";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import ProvinceCompareTable from "@/components/provincial/ProvinceCompareTable";
import BudgetInsightsPanel from "@/components/budget/BudgetInsightsPanel";
import { generateProvincialInsights } from "@/lib/provincial/provincialComparison";
import { getCrossComparisonSeoPages } from "@/lib/provincial/provincialSeoPages";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/provincial-budget/compare`;
const TITLE = "Compare Pakistan's Provincial Budgets — Punjab vs Sindh vs KP vs Balochistan";
const DESCRIPTION =
  "Rank Pakistan's four provinces on total budget, education, health, development spending, debt servicing, agriculture, own revenue, and federal transfer dependency.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FAQ = [
  { question: "How is each province's \"latest year\" chosen?", answer: "Each province's own real, verified budget archive goes back a different distance, so each province is ranked using its own most recent confirmed fiscal year rather than a single shared year that not every province has data for." },
  { question: "Are these rankings AI-generated?", answer: "No — every ranking and insight here is a direct calculation over the same static dataset used on each province's own Budget Workshop page. No AI model is involved." },
  { question: "Why does a province sometimes show \"Not available\"?", answer: "Not every province's own budget documents separately state every category every year. Rather than estimate a missing figure, it's shown as unavailable." },
];

export default function ProvincialComparePage() {
  const insights = generateProvincialInsights();
  const deepDives = getCrossComparisonSeoPages();
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
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Province Comparison Engine</h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
              Every ranking below is a direct calculation over each province&apos;s own latest verified budget — no AI generation.
            </p>
          </div>
          <ProvinceCompareTable />
          <BudgetInsightsPanel insights={insights} title="Deterministic Insights" />

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)]">Single-metric deep dives:</span>
            {deepDives.map((p) => (
              <Link
                key={p.slug}
                href={`/provincial-budget/${p.slug}`}
                className="rounded-full border border-white/10 light:border-slate-200 px-3 py-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
              >
                {p.title}
              </Link>
            ))}
          </div>

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
