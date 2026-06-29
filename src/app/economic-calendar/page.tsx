import type { Metadata } from "next";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import EconomicCalendarWorkspace from "@/components/economicCalendar/EconomicCalendarWorkspace";
import { getAllScheduledEvents, getNextMajorEvents, getRecentReleases, toEconomicEvent } from "@/lib/economicCalendar/economicEventsRepo";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/economic-calendar`;
const TITLE = "Pakistan Economic Calendar — SBP Meetings, CPI & Key Release Dates";
const DESCRIPTION =
  "Pakistan-only economic calendar — SBP monetary policy meeting dates, CPI/core/SPI inflation, FX reserves, trade balance, current account, remittances, GDP, LSM, T-Bill/PIB auctions, government debt, and the federal budget, each rated by Market Impact on PSX, bond yields, and the Rupee.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FAQ = [
  {
    question: "What is the Pakistan Economic Calendar?",
    answer:
      "A Pakistan-only calendar of economic events that materially move PSX, the Rupee, and Pakistani bond yields — SBP monetary policy meetings and reports, CPI/core/SPI inflation, FX reserves, trade balance, current account, remittances, GDP, LSM, and T-Bill/PIB auctions. It deliberately excludes generic international calendars (FOMC, OPEC, ECB, etc.) and routine, low-impact items — only events with a direct, material effect on Pakistani markets are listed.",
  },
  {
    question: "When is the next SBP meeting date?",
    answer:
      "The next SBP Monetary Policy Committee meeting date is shown in the Next Major Market-Moving Events section above, along with the previous policy rate and the market's forecast for the decision. SBP's Monetary Policy Committee typically meets roughly every six to eight weeks, per SBP's own published advance calendar.",
  },
  {
    question: "What are Pakistan's inflation release dates?",
    answer:
      "Pakistan's headline CPI inflation rate is released monthly by the Pakistan Bureau of Statistics, alongside core inflation the same day, with a faster-moving weekly SPI (Sensitive Price Indicator) release in between. All three are listed on this calendar as they come up.",
  },
  {
    question: "What does Market Impact mean on this calendar?",
    answer:
      "Market Impact estimates the potential effect of a release on PSX, investor sentiment, bond yields, and the Pakistani Rupee — High Market Impact covers SBP MPC decisions, CPI, and GDP; Medium covers trade balance, current account, remittances, FX reserves, and T-Bill/PIB auctions; Low covers SPI.",
  },
  {
    question: "Does this calendar update itself automatically?",
    answer:
      "Yes. SBP's Monetary Policy Committee calendar and its Treasury Bill/PIB auction calendars are fetched and parsed directly from SBP's own published sources daily — if SBP postpones or reschedules a date, this calendar reflects that change automatically. Series with no official advance calendar (CPI, SPI, trade balance, remittances, current account, LSM) use a verified recurrence pattern instead, clearly marked as Estimated rather than Confirmed in each event's Data Quality section.",
  },
  {
    question: "How often is this Pakistan economic data calendar updated?",
    answer:
      "Foreign exchange reserves, the current account, trade balance, remittances, CPI, core inflation, SPI, LSM, and the 3-month T-Bill yield sync their Actual values automatically once a release is due. SBP MPC, Treasury Bill, and PIB dates are synchronized daily directly from SBP's own published calendars — see each event's Data Quality section for its specific source and confidence level.",
  },
];

export default async function EconomicCalendarPage() {
  const [scheduledEvents, nextMajorEvents, recentReleases] = await Promise.all([getAllScheduledEvents(), getNextMajorEvents(6), getRecentReleases(6)]);
  const events = scheduledEvents.map(toEconomicEvent);
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
      { "@type": "ListItem", position: 2, name: "Economic Calendar", item: PAGE_URL },
    ],
  };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }} />

        <EconomicCalendarWorkspace events={events} recentReleases={recentReleases} nextMajorEvents={nextMajorEvents} />

        <section className="glass-card mt-6 flex flex-col gap-4 rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white light:text-slate-900">Frequently Asked Questions</h2>
          <div className="space-y-5">
            {FAQ.map((item, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-white/85 light:text-slate-800">{item.question}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60 light:text-slate-600">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[var(--text-muted)]">Explore further:</span>
          <Link href="/economic-calendar/archive" className="rounded-full border border-white/10 light:border-slate-200 px-3 py-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
            Historical Release Archive
          </Link>
          <a href="/economic-calendar/feed.ics" className="rounded-full border border-neon-blue/20 bg-neon-blue/5 px-3 py-1.5 text-neon-blue transition-colors hover:bg-neon-blue/10">
            Subscribe to Calendar Feed (.ics)
          </a>
        </div>
      </main>
    </div>
  );
}
