import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BudgetDetailView from "@/components/budget/BudgetDetailView";
import BudgetToolkit from "@/components/budget/BudgetToolkit";
import RelatedContent from "@/components/RelatedContent";
import { BUDGET_CATEGORIES, getBudgetCategoryBySlug, type BudgetCategoryId } from "@/lib/budget/budgetRegistry";
import type { BudgetTrendField } from "@/lib/budget/budgetData";
import { BUDGET_HISTORICAL } from "@/data/budgetHistorical";
import { getBudgetToolkit } from "@/data/budgetEducation";
import { getBudgetCategoryRelatedContent } from "@/lib/relatedContent";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Registry ids match BudgetTrendField names exactly except "fiscalDeficit",
// whose underlying dataset field is "fiscalDeficitRs".
const FIELD_BY_CATEGORY_ID: Record<BudgetCategoryId, BudgetTrendField> = {
  defence: "defence",
  debtServicing: "debtServicing",
  federalPsdp: "federalPsdp",
  subsidies: "subsidies",
  fiscalDeficit: "fiscalDeficitRs",
  provincialTransfer: "provincialTransfer",
  federalEducation: "federalEducation",
  federalHealth: "federalHealth",
};

export function generateStaticParams() {
  return BUDGET_CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getBudgetCategoryBySlug(slug);
  if (!category) return {};

  const url = `${SITE_URL}/budget/${category.slug}`;
  return {
    title: `${category.title} — Pakistan Economic Intelligence Center`,
    description: category.description,
    alternates: { canonical: url },
    openGraph: { title: category.title, description: category.description, url, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary_large_image", title: category.title, description: category.description },
  };
}

export default async function BudgetCategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = getBudgetCategoryBySlug(slug);
  if (!category) notFound();

  const field = FIELD_BY_CATEGORY_ID[category.id];
  const years = BUDGET_HISTORICAL.years;
  const latest = years[years.length - 1];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: category.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  const related = BUDGET_CATEGORIES.filter((c) => c.slug !== category.slug).slice(0, 4);
  const toolkit = getBudgetToolkit(category.slug);
  const relatedContent = getBudgetCategoryRelatedContent(category.id);

  return (
    <div className="min-h-screen w-full px-6 py-8 sm:px-10 lg:px-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />

      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <Link
            href="/budget"
            className="flex items-center gap-2 text-xs font-medium text-white/50 light:text-slate-500 transition-colors hover:text-white light:hover:text-slate-900"
          >
            <span aria-hidden="true">←</span> {SITE_NAME} Budget Workshop
          </Link>
          <span className="text-[10px] uppercase tracking-widest text-white/25 light:text-slate-400">
            pakeconintel.com/budget/{category.slug}
          </span>
        </div>

        <h1 className="mt-8 text-3xl font-bold tracking-tight text-white light:text-slate-900 sm:text-4xl">
          {category.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/60 light:text-slate-500 sm:text-base">
          {category.description}
        </p>

        <div className="mt-8">
          <BudgetDetailView slug={category.slug} shortTitle={category.shortTitle} disclaimer={category.disclaimer} years={years} field={field} />
        </div>

        {toolkit && (
          <div className="mt-6">
            <BudgetToolkit toolkit={toolkit} />
          </div>
        )}

        <section className="glass-card mt-6 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white light:text-slate-900">Why It Matters</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/65 light:text-slate-600">{category.whyItMatters}</p>
        </section>

        <section className="glass-card mt-6 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white light:text-slate-900">Frequently Asked Questions</h2>
          <div className="mt-4 space-y-5">
            {category.faq.map((item, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-white/85 light:text-slate-800">{item.question}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60 light:text-slate-600">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card mt-6 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white light:text-slate-900">Source Citations</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/60 light:text-slate-600">
            Every figure on this page is the Budget Estimate (BE) for that fiscal year, transcribed from that year&apos;s own official Budget in Brief (Finance Division, Government of Pakistan). Most recent year:
          </p>
          <a
            href={latest.citations.budgetInBrief.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-neon-blue underline-offset-2 hover:underline"
          >
            Budget in Brief, FY{latest.fiscalYear} ({latest.citations.budgetInBrief.tables.join(", ")})
          </a>
        </section>

        {related.length > 0 && (
          <section className="mt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/35 light:text-slate-500">
              Related Budget Categories
            </p>
            <div className="flex flex-wrap gap-2">
              {related.map((c) => (
                <Link
                  key={c.slug}
                  href={`/budget/${c.slug}`}
                  className="rounded-full border border-white/10 light:border-slate-200 bg-white/[0.02] light:bg-white px-4 py-2 text-xs font-medium text-white/60 light:text-slate-600 transition-colors hover:border-neon-blue/40 hover:text-white light:hover:text-slate-900"
                >
                  {c.shortTitle} →
                </Link>
              ))}
            </div>
          </section>
        )}

        <RelatedContent groups={relatedContent} />

        <div className="mt-10 mb-4 text-center">
          <Link
            href="/budget"
            className="inline-flex items-center gap-2 rounded-lg bg-neon-blue/10 border border-neon-blue/20 px-5 py-2.5 text-sm font-medium text-neon-blue transition-colors hover:bg-neon-blue/20"
          >
            View the full Budget Workshop →
          </Link>
        </div>
      </div>
    </div>
  );
}
