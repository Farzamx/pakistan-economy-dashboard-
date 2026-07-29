import type { Metadata } from "next";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { T } from "@/components/T";
import PersonalInflationHero from "@/components/personalInflation/PersonalInflationHero";
import PersonalInflationCalculator from "@/components/personalInflation/PersonalInflationCalculator";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import { getLatestCpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/decision-support-lab/personal-inflation`;
const TITLE = "Personal Inflation Calculator — What's Your Real Inflation Rate? | PEIC Decision Support Lab";
const DESCRIPTION =
  "Official CPI measures the average Pakistani household. Enter your own spending pattern across PBS's 12 official categories and discover the inflation rate you're actually experiencing.";
const SOURCE_URL = "https://www.pbs.gov.pk/";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// Revalidates alongside the rest of the dashboard's ISR-cached data pages —
// the underlying cpi_category_breakdown row only changes once a month (on a
// new PBS release), so a short-lived static render is safe and avoids a
// Supabase round trip on every visit.
export const revalidate = 3600;

const FAQ_KEYS = [
  { q: "personalInflation.faq1Q", a: "personalInflation.faq1A" },
  { q: "personalInflation.faq2Q", a: "personalInflation.faq2A" },
  { q: "personalInflation.faq3Q", a: "personalInflation.faq3A" },
  { q: "personalInflation.faq4Q", a: "personalInflation.faq4A" },
  { q: "personalInflation.faq5Q", a: "personalInflation.faq5A" },
];

// English fallback strings for the FAQ JSON-LD (structured data must be
// static text, not a client-rendered i18n key) — mirrors en.ts verbatim.
const FAQ_EN = [
  {
    question: "How is my personal inflation rate calculated?",
    answer:
      "For each of PBS's 12 official spending categories, we multiply your reported share of monthly spending by that category's official year-on-year inflation rate, then sum the results — the same weighted-average method PBS uses to compute the national CPI, just with your weights instead of the average household's.",
  },
  {
    question: "Where does the category inflation data come from?",
    answer:
      "Directly from the Pakistan Bureau of Statistics' Monthly Inflation Report — the same official PDF release this dashboard already tracks for the headline CPI figure, parsed automatically for its category-level breakdown table.",
  },
  {
    question: "How often is this updated?",
    answer: "Automatically, every month, when PBS publishes a new Monthly Inflation Report — no manual work required.",
  },
  {
    question: "Is this the same as the official CPI?",
    answer:
      "No. The official CPI reflects the average Pakistani household's spending pattern. This tool reweights the same official category inflation rates using your own spending distribution, so it can — and usually does — differ from the headline figure.",
  },
  {
    question: "Can I save more than one household profile?",
    answer:
      "Yes — save as many spending profiles as you like (e.g. one for yourself, one for your parents) and switch between them any time. Profiles are saved in your browser.",
  },
];

export default async function PersonalInflationPage() {
  const breakdown = await getLatestCpiCategoryBreakdown();

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_EN.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      {/* min-w-0: without it, a flex item won't shrink below its content's
          intrinsic width — ContributionTable's min-w-[640px] table (meant
          to scroll inside its own overflow-x-auto wrapper) would otherwise
          force this whole <main> wider than the viewport on mobile instead
          of scrolling internally. */}
      <main className="min-w-0 flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />
        <div className="flex flex-col gap-10">
          <Link href="/decision-support-lab" className="w-fit text-xs font-medium text-white/40 hover:text-neon-blue light:text-slate-400">
            ← <T tKey="decisionSupportLab.title" />
          </Link>

          <PersonalInflationHero />

          <PersonalInflationCalculator breakdown={breakdown} />

          {breakdown && (
            <ExplainTheMath
              formula="Personal Rate = Σ (your weight_i × official inflation_i), for each of PBS's 12 groups"
              variables={[
                { symbol: "your weight_i", description: "The share of your monthly spending allocated to group i" },
                { symbol: "official inflation_i", description: "PBS's published year-on-year inflation rate for group i" },
                { symbol: "Σ", description: "Sum across all 12 official CPI groups" },
              ]}
              methodology="This is the same weighted-average method the Pakistan Bureau of Statistics uses to compute the national CPI — the only difference is whose spending weights are used: the average household's (official CPI) or yours (personal rate)."
              sourceName="Pakistan Bureau of Statistics — Monthly Inflation Report"
              sourceUrl={SOURCE_URL}
              lastUpdated={breakdown.observationDate}
            />
          )}

          <EducationalPanel
            whatDoesThisMean="Your personal inflation rate is the year-on-year price increase your own household actually experiences, based on how you split your spending across food, housing, transport, and PBS's other official categories — as opposed to the official CPI, which reflects the spending pattern of an average Pakistani household."
            whyDifferent="Every household spends differently. If you spend more than average on a category where prices rose sharply (like Transport in a fuel-price spike), your personal rate runs higher than the headline figure — and lower if you spend less on it."
            howCalculated="For each of PBS's 12 official groups, your reported spending share is multiplied by that group's official year-on-year inflation rate, and the results are summed — see Explain the Math above for the full formula."
            sources={["Pakistan Bureau of Statistics — Monthly Inflation Report (category-level group weights and YoY inflation)", "Same PBS release already used for PEIC's headline CPI/Core inflation figures"]}
          />

          <section className="glass-card flex flex-col gap-4 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white light:text-slate-900">
              <T tKey="personalInflation.faq" />
            </h2>
            <div className="space-y-5">
              {FAQ_KEYS.map((item, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold text-white/85 light:text-slate-800">
                    <T tKey={item.q} />
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/60 light:text-slate-600">
                    <T tKey={item.a} />
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
