import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { T } from "@/components/T";
import ProvincialWorkspace from "@/components/provincial/ProvincialWorkspace";
import ProvincialSeoTemplate from "@/components/provincial/ProvincialSeoTemplate";
import { getProvinceBySlug, PROVINCES } from "@/lib/provincial/provincialBudgetRegistry";
import {
  getProvincialSeoPage,
  getAllProvincialSeoSlugs,
  getProvinceWorkspaceFaq,
  getProvincialSeoPageFaq,
} from "@/lib/provincial/provincialSeoPages";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return [...PROVINCES.map((p) => ({ slug: p.slug })), ...getAllProvincialSeoSlugs().map((slug) => ({ slug }))];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const province = getProvinceBySlug(slug);
  const seoPage = getProvincialSeoPage(slug);

  if (province) {
    const url = `${SITE_URL}/provincial-budget/${province.slug}`;
    const title = `${province.name} Budget Workshop — Pakistan Economic Intelligence Center`;
    const description = `${province.name}'s provincial budget — total outlay, development spending, education, health, debt servicing, and federal transfers, sourced from the ${province.name} Finance Department's own official documents.`;
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { title, description, url, siteName: SITE_NAME, type: "website" },
      twitter: { card: "summary_large_image", title, description },
    };
  }

  if (seoPage) {
    const url = `${SITE_URL}/provincial-budget/${seoPage.slug}`;
    return {
      title: `${seoPage.title} — Pakistan Economic Intelligence Center`,
      description: seoPage.description,
      alternates: { canonical: url },
      openGraph: { title: seoPage.title, description: seoPage.description, url, siteName: SITE_NAME, type: "website" },
      twitter: { card: "summary_large_image", title: seoPage.title, description: seoPage.description },
    };
  }

  return {};
}

export default async function ProvincialBudgetSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const province = getProvinceBySlug(slug);
  const seoPage = getProvincialSeoPage(slug);

  if (!province && !seoPage) notFound();

  const faq = province ? getProvinceWorkspaceFaq(province.id) : seoPage ? getProvincialSeoPageFaq(seoPage) : [];
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 px-6 py-8 sm:px-10 lg:px-16">
        {faq.length > 0 && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
          />
        )}
        {province && <ProvincialWorkspace province={province.id} />}
        {!province && seoPage && <ProvincialSeoTemplate page={seoPage} />}

        {faq.length > 0 && (
          <section className="glass-card mt-10 flex flex-col gap-4 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white light:text-slate-900"><T tKey="common.faq" /></h2>
            <div className="space-y-5">
              {faq.map((item, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold text-white/85 light:text-slate-800">{item.question}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/60 light:text-slate-600">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
