import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import ArchiveBrowser from "@/components/economicCalendar/ArchiveBrowser";
import { T } from "@/components/T";
import { getHistoricalEvents } from "@/lib/economicCalendar/economicEventsRepo";
import { isWithinRetention, EVENT_RETENTION_DAYS } from "@/lib/economicCalendar/retentionConfig";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/economic-calendar/archive`;
const TITLE = "Pakistan Economic Data Release History — Historical Calendar Archive";
const DESCRIPTION =
  "Past Pakistan economic data releases — SBP policy rate decisions, CPI inflation prints, GDP growth, current account and reserves updates — with the previous, forecast, and actual figure for each.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FAQ = [
  {
    question: "What is the Historical Release Archive?",
    answer: "A record of past Pakistan economic data releases — once an upcoming event on the Economic Calendar is published, it moves here with its final actual figure alongside the previous and forecast values that were shown beforehand.",
  },
  {
    question: "How is this different from the main Economic Calendar?",
    answer: "The Economic Calendar (/economic-calendar) tracks what's coming next. This archive tracks what has already happened, so you can look back at how a release compared to its forecast.",
  },
  {
    question: "Can I filter, search, or see released-only events?",
    answer: "Yes — use the search box plus the Category, Year, and \"Released Only\" filters above to narrow the list, for example to see only past SBP Monetary Policy Committee decisions, or every release from a specific year.",
  },
  {
    question: "Why doesn't a release show up here right away?",
    answer: `A newly released event stays on the main Economic Calendar's "Recent Releases" panel for ${EVENT_RETENTION_DAYS} days first, so there's time to review Actual vs Forecast and the market reaction — it moves here automatically once that window closes. It's reachable at its own page throughout, both before and after that move.`,
  },
];

export default async function EconomicCalendarArchivePage() {
  const allHistorical = await getHistoricalEvents();
  // Released Event Retention Policy — a released event stays on the
  // active calendar's Recent Releases panel for EVENT_RETENTION_DAYS
  // before "graduating" to this list (economicEventsRepo.ts's
  // getRecentReleases is the other side of this split). Postponed/
  // cancelled events have no Actual to review, so they skip the window
  // and appear here immediately.
  const today = new Date();
  const events = allHistorical.filter((e) => !(e.status === "released" && isWithinRetention(e.eventDate, today)));
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
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
      { "@type": "ListItem", position: 3, name: "Historical Release Archive", item: PAGE_URL },
    ],
  };
  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Pakistan Economic Calendar — Historical Release Archive",
    description: DESCRIPTION,
    url: PAGE_URL,
    keywords: ["Pakistan economic data", "SBP", "CPI", "GDP", "Pakistan Bureau of Statistics", "State Bank of Pakistan"],
    creator: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    temporalCoverage: events.length > 0 ? `${events[events.length - 1].eventDate}/${events[0].eventDate}` : undefined,
    variableMeasured: ["Previous value", "Forecast value", "Actual value", "Surprise"],
  };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd).replace(/</g, "\\u003c") }} />

        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]"><T tKey="calendar.archiveTitle" /></h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
              <T tKey="calendar.archiveHeroDesc" />
            </p>
          </div>

          <ArchiveBrowser events={events} />

          <section className="glass-card flex flex-col gap-4 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white light:text-slate-900"><T tKey="common.faq" /></h2>
            <div className="space-y-5">
              {([1,2,3,4] as const).map((n) => (
                <div key={n}>
                  <p className="text-sm font-semibold text-white/85 light:text-slate-800"><T tKey={`calendar.archiveFaq${n}Q`} /></p>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/60 light:text-slate-600"><T tKey={`calendar.archiveFaq${n}A`} /></p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
