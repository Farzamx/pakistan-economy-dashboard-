// Shell for the richer public data pages (KIBOR, T-bill rates, government debt): breadcrumb, H1 and lead, headline tiles, the page's own sections,
// "About the data", a visible FAQ, related links and structured data. Server component.
//
// Structured data describes only what is on the page: FAQPage (the visible FAQ), BreadcrumbList (the visible breadcrumb) and, when the page offers its
// data as a table/CSV with a stated source and coverage, a Dataset. No ratings, reviews or invented dates.

import Link from "next/link";
import type { ReactNode } from "react";
import { FaqAccordion } from "@/components/shell/Disclosure";
import { requiresLogin } from "@/lib/accessPolicy";
import { SITE_NAME, SITE_URL } from "@/lib/seoConfig";
import { serializeJsonLd } from "@/lib/seoStructuredData";

export interface ShellTile {
  label: string;
  value: string;
  /** The observation date or period the value refers to, always shown. */
  date: string;
  note?: string;
  flag?: string;
}

export interface DatasetMeta {
  name: string;
  description: string;
  temporalCoverage: string; // "2005-06-09/2026-11-25"
  sourceName: string;
  sourceUrl: string;
  variables: string[];
}

export function DataPageShell({
  path,
  title,
  lead,
  tiles,
  children,
  facts,
  methodology,
  limitations,
  faq,
  related,
  dataset,
}: {
  path: string;
  title: string;
  lead: ReactNode;
  tiles: ShellTile[];
  children: ReactNode;
  facts: { label: string; value: ReactNode }[];
  methodology: string[];
  limitations: string[];
  faq: { question: string; answer: string }[];
  related: { href: string; label: string }[];
  dataset?: DatasetMeta;
}) {
  const url = `${SITE_URL}${path}`;
  const graph: object[] = [
    { "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Pakistan Economic Intelligence", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: title, item: url },
      ],
    },
  ];
  if (dataset) {
    graph.push({
      "@type": "Dataset",
      name: dataset.name,
      description: dataset.description,
      url,
      temporalCoverage: dataset.temporalCoverage,
      spatialCoverage: { "@type": "Place", name: "Pakistan" },
      variableMeasured: dataset.variables,
      isBasedOn: dataset.sourceUrl,
      creator: { "@type": "Organization", name: dataset.sourceName },
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    });
  }

  return (
    <div className="min-h-screen w-full bg-pe-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd({ "@context": "https://schema.org", "@graph": graph }) }} />
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-3 py-4 sm:px-4 lg:px-6">
        <nav aria-label="Breadcrumb" className="text-[13px] text-pe-text-3">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/overview" className="hover:text-pe-text hover:underline">Overview</Link>
            </li>
            <li aria-hidden="true">›</li>
            <li aria-current="page" className="text-pe-text-2">{title}</li>
          </ol>
        </nav>

        <header className="border-b border-pe-border pb-4">
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.01em] text-pe-text [text-wrap:balance] sm:text-[28px]">{title}</h1>
          <div className="mt-1.5 max-w-3xl text-[15px] leading-relaxed text-pe-text-2">{lead}</div>
        </header>

        {tiles.length > 0 && (
          <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4">
            {tiles.map((t) => (
              <li key={t.label} className="flex min-w-0 flex-col gap-0.5 rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface px-3 py-2.5">
                <span className="text-[13px] font-medium text-pe-text-2">{t.label}</span>
                <span className="text-[22px] font-semibold tabular-nums leading-tight text-pe-text">{t.value}</span>
                <span className="text-[12px] text-pe-text-3">
                  {t.date}
                  {t.flag ? ` · ${t.flag}` : ""}
                </span>
                {t.note && <span className="mt-0.5 text-[12px] leading-snug text-pe-text-2">{t.note}</span>}
              </li>
            ))}
          </ul>
        )}

        {children}

        <section aria-labelledby="data-heading" className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface px-4 py-3">
          <h2 id="data-heading" className="text-[16px] font-semibold text-pe-text">About the data</h2>
          <dl className="mt-2 grid gap-x-6 gap-y-1.5 text-[14px] sm:grid-cols-[12rem_minmax(0,1fr)]">
            {facts.map((f) => (
              <div key={f.label} className="contents">
                <dt className="text-pe-text-3">{f.label}</dt>
                <dd className="text-pe-text-2">{f.value}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-3 text-[14px] font-semibold text-pe-text">How it is compiled</h3>
          <div className="mt-1 flex max-w-3xl flex-col gap-2 text-[14px] leading-relaxed text-pe-text-2">
            {methodology.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <h3 className="mt-3 text-[14px] font-semibold text-pe-text">Limitations</h3>
          <ul className="mt-1 max-w-3xl list-disc space-y-1 pl-5 text-[14px] leading-relaxed text-pe-text-2">
            {limitations.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="faq-heading" className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface">
          <h2 id="faq-heading" className="border-b border-pe-border px-4 py-2.5 text-[16px] font-semibold text-pe-text">Frequently asked questions</h2>
          <FaqAccordion items={faq} />
        </section>

        {related.length > 0 && (
          <section aria-labelledby="related-heading">
            <h2 id="related-heading" className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-pe-text-3">Related pages</h2>
            <ul className="flex flex-wrap gap-2">
              {related.map((l) => {
                const members = requiresLogin(l.href);
                return (
                  <li key={l.href}>
                    <Link href={l.href} rel={members ? "nofollow" : undefined} data-track="related-link" className="inline-block rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface px-3 py-1.5 text-[14px] text-pe-text-2 transition-colors hover:border-pe-border-strong hover:text-pe-text">
                      {l.label}
                      {members && <span className="ms-1.5 text-[12px] text-pe-text-3">· members</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

/** A section card with an H2, used by the data pages for their own content blocks. */
export function ShellSection({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-20 rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface">
      <div className="border-b border-pe-border px-4 py-2.5">
        <h2 id={`${id}-heading`} className="text-[16px] font-semibold text-pe-text">{title}</h2>
        {description && <p className="text-[14px] text-pe-text-2">{description}</p>}
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}
