import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import ArchiveBrowser from "@/components/economicCalendar/ArchiveBrowser";
import { getHistoricalEvents } from "@/lib/economicCalendar/economicEventsRepo";
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
    question: "Can I filter by category or year?",
    answer: "Yes — use the Category and Year filters above to narrow the list, for example to see only past SBP Monetary Policy Committee decisions, or every release from a specific year.",
  },
];

export default async function EconomicCalendarArchivePage() {
  const events = await getHistoricalEvents();
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

        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Historical Release Archive</h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
              Past Pakistan economic data releases, each with its previous, forecast, and final actual figure.
            </p>
          </div>

          <ArchiveBrowser events={events} />

          <section className="glass-card flex flex-col gap-4 rounded-2xl p-6 sm:p-8">
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
        </div>
      </main>
    </div>
  );
}
