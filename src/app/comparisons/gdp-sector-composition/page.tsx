import type { Metadata } from "next";
import Link from "next/link";
import SectorCompositionChart from "@/components/comparisons/SectorCompositionChart";
import { SECTOR_COMPOSITION, COMPARISON_GROUPS } from "@/lib/comparisons/comparisonRegistry";
import { getGdpSectorComposition } from "@/lib/data/worldBank";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/comparisons/${SECTOR_COMPOSITION.slug}`;

export const metadata: Metadata = {
  title: `${SECTOR_COMPOSITION.title} — Pakistan Economic Intelligence Center`,
  description: SECTOR_COMPOSITION.description,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: SECTOR_COMPOSITION.title, description: SECTOR_COMPOSITION.description, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: SECTOR_COMPOSITION.title, description: SECTOR_COMPOSITION.description },
};

export default async function GdpSectorCompositionPage() {
  const sectorComposition = await getGdpSectorComposition();
  const sectorPoints = sectorComposition
    ? sectorComposition.agriculture.history.map((point, i) => ({
        year: point.month,
        agriculture: point.value,
        industry: sectorComposition.industry.history[i]?.value ?? null,
        services: sectorComposition.services.history[i]?.value ?? null,
      }))
    : null;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: SECTOR_COMPOSITION.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  const groupLabel = COMPARISON_GROUPS.find((g) => g.id === SECTOR_COMPOSITION.group)?.label ?? "";

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
            pakeconintel.com/comparisons/{SECTOR_COMPOSITION.slug}
          </span>
        </div>

        <h1 className="mt-8 text-3xl font-bold tracking-tight text-white light:text-slate-900 sm:text-4xl">
          {SECTOR_COMPOSITION.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/60 light:text-slate-500 sm:text-base">
          {SECTOR_COMPOSITION.description}
        </p>
        <p className="mt-1 text-xs text-white/35 light:text-slate-400">{groupLabel}</p>

        <div className="glass-card mt-8 flex flex-col gap-4 p-6 sm:p-8">
          {sectorPoints ? (
            <SectorCompositionChart data={sectorPoints} />
          ) : (
            <p className="rounded-xl border border-white/5 light:border-slate-200 bg-white/[0.02] light:bg-slate-50 px-5 py-4 text-sm text-white/50 light:text-slate-500">
              Sector composition data is currently unavailable.
            </p>
          )}
          <p className="text-[10px] text-white/25 light:text-slate-400">Source: World Bank</p>
        </div>

        <section className="glass-card mt-6 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white light:text-slate-900">Why It Matters</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/65 light:text-slate-600">{SECTOR_COMPOSITION.whyItMatters}</p>
        </section>

        <section className="glass-card mt-6 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white light:text-slate-900">Frequently Asked Questions</h2>
          <div className="mt-4 space-y-5">
            {SECTOR_COMPOSITION.faq.map((item, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-white/85 light:text-slate-800">{item.question}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60 light:text-slate-600">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

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
