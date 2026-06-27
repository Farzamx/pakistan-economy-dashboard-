import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import RelatedContent from "@/components/RelatedContent";
import EventCategoryBadge from "@/components/economicCalendar/EventCategoryBadge";
import EventImportanceBadge from "@/components/economicCalendar/EventImportanceBadge";
import EventStatusBadge from "@/components/economicCalendar/EventStatusBadge";
import { MarketReactionActual } from "@/components/economicCalendar/MarketReactionSection";
import HistoricalContext from "@/components/economicCalendar/HistoricalContext";
import DataQualityFooter from "@/components/economicCalendar/DataQualityFooter";
import {
  getEventBySlug,
  getReleasedEventSlugs,
  getEventsBySeriesSlug,
  getEventsByCategory,
  type EventRecord,
} from "@/lib/economicCalendar/economicEventsRepo";
import { getEventCategoryRelatedContent, type RelatedGroup } from "@/lib/relatedContent";
import { formatEventDate } from "@/lib/economicCalendar/economicCalendarData";
import { calculateSurprise, SURPRISE_LABELS, SURPRISE_BADGE_CLASS } from "@/lib/economicCalendar/surpriseAnalysis";
import { getMarketReaction } from "@/lib/economicCalendar/marketReactionEngine";
import { getWhyItMatters } from "@/lib/economicCalendar/whyItMatters";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getReleasedEventSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || event.status === "scheduled") return {};

  const url = `${SITE_URL}/economic-calendar/archive/${event.slug}`;
  const resultLabel = event.actualValue ? `Actual ${event.actualValue}` : event.status === "postponed" ? "Postponed" : event.status === "cancelled" ? "Cancelled" : "Released";
  const title = `${event.title} — ${resultLabel} | Pakistan Economic Calendar Archive`;
  const description = `${event.title}, ${formatEventDate(event.eventDate)}: actual ${event.actualValue ?? "—"}, forecast was ${event.forecastValue ?? "—"}, previous reading ${event.previousValue ?? "—"}.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

function buildRelatedGroups(event: EventRecord, sameSeries: EventRecord[], sameCategory: EventRecord[]): RelatedGroup[] {
  const groups = getEventCategoryRelatedContent(event.series.category);

  if (sameSeries.length > 0) {
    groups.push({
      heading: "Related Calendar Events",
      links: sameSeries.map((e) => ({
        href: `/economic-calendar/${e.status === "scheduled" ? "event" : "archive"}/${e.slug}`,
        label: `${formatEventDate(e.eventDate)} — ${e.status === "scheduled" ? "Upcoming" : e.actualValue ? `Actual ${e.actualValue}` : "Released"}`,
      })),
    });
  }

  if (sameCategory.length > 0) {
    groups.push({
      heading: "Related Events",
      links: sameCategory.map((e) => ({ href: `/economic-calendar/event/${e.slug}`, label: e.title })),
    });
  }

  return groups;
}

function buildFaq(event: EventRecord) {
  return [
    {
      question: `What was the actual ${event.series.title} figure?`,
      answer: `${event.actualValue ?? "Not recorded"}, released ${formatEventDate(event.eventDate)}. The forecast ahead of the release was ${event.forecastValue ?? "not available"}, against a previous reading of ${event.previousValue ?? "not available"}.`,
    },
    {
      question: `What is the ${event.series.title}?`,
      answer: event.series.description ?? event.description ?? `${event.series.title} is a recurring release on Pakistan's economic calendar.`,
    },
    {
      question: "Where does this data come from?",
      answer: event.series.sourceUrl ? `${event.series.sourceName}. Source: ${event.series.sourceUrl}` : `${event.series.sourceName}.`,
    },
  ];
}

