// "About this dashboard" on /overview: the explanatory content that lived on the two consolidated hub pages (/pakistan-economic-indicators and
// /pakistan-economic-dashboard, now 301 redirects to /overview; src/lib/seoRedirects.ts), kept where readers now land. Claims that were no longer true on
// those pages (e.g. "no signup required", fixed update intervals) are not carried over. Server component.

import Link from "next/link";
import { FaqAccordion } from "@/components/shell/Disclosure";

export const OVERVIEW_FAQ = [
  {
    question: "Which economic indicators matter most for Pakistan?",
    answer:
      "The most closely watched are inflation (CPI), the SBP policy rate, GDP growth, the State Bank's foreign exchange reserves, the rupee exchange rate, the current account balance and workers' remittances. They move together: high inflation usually pushes the State Bank to raise interest rates, which can support the rupee but slows growth, while low reserves limit how much room the central bank has. Reading them side by side gives a clearer picture than any one figure alone.",
  },
  {
    question: "Where does the data on this dashboard come from?",
    answer:
      "From official and established public sources: the State Bank of Pakistan (EasyData and its published statistics), the Pakistan Bureau of Statistics, the Ministry of Finance, the World Bank, the US Federal Reserve's FRED database and market data providers for prices such as gold and oil. Each figure names its source, and the full list with every series is under Data sources at the foot of this page.",
  },
  {
    question: "How up to date are the figures?",
    answer:
      "Each indicator updates when its official source publishes it: daily for market rates and KIBOR, weekly for the State Bank's reserves and the SPI, monthly for CPI and most SBP series, quarterly or annually for national accounts and public debt. Every figure shows the date it refers to, so an older reading is never presented as today's.",
  },
  {
    question: "Is the dashboard free?",
    answer:
      "Yes. This overview and the indicator pages are open to everyone. Interactive tools such as the Decision Support Lab, dataset downloads and the research workshops need a free account.",
  },
] as const;

export function OverviewAbout() {
  return (
    <section id="about-dashboard" aria-labelledby="about-dashboard-heading" className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface px-4 py-4 lg:px-5">
      <h2 id="about-dashboard-heading" className="text-[17px] font-semibold text-pe-text">
        About this dashboard
      </h2>
      <p className="mt-1 max-w-3xl text-[14px] leading-relaxed text-pe-text-2">
        Pakistan&rsquo;s economic data is spread across many official publications. This overview brings the main indicators into one place, each with its own
        source and date, and links to a full page for every series, for example{" "}
        <Link href="/inflation-rate-pakistan" className="text-pe-accent hover:underline">inflation</Link>,{" "}
        <Link href="/pakistan-interest-rate" className="text-pe-accent hover:underline">the policy rate</Link>,{" "}
        <Link href="/pakistan-government-debt" className="text-pe-accent hover:underline">government debt</Link> and{" "}
        <Link href="/foreign-exchange-reserves-pakistan" className="text-pe-accent hover:underline">foreign exchange reserves</Link>.
      </p>
      <div className="mt-3">
        <FaqAccordion items={[...OVERVIEW_FAQ]} />
      </div>
    </section>
  );
}
