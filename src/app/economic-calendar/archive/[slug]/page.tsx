import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import RelatedContent from "@/components/RelatedContent";
import EventCategoryBadge from "@/components/economicCalendar/EventCategoryBadge";
import EventImportanceBadge from "@/components/economicCalendar/EventImportanceBadge";
import {
  getEventBySlug,
  getReleasedEventSlugs,
  getEventsBySeriesSlug,
  getEventsByCategory,
  type EventRecord,
} from "@/lib/economicCalendar/economicEventsRepo";
import { getEventCategoryRelatedContent, type RelatedGroup } from "@/lib/relatedContent";
import { formatEventDate } from "@/lib/economicCalendar/economicCalendarData";
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
  if (!event || event.status !== "released") return {};

  const url = `${SITE_URL}/economic-calendar/archive/${event.slug}`;
  const title = `${event.title} — Actual ${event.actualValue ?? "Result"} | Pakistan Economic Calendar Archive`;
  const description = `${event.title}, released ${formatEventDate(event.eventDate)}: actual ${event.actualValue ?? "—"}, forecast was ${event.forecastValue ?? "—"}, previous reading ${event.previousValue ?? "—"}.`;
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
        href: `/economic-calendar/${e.status === "released" ? "archive" : "event"}/${e.slug}`,
        label: `${formatEventDate(e.eventDate)} — ${e.status === "released" ? `Actual ${e.actualValue ?? ""}` : "Scheduled"}`,
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
  // Scheduled/upcoming events live at /economic-calendar/event/[slug] instead.
  if (!event || event.status !== "released") notFound();

  const [sameSeries, sameCategory] = await Promise.all([
    getEventsBySeriesSlug(event.series.slug, event.id),
    getEventsByCategory(event.series.category, event.series.slug),
  ]);

  const relatedGroups = buildRelatedGroups(event, sameSeries, sameCategory);
  const faq = buildFaq(event);
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />

        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <Link href="/economic-calendar/archive" className="flex items-center gap-2 text-xs font-medium text-white/50 light:text-slate-500 transition-colors hover:text-white light:hover:text-slate-900">
              <span aria-hidden="true">←</span> {SITE_NAME} Archive
            </Link>
            <span className="text-[10px] uppercase tracking-widest text-white/25 light:text-slate-400">
              pakeconintel.com/economic-calendar/archive/{event.slug}
            </span>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <EventCategoryBadge category={event.series.category} />
            <EventImportanceBadge importance={event.importance} />
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">Released</span>
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
              <span className="text-lg font-bold text-neon-blue">{event.actualValue ?? "—"}</span>
            </div>
          </section>

          <section className="glass-card mt-6 p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white light:text-slate-900">Source</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/65 light:text-slate-600">
              Published by {event.series.sourceName}
              {event.series.cadence !== "irregular" && ` on a ${event.series.cadence} basis`}.
            </p>
            {(event.sourceUrl ?? event.series.sourceUrl) && (
              <a
                href={event.sourceUrl ?? event.series.sourceUrl ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm text-neon-blue underline-offset-2 hover:underline"
              >
                View official source →
              </a>
            )}
          </section>

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