export default async function ArchiveDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  // Still-scheduled events live at /economic-calendar/event/[slug] instead.
  if (!event || event.status === "scheduled") notFound();

  const [sameSeries, sameCategory] = await Promise.all([
    getEventsBySeriesSlug(event.series.slug, event.id),
    getEventsByCategory(event.series.category, event.series.slug),
  ]);

  const relatedGroups = buildRelatedGroups(event, sameSeries, sameCategory);
  const faq = buildFaq(event);
  const whyItMatters = getWhyItMatters(event.series.slug, event.series.category);
  const surprise = calculateSurprise(event.actualValue, event.forecastValue);
  const reaction = event.status === "released" ? getMarketReaction(event.series.slug, event.series.category, surprise.direction, event.actualValue, event.previousValue) : null;
  const reactionAccent = surprise.direction === "positive" ? "positive" : surprise.direction === "negative" ? "negative" : "neutral";

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Economic Calendar", item: `${SITE_URL}/economic-calendar` },
      { "@type": "ListItem", position: 3, name: "Historical Release Archive", item: `${SITE_URL}/economic-calendar/archive` },
      { "@type": "ListItem", position: 4, name: event.title, item: `${SITE_URL}/economic-calendar/archive/${event.slug}` },
    ],
  };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }} />

        <div className="mx-auto max-w-4xl">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-white/40 light:text-slate-400">
            <Link href="/" className="hover:text-white light:hover:text-slate-900">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href="/economic-calendar" className="hover:text-white light:hover:text-slate-900">Economic Calendar</Link>
            <span aria-hidden="true">/</span>
            <Link href="/economic-calendar/archive" className="hover:text-white light:hover:text-slate-900">Archive</Link>
            <span aria-hidden="true">/</span>
            <span className="truncate text-white/60 light:text-slate-600">{event.title}</span>
          </nav>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <EventCategoryBadge category={event.series.category} />
            <EventImportanceBadge importance={event.importance} />
            <EventStatusBadge status={event.status} />
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white light:text-slate-900 sm:text-4xl">{event.title}</h1>
          <p className="mt-2 text-sm font-medium text-white/50 light:text-slate-500">Released {formatEventDate(event.eventDate)}</p>
          <p className="mt-3 max-w-2xl text-sm text-white/60 light:text-slate-500 sm:text-base">{event.description ?? event.series.description}</p>

          <section className="glass-card mt-8 grid grid-cols-3 gap-4 p-6 sm:p-8">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">Previous</span>
              <span className="text-lg font-semibold text-white/70 light:text-slate-600">{event.previousValue ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">Forecast</span>
              <span className="text-lg font-semibold text-white/70 light:text-slate-600">{event.forecastValue ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">Actual</span>
              <span className="text-lg font-bold text-neon-blue">{event.actualValue ?? "Pending"}</span>
            </div>
          </section>

          {surprise.direction !== "unavailable" && (
            <section className="glass-card mt-6 flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/40 light:text-slate-500">Surprise Analysis</p>
                <p className="mt-1 text-sm text-white/70 light:text-slate-600">
                  Actual {event.actualValue} vs forecast {event.forecastValue}
                  {surprise.deltaLabel && <> — surprise of <span className="font-semibold text-white light:text-slate-900">{surprise.deltaLabel}</span></>}
                </p>
              </div>
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${SURPRISE_BADGE_CLASS[surprise.direction]}`}>
                {SURPRISE_LABELS[surprise.direction]}
              </span>
            </section>
          )}

          <section className="glass-card mt-6 p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white light:text-slate-900">Why It Matters</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/65 light:text-slate-600">{whyItMatters}</p>
          </section>

          <MarketReactionActual reaction={reaction} accent={reactionAccent} />

          <HistoricalContext events={sameSeries} />

          <section className="glass-card mt-6 p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white light:text-slate-900">Frequently Asked Questions</h2>
            <div className="mt-4 space-y-5">
              {faq.map((item, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold text-white/85 light:text-slate-800">{item.question}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/60 light:text-slate-600">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>

          <DataQualityFooter event={event} />

          <RelatedContent groups={relatedGroups} />

          <div className="mt-10 mb-4 text-center">
            <Link
              href="/economic-calendar/archive"
              className="inline-flex items-center gap-2 rounded-lg bg-neon-blue/10 border border-neon-blue/20 px-5 py-2.5 text-sm font-medium text-neon-blue transition-colors hover:bg-neon-blue/20"
            >
              View the full Release Archive →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
