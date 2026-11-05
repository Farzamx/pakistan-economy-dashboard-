import Link from "next/link";
import TrendLineChart, { type TrendPoint } from "@/components/charts/TrendLineChart";
import DataQualityBadge from "@/components/DataQualityBadge";
import { TrendArrowIcon, TREND_TEXT_COLOR } from "@/components/TrendIndicator";
import type { Kpi, Trend } from "@/data/kpiData";
import { SITE_NAME, SITE_URL } from "@/lib/seoConfig";

export interface FaqItem {
  question: string;
  answer: string;
}

export interface SecondaryStat {
  label: string;
  value: string;
}

// Phase 6: `freshness` rides along so this layout renders the authoritative
// verdict rather than re-deriving one. Optional only because Kpi is shared
// with providers not yet migrated (Global Markets/World Bank); when absent,
// the badge is not rendered at all rather than shown with a guessed state.
type BadgeKpi = Pick<Kpi, "source" | "latestDate" | "frequency" | "marketType" | "sourceStatus" | "snapshotDate" | "freshness">;

export interface SeoPageLayoutProps {
  title: string;
  subtitle: string;
  kpiLabel: string;
  kpiValue: string;
  /**
   * Change vs. the previous observation and its direction — e.g. "+0.2 pp
   * vs May 2026" / "up". Optional (older pages that haven't been backfilled
   * yet simply omit it) but every new page should pass it: the live value
   * alone doesn't tell a reader whether it moved, which "Previous value" /
   * "Trend" in the indicator-page checklist are specifically there to show.
   * Uses the same colored-arrow convention as KpiCard/IndicatorTable.
   */
  kpiChange?: string;
  kpiTrend?: Trend;
  /**
   * Legacy plain-text source line — kept for pages not yet migrated.
   * Superseded by kpiQuality where provided (Production Audit Part 3:
   * these 21 SEO pages had zero freshness/fallback disclosure — a plain
   * source string can't show Cached/Fallback/Delayed the way the rest of
   * the dashboard's unified Data Quality badge does).
   */
  kpiSourceNote?: string;
  /** The KPI object backing kpiValue — drives the same <DataQualityBadge> used everywhere else on the dashboard, so a fallback/cached/delayed value is never shown as plain "live" text here either. */
  kpiQuality?: BadgeKpi;
  chartTitle: string;
  chartData: TrendPoint[] | null;
  chartUnavailableNote?: string;
  chartColor: string;
  chartUnit: string;
  chartGradientId: string;
  chartCaption: string;
  secondaryStats?: SecondaryStat[];
  explanation: string[];
  whyItMatters: string[];
  faq: FaqItem[];
  relatedLinks: { href: string; label: string }[];
  canonicalPath: string;
}

