import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ComparisonDetailView from "@/components/comparisons/ComparisonDetailView";
import RelatedContent from "@/components/RelatedContent";
import { COMPARISONS, getComparisonBySlug } from "@/lib/comparisons/comparisonRegistry";
import { getComparisonBundle } from "@/lib/comparisons/comparisonData";
import { getComparisonRelatedContent } from "@/lib/relatedContent";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const def = getComparisonBySlug(slug);
  if (!def) return {};

  const url = `${SITE_URL}/comparisons/${def.slug}`;
  return {
    title: `${def.title} — Pakistan Economic Intelligence Center`,
    description: def.description,
    alternates: { canonical: url },
    openGraph: { title: def.title, description: def.description, url, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary_large_image", title: def.title, description: def.description },
  };
}

export default async function ComparisonDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const def = getComparisonBySlug(slug);
  if (!def) notFound();

  const bundle = await getComparisonBundle(def);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: def.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  const related = COMPARISONS.filter((c) => c.group === def.group && c.slug !== def.slug).slice(0, 4);
  const relatedContent = getComparisonRelatedContent(def.slug);

  return (
    <div className="min-h-screen w-full px-6 py-8 sm:px-10 lg:px-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />

      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <Link
            href="/comparisons"
            className="flex items-center gap-2 text-xs font-medium text-white/50 light:text-slate-500 transition-colors hover:text-white light:hover:text-slate-900"
          >
            <span aria-hidden="true">←</span> {SITE_NAME} Comparisons
          </Link>
          <span className="text-[10px] uppercase tracking-widest text-white/25 light:text-slate-400">
            pakeconintel.com/comparisons/{def.slug}
          </span>
        </div>

        <h1 className="mt-8 text-3xl font-bold tracking-tight text-white light:text-slate-900 sm:text-4xl">
          {def.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/60 light:text-slate-500 sm:text-base">
          {def.description}
        </p>

        <div className="mt-8">
          <ComparisonDetailView bundle={bundle} />
        </div>

        <section className="glass-card mt-6 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white light:text-slate-900">Why It Matters</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/65 light:text-slate-600">{def.whyItMatters}</p>
        </section>

        <section className="glass-card mt-6 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white light:text-slate-900">Frequently Asked Questions</h2>
          <div className="mt-4 space-y-5">
            {def.faq.map((item, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-white/85 light:text-slate-800">{item.question}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60 light:text-slate-600">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/35 light:text-slate-500">
              Related Comparisons
            </p>
            <div className="flex flex-wrap gap-2">
              {related.map((c) => (
                <Link
                  key={c.slug}
                  href={`/comparisons/${c.slug}`}
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
            href="/comparisons"
            className="inline-flex items-center gap-2 rounded-lg bg-neon-blue/10 border border-neon-blue/20 px-5 py-2.5 text-sm font-medium text-neon-blue transition-colors hover:bg-neon-blue/20"
          >
            View all comparisons →
          </Link>
        </div>
      </div>
    </div>
  );
}
