import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import RelatedContent from "@/components/RelatedContent";
import EventCategoryBadge from "@/components/economicCalendar/EventCategoryBadge";
import EventImportanceBadge from "@/components/economicCalendar/EventImportanceBadge";
import EventStatusBadge from "@/components/economicCalendar/EventStatusBadge";
import { MarketReactionPreview } from "@/components/economicCalendar/MarketReactionSection";
import HistoricalContext from "@/components/economicCalendar/HistoricalContext";
import DataQualityFooter from "@/components/economicCalendar/DataQualityFooter";
import {
  getEventBySlug,
  getScheduledEventSlugs,
  getEventsBySeriesSlug,
  getEventsByCategory,
  type EventRecord,
} from "@/lib/economicCalendar/economicEventsRepo";
import { getEventCategoryRelatedContent, type RelatedGroup } from "@/lib/relatedContent";
import { formatEventDate, formatEventTime, formatRelativeDay } from "@/lib/economicCalendar/economicCalendarData";
import { getMarketReactionPreview } from "@/lib/economicCalendar/marketReactionEngine";
import { getWhyItMatters } from "@/lib/economicCalendar/whyItMatters";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getScheduledEventSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || event.status !== "scheduled") return {};

  const url = `${SITE_URL}/economic-calendar/event/${event.slug}`;
  const title = `${event.title} — ${formatEventDate(event.eventDate)} | Pakistan Economic Calendar`;
  const description = event.description ?? event.series.description ?? `${event.title}, scheduled for ${formatEventDate(event.eventDate)}.`;
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
  const faq = [
    {
      question: `What is the ${event.series.title}?`,
      answer: event.series.description ?? event.description ?? `${event.series.title} is a recurring release on Pakistan's economic calendar.`,
    },
    {
      question: `When is the next ${event.series.title}?`,
      answer: `${formatEventDate(event.eventDate)} (${formatRelativeDay(event.eventDate, new Date())}), at ${formatEventTime(event.eventTime ?? "00:00")}.`,
    },
    {
      question: "Where does this data come from?",
      answer: event.series.sourceUrl
        ? `${event.series.sourceName}. Source: ${event.series.sourceUrl}`
        : `${event.series.sourceName}.`,
    },
  ];
  if (event.previousValue) {
    faq.push({ question: "What was the previous reading?", answer: `${event.previousValue}, as of the prior release in this series.` });
  }
  return faq;
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  // Released/postponed/cancelled events live permanently at
  // /economic-calendar/archive/[slug] instead — this avoids the same
  // release ever having two canonical URLs.
  if (!event || event.status !== "scheduled") notFound();

  const [sameSeries, sameCategory] = await Promise.all([
    getEventsBySeriesSlug(event.series.slug, event.id),
    getEventsByCategory(event.series.category, event.series.slug),
  ]);

  const relatedGroups = buildRelatedGroups(event, sameSeries, sameCategory);
  const faq = buildFaq(event);
  const whyItMatters = getWhyItMatters(event.series.slug, event.series.category);
  const reactionScenarios = getMarketReactionPreview(event.series.slug, event.series.category);

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
      { "@type": "ListItem", position: 3, name: event.title, item: `${SITE_URL}/economic-calendar/event/${event.slug}` },
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
            <span className="truncate text-white/60 light:text-slate-600">{event.title}</span>
          </nav>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <EventCategoryBadge category={event.series.category} />
            <EventImportanceBadge importance={event.importance} />
            <EventStatusBadge status={event.status} />
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white light:text-slate-900 sm:text-4xl">{event.title}</h1>
          <p className="mt-2 text-sm font-medium text-neon-blue">
            {formatEventDate(event.eventDate)} · {formatEventTime(event.eventTime ?? "00:00")} · {formatRelativeDay(event.eventDate, new Date())}
          </p>
          <p className="mt-3 max-w-2xl text-sm text-white/60 light:text-slate-500 sm:text-base">{event.description ?? event.series.description}</p>

          <section className="glass-card mt-8 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex flex-wrap gap-8">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">Previous</span>
                <span className="text-xl font-semibold text-white/85 light:text-slate-700">{event.previousValue ?? "—"}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">Forecast</span>
                <span className="text-xl font-semibold text-neon-blue">{event.forecastValue ?? "—"}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">Actual</span>
                <span className="text-xl font-semibold text-white/40 light:text-slate-400">Pending</span>
              </div>
            </div>
            <a
              href={`/economic-calendar/event/${event.slug}/ics`}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-neon-blue/10 border border-neon-blue/20 px-5 py-2.5 text-sm font-medium text-neon-blue transition-colors hover:bg-neon-blue/20"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 10h18M8 3v4M16 3v4M9 14l2 2 4-4" />
              </svg>
              Add to Calendar
            </a>
          </section>

          <section className="glass-card mt-6 p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white light:text-slate-900">Why It Matters</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/65 light:text-slate-600">{whyItMatters}</p>
          </section>

          <MarketReactionPreview scenarios={reactionScenarios} />

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
              href="/economic-calendar"
              className="inline-flex items-center gap-2 rounded-lg bg-neon-blue/10 border border-neon-blue/20 px-5 py-2.5 text-sm font-medium text-neon-blue transition-colors hover:bg-neon-blue/20"
            >
              View the full Economic Calendar →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