export default function SeoPageLayout({
  title,
  subtitle,
  kpiLabel,
  kpiValue,
  kpiChange,
  kpiTrend,
  kpiSourceNote,
  kpiQuality,
  chartTitle,
  chartData,
  chartUnavailableNote,
  chartColor,
  chartUnit,
  chartGradientId,
  chartCaption,
  secondaryStats,
  explanation,
  whyItMatters,
  faq,
  relatedLinks,
  canonicalPath,
}: SeoPageLayoutProps) {
  const structuredDataJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Pakistan Economic Intelligence", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}${canonicalPath}` },
        ],
      },
    ],
  };

  return (
    // Redesign Phase 4D: restyled onto the shared design tokens. Every prop,
    // the JSON-LD graph, the chart component, the freshness badge and the
    // page's data are unchanged — this is presentation only, so all 38 pages
    // using this template migrate together with no per-page edits.
    <div className="min-h-screen w-full bg-pe-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredDataJsonLd).replace(/</g, "\\u003c") }}
      />

      <div className="mx-auto max-w-4xl px-3 py-4 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/overview"
            aria-label={`Back to ${SITE_NAME}`}
            className="-ms-1.5 inline-flex items-center gap-1.5 rounded-[var(--pe-radius)] px-1.5 py-2 text-[13px] font-medium text-pe-text-2 transition-colors hover:bg-pe-surface-2 hover:text-pe-text"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
              <path d="M13 8H3M3 8L7.5 3.5M3 8L7.5 12.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {SITE_NAME}
          </Link>
          <span className="min-w-0 shrink truncate text-end font-mono text-[11px] text-pe-text-3">
            pakeconintel.com{canonicalPath}
          </span>
        </div>

        <header className="mt-3 border-b border-pe-border pb-4">
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.01em] text-pe-text [text-wrap:balance] sm:text-[28px]">
            {title}
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-pe-text-2">{subtitle}</p>
        </header>

        {/* Headline value — the page's primary figure, with its change,
            freshness verdict and (where provided) supporting stats. */}
        <div className="mt-3 rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface p-4">
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-pe-text-3">{kpiLabel}</span>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[32px] font-semibold leading-none tabular-nums tracking-[-0.01em] text-pe-text sm:text-[38px]">
              {kpiValue}
            </span>
            {kpiChange && kpiTrend && (
              <span className={`inline-flex items-center gap-1 text-[13px] font-medium ${TREND_TEXT_COLOR[kpiTrend]}`}>
                <TrendArrowIcon trend={kpiTrend} className="h-3.5 w-3.5" />
                {kpiChange}
              </span>
            )}
          </div>
          {kpiQuality && kpiQuality.freshness ? (
            <DataQualityBadge kpi={kpiQuality} freshness={kpiQuality.freshness} className="mt-2" />
          ) : (
            kpiSourceNote && <span className="mt-2 block font-mono text-[11px] text-pe-text-3">{kpiSourceNote}</span>
          )}

          {secondaryStats && secondaryStats.length > 0 && (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-pe-border pt-3 sm:grid-cols-3">
              {secondaryStats.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-[12px] text-pe-text-3">{stat.label}</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-pe-text">{stat.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Historical chart — same component, data and time range as before. */}
        <section className="mt-3 rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface" aria-labelledby="indicator-chart-heading">
          <h2 id="indicator-chart-heading" className="border-b border-pe-border px-4 py-2.5 text-[13px] font-semibold text-pe-text">
            {chartTitle}
          </h2>
          <div className="p-4">
            {chartData ? (
              <TrendLineChart data={chartData} color={chartColor} unit={chartUnit} gradientId={chartGradientId} />
            ) : (
              <p className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface-2 px-4 py-3 text-[13px] text-pe-text-2">
                {chartUnavailableNote ?? "Chart data is currently unavailable."}
              </p>
            )}
            <p className="mt-2 font-mono text-[11px] leading-relaxed text-pe-text-3">{chartCaption}</p>
          </div>
        </section>

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <section className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface" aria-labelledby="indicator-meaning-heading">
            <h2 id="indicator-meaning-heading" className="border-b border-pe-border px-4 py-2.5 text-[13px] font-semibold text-pe-text">
              What this means
            </h2>
            <div className="flex flex-col gap-2 p-4">
              {explanation.map((p, i) => (
                <p key={i} className="text-[14px] leading-relaxed text-pe-text-2">
                  {p}
                </p>
              ))}
            </div>
          </section>

          <section className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface" aria-labelledby="indicator-why-heading">
            <h2 id="indicator-why-heading" className="border-b border-pe-border px-4 py-2.5 text-[13px] font-semibold text-pe-text">
              Why it matters
            </h2>
            <div className="flex flex-col gap-2 p-4">
              {whyItMatters.map((p, i) => (
                <p key={i} className="text-[14px] leading-relaxed text-pe-text-2">
                  {p}
                </p>
              ))}
            </div>
          </section>
        </div>

        {/* FAQ — the same questions and answers the JSON-LD above declares. */}
        <section className="mt-3 rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface" aria-labelledby="indicator-faq-heading">
          <h2 id="indicator-faq-heading" className="border-b border-pe-border px-4 py-2.5 text-[13px] font-semibold text-pe-text">
            Frequently asked questions
          </h2>
          <dl className="divide-y divide-pe-border">
            {faq.map((item, i) => (
              <div key={i} className="px-4 py-3">
                <dt className="text-[14px] font-medium text-pe-text">{item.question}</dt>
                <dd className="mt-1 text-[14px] leading-relaxed text-pe-text-2">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        {relatedLinks.length > 0 && (
          <section className="mt-3" aria-labelledby="indicator-related-heading">
            <h2 id="indicator-related-heading" className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-pe-text-3">
              Related pages
            </h2>
            <ul className="flex flex-wrap gap-2">
              {relatedLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-block rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface px-3 py-1.5 text-[13px] text-pe-text-2 transition-colors hover:border-pe-border-strong hover:text-pe-text"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="my-6 flex justify-center">
          <Link
            href="/overview"
            className="inline-flex items-center gap-2 rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface px-4 py-2 text-[13px] font-medium text-pe-accent transition-colors hover:bg-pe-surface-2"
          >
            Open the full dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
