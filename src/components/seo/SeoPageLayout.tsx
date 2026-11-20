import Link from "next/link";
import TrendLineChart, { type TrendPoint } from "@/components/charts/TrendLineChart";
import DataQualityBadge from "@/components/DataQualityBadge";
import { TrendArrowIcon, TREND_TEXT_COLOR } from "@/components/TrendIndicator";
import { Disclosure, FaqAccordion, splitLead } from "@/components/shell/Disclosure";
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
  /** One sentence: what the indicator is. Longer context belongs in `explanation`. */
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
  /**
   * A limitation that changes how the number is read (coverage, basis, a known break). Always visible, directly under the chart — never folded away
   * with the background explanation.
   */
  keyNote?: string;
  secondaryStats?: SecondaryStat[];
  /** First paragraph = the definition, always visible; any further paragraphs sit behind "More about this indicator". */
  explanation: string[];
  /** Background on why the indicator matters; behind the same disclosure. */
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
  keyNote,
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

  // The first sentence of the definition is always visible; the rest of that paragraph opens the "More about this indicator" disclosure.
  const [first, ...laterParagraphs] = explanation;
  const { lead: definition, rest: definitionRest } = splitLead(first ?? "");
  const moreExplanation = [definitionRest, ...laterParagraphs].filter((t): t is string => Boolean(t));

  return (
    // Layout (UI simplification, 2026-11-20): the headline value and the chart lead, side by side on wide screens; the definition is one visible
    // paragraph; background explanation and FAQ answers are one click away (native <details>, still in the page and in the JSON-LD). Every prop,
    // the structured data, the chart component, the freshness badge and the page's data are unchanged, so all pages using this template migrate together.
    <div className="min-h-screen w-full bg-pe-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredDataJsonLd).replace(/</g, "\\u003c") }}
      />

      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-4 lg:px-6">
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

        <header className="mt-2 pb-3">
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.01em] text-pe-text [text-wrap:balance] sm:text-[28px]">
            {title}
          </h1>
          <p className="mt-1 max-w-3xl text-[14px] leading-relaxed text-pe-text-2">{subtitle}</p>
        </header>

        {/* Headline value and chart: one row on wide screens so the chart gets the width, stacked (value first) on narrow ones. */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
          <div className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface p-4">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-pe-text-3">{kpiLabel}</span>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 lg:flex-col lg:items-start">
              <span className="text-[32px] font-semibold leading-none tabular-nums tracking-[-0.01em] text-pe-text sm:text-[36px]">
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
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-pe-border pt-3 sm:grid-cols-3 lg:grid-cols-1">
                {secondaryStats.map((stat) => (
                  <div key={stat.label}>
                    <dt className="text-[12px] text-pe-text-3">{stat.label}</dt>
                    <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-pe-text">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <section className="min-w-0 rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface" aria-labelledby="indicator-chart-heading">
            <h2 id="indicator-chart-heading" className="px-4 pt-3 text-[13px] font-semibold text-pe-text">
              {chartTitle}
            </h2>
            <div className="px-4 pb-3 pt-2">
              {chartData ? (
                <TrendLineChart data={chartData} color={chartColor} unit={chartUnit} gradientId={chartGradientId} />
              ) : (
                <p className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface-2 px-4 py-3 text-[13px] text-pe-text-2">
                  {chartUnavailableNote ?? "Chart data is currently unavailable."}
                </p>
              )}
              <p className="mt-2 font-mono text-[11px] leading-relaxed text-pe-text-3">{chartCaption}</p>
              {keyNote && (
                <p className="mt-2 border-s-2 border-pe-border-strong ps-2 text-[12px] leading-relaxed text-pe-text-2" data-key-note>
                  {keyNote}
                </p>
              )}
            </div>
          </section>
        </div>

        {/* About: the definition is always visible; the background and "why it matters" are one click away. */}
        <section className="mt-3 rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface px-4 py-3" aria-labelledby="indicator-meaning-heading">
          <h2 id="indicator-meaning-heading" className="text-[13px] font-semibold text-pe-text">
            About this indicator
          </h2>
          {definition && <p className="mt-1 max-w-3xl text-[14px] leading-relaxed text-pe-text-2">{definition}</p>}
          {(moreExplanation.length > 0 || whyItMatters.length > 0) && (
            <Disclosure summary="More about this indicator" className="mt-1.5" testId="indicator-more">
              <div className="flex max-w-3xl flex-col gap-2 pt-1 text-[14px]">
                {moreExplanation.map((p, i) => (
                  <p key={`e${i}`}>{p}</p>
                ))}
                {whyItMatters.length > 0 && (
                  <>
                    <h3 className="mt-1 text-[13px] font-semibold text-pe-text">Why it matters</h3>
                    {whyItMatters.map((p, i) => (
                      <p key={`w${i}`}>{p}</p>
                    ))}
                  </>
                )}
              </div>
            </Disclosure>
          )}
        </section>

        {/* FAQ: questions visible, answers on demand. The JSON-LD above carries every answer. */}
        <section className="mt-3 rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface" aria-labelledby="indicator-faq-heading">
          <h2 id="indicator-faq-heading" className="border-b border-pe-border px-4 py-2.5 text-[13px] font-semibold text-pe-text">
            Frequently asked questions
          </h2>
          <FaqAccordion items={faq} />
        </section>

        {relatedLinks.length > 0 && (
          <section className="mt-4" aria-labelledby="indicator-related-heading">
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
