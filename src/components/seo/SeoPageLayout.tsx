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

type BadgeKpi = Pick<Kpi, "source" | "latestDate" | "frequency" | "marketType" | "expectedReleaseDate" | "releaseAlreadyReflected" | "sourceStatus" | "snapshotDate">;

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
    <div className="min-h-screen w-full px-6 py-8 sm:px-10 lg:px-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredDataJsonLd).replace(/</g, "\\u003c") }}
      />

      {/* Minimal header — not the dashboard sidebar, just a way back to it */}
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-medium text-white/50 light:text-slate-500 transition-colors hover:text-white light:hover:text-slate-900"
          >
            <span aria-hidden="true">←</span> {SITE_NAME}
          </Link>
          <span className="min-w-0 shrink break-all text-right text-[10px] uppercase tracking-widest text-white/25 light:text-slate-400">
            pakeconintel.com{canonicalPath}
          </span>
        </div>

        <h1 className="text-headline mt-8 text-white light:text-slate-900">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/60 light:text-slate-500 sm:text-base">
          {subtitle}
        </p>

        {/* Current value */}
        <div className="glass-card mt-8 flex flex-col gap-1 p-6 sm:p-8">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40 light:text-slate-500">
            {kpiLabel}
          </span>
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-display text-white light:text-slate-900">
              {kpiValue}
            </span>
            {kpiChange && kpiTrend && (
              <span className={`inline-flex items-center gap-1 text-sm font-medium ${TREND_TEXT_COLOR[kpiTrend]}`}>
                <TrendArrowIcon trend={kpiTrend} className="h-3.5 w-3.5" />
                {kpiChange}
              </span>
            )}
          </div>
          {kpiQuality ? (
            <DataQualityBadge kpi={kpiQuality} className="mt-1" />
          ) : (
            kpiSourceNote && <span className="mt-1 text-xs text-white/35 light:text-slate-400">{kpiSourceNote}</span>
          )}

          {secondaryStats && secondaryStats.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/5 light:border-slate-200 pt-4 sm:grid-cols-3">
              {secondaryStats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-xs text-white/40 light:text-slate-400">{stat.label}</p>
                  <p className="mt-1 text-lg font-semibold text-white light:text-slate-900">{stat.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="glass-card mt-6 p-6 sm:p-8">
          <p className="mb-2 text-xs font-medium text-white/40 light:text-slate-500">{chartTitle}</p>
          {chartData ? (
            <TrendLineChart
              data={chartData}
              color={chartColor}
              unit={chartUnit}
              gradientId={chartGradientId}
            />
          ) : (
            <p className="rounded-xl border border-white/5 light:border-slate-200 bg-white/[0.02] light:bg-slate-50 px-5 py-4 text-sm text-white/50 light:text-slate-500">
              {chartUnavailableNote ?? "Chart data is currently unavailable."}
            </p>
          )}
          <p className="mt-3 text-[10px] text-white/25 light:text-slate-400">{chartCaption}</p>
        </div>

        {/* Explanation */}
        <section className="glass-card mt-6 p-6 sm:p-8">
          <h2 className="text-headline text-white light:text-slate-900">What This Means</h2>
          <div className="mt-3 space-y-3">
            {explanation.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-white/65 light:text-slate-600">
                {p}
              </p>
            ))}
          </div>
        </section>

        {/* Why it matters */}
        <section className="glass-card mt-6 p-6 sm:p-8">
          <h2 className="text-headline text-white light:text-slate-900">Why It Matters</h2>
          <div className="mt-3 space-y-3">
            {whyItMatters.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-white/65 light:text-slate-600">
                {p}
              </p>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="glass-card mt-6 p-6 sm:p-8">
          <h2 className="text-headline text-white light:text-slate-900">Frequently Asked Questions</h2>
          <div className="mt-4 space-y-5">
            {faq.map((item, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-white/85 light:text-slate-800">{item.question}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60 light:text-slate-600">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Related pages */}
        {relatedLinks.length > 0 && (
          <section className="mt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/35 light:text-slate-500">
              Related Pages
            </p>
            <div className="flex flex-wrap gap-2">
              {relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-white/10 light:border-slate-200 bg-white/[0.02] light:bg-white px-4 py-2 text-xs font-medium text-white/60 light:text-slate-600 transition-colors hover:border-neon-blue/40 hover:text-white light:hover:text-slate-900"
                >
                  {link.label} →
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10 mb-4 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-neon-blue/10 border border-neon-blue/20 px-5 py-2.5 text-sm font-medium text-neon-blue transition-colors hover:bg-neon-blue/20"
          >
            Open the full live dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
