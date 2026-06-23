import type { Metadata } from "next";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import BudgetToolkit from "@/components/budget/BudgetToolkit";
import { getProvincialBudgetToolkit } from "@/data/provincialBudgetEducation";
import { PROVINCES } from "@/lib/provincial/provincialBudgetRegistry";
import { getLatestProvinceYear } from "@/lib/provincial/provincialBudgetData";
import { generateProvincialInsights } from "@/lib/provincial/provincialComparison";
import BudgetInsightsPanel from "@/components/budget/BudgetInsightsPanel";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/provincial-budget`;
const TITLE = "Provincial Budget Intelligence — Punjab, Sindh, KP & Balochistan Budgets";
const DESCRIPTION =
  "Compare Pakistan's four provincial budgets side by side — total outlay, development spending, education, health, debt servicing, and federal transfers, sourced from each province's own official budget documents.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FAQ = [
  { question: "What's the difference between this and the Budget Workshop?", answer: "The Budget Workshop tracks Pakistan's federal budget. This Provincial Budget Intelligence section tracks the four provincial governments' own separate budgets — Punjab, Sindh, Khyber Pakhtunkhwa, and Balochistan — which are not merged with the federal figures anywhere on this dashboard." },
  { question: "Why does each province show a different range of years?", answer: "Each province publishes its own budget archive online, and a source audit found they go back to different years — Punjab's furthest, Balochistan's shallowest. Rather than guess at unpublished figures, each province's data starts where its own real, verified archive does." },
  { question: "Where does this data come from?", answer: "Each figure is transcribed directly from that province's own official Finance Department budget documents — White Papers, Annual Budget Statements, or Budget at a Glance summaries, depending on what each province actually publishes. Every figure links to its exact source." },
  { question: "Why are some categories missing for some provinces?", answer: "Not every province's budget document breaks spending into the same categories the same way every year. Where a province's own document doesn't separately state a figure, it's shown as unavailable rather than estimated." },
];

export default function ProvincialBudgetPage() {
  const toolkit = getProvincialBudgetToolkit("overview");
  const insights = generateProvincialInsights();

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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />
        <div className="flex flex-col gap-10">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Provincial Budget Intelligence</h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
              Punjab, Sindh, Khyber Pakhtunkhwa, and Balochistan — four separate budgets, each sourced from that province&apos;s own official documents.
            </p>
          </div>

          {toolkit && <BudgetToolkit toolkit={toolkit} />}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PROVINCES.map((p) => {
              const year = getLatestProvinceYear(p.id);
              return (
                <Link
                  key={p.id}
                  href={`/provincial-budget/${p.slug}`}
                  className="glass-card group flex flex-col gap-3 rounded-2xl p-6 transition-all hover:scale-[1.01]"
                  style={{ borderColor: `${p.color}33` }}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white light:text-slate-900">{p.name}</h2>
                    <span className="text-xs text-white/40 light:text-slate-400">Capital: {p.capital}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold" style={{ color: p.color }}>
                      Rs {year.totalOutlay.toFixed(0)}bn
                    </span>
                    <span className="text-sm text-white/50 light:text-slate-500">FY{year.fiscalYear} Total Budget</span>
                  </div>
                  <span className="text-sm text-neon-blue opacity-0 transition-opacity group-hover:opacity-100">
                    View {p.name} Budget Workshop →
                  </span>
                </Link>
              );
            })}
          </div>

          <Link
            href="/provincial-budget/compare"
            className="glass-card flex items-center justify-between rounded-2xl border-neon-purple/30 p-6 transition-all hover:scale-[1.005]"
          >
            <div>
              <h2 className="text-lg font-semibold text-white light:text-slate-900">Compare All Four Provinces</h2>
              <p className="text-sm text-white/60 light:text-slate-500">Rank provinces on total budget, education, health, development, debt, and more.</p>
            </div>
            <span className="text-neon-purple">→</span>
          </Link>

          <BudgetInsightsPanel insights={insights} title="Provincial Insights" />

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
