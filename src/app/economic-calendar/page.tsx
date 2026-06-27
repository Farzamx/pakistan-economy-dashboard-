import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import EconomicCalendarWorkspace from "@/components/economicCalendar/EconomicCalendarWorkspace";
import { ECONOMIC_CALENDAR_EVENTS } from "@/data/economicCalendarEvents";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/economic-calendar`;
const TITLE = "Pakistan Economic Calendar — SBP Meetings, CPI & Key Release Dates";
const DESCRIPTION =
  "Pakistan's economic calendar — upcoming SBP monetary policy meeting dates, CPI and SPI inflation release dates, foreign reserve updates, trade balance, current account, GDP, and federal budget events, all in one economic data calendar.";

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
      "It's a single calendar of upcoming Pakistan economic events — SBP monetary policy meetings, CPI and SPI inflation releases, foreign exchange reserve updates, trade balance and current account releases, remittances, GDP announcements, and federal budget and Economic Survey dates — so you always know what's coming next and how important it is.",
  },
  {
    question: "When is the next SBP meeting date?",
    answer:
      "The next SBP Monetary Policy Committee meeting date is shown in the Major Upcoming Events section above, along with the previous policy rate and the market's forecast for the decision. SBP's Monetary Policy Committee typically meets roughly every six to eight weeks.",
  },
  {
    question: "What are Pakistan's inflation release dates?",
    answer:
      "Pakistan's headline CPI inflation rate is released monthly by the Pakistan Bureau of Statistics, with a faster-moving weekly SPI (Sensitive Price Indicator) release in between. Both sets of Pakistan inflation release dates are listed on this economic data calendar as they come up.",
  },
  {
    question: "How are events ranked by importance on this calendar?",
    answer:
      "Each event is tagged High, Medium, or Low impact based on how much it typically moves markets and policy decisions — SBP rate decisions, CPI inflation, the current account, and GDP growth are generally High impact, while weekly updates like SPI inflation, foreign exchange reserves, and market reviews are usually Medium or Low.",
  },
  {
    question: "Does this calendar cover the federal budget and Economic Survey?",
    answer:
      "Yes — the federal budget presentation and the Economic Survey of Pakistan, both released annually in the run-up to the new fiscal year, appear in the Major Upcoming Events section alongside the other recurring releases.",
  },
  {
    question: "How often is this Pakistan economic data calendar updated?",
    answer:
      "This initial version uses a representative set of illustrative event dates and figures rather than a live feed. A future update will connect this calendar to real, continuously-updated event data so every date and figure reflects the latest published schedule.",
  },
];

export default function EconomicCalendarPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
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

        <EconomicCalendarWorkspace events={ECONOMIC_CALENDAR_EVENTS} />

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
      </main>
    </div>
  );
}
