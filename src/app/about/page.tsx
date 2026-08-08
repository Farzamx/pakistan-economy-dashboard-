import type { Metadata } from "next";
import Link from "next/link";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { marketingFontVariables } from "@/lib/marketingFonts";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const TITLE = `About | ${SITE_NAME}`;
const DESCRIPTION = "What PEIC is, why it exists, who it's for, and who's behind it.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/about`, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const LINKEDIN_URL = "https://www.linkedin.com/in/farzam-arif";
const CONTACT_EMAIL = "feedback.peic@gmail.com";

export default function AboutPage() {
  return (
    <div className={`${marketingFontVariables} marketing-theme min-h-screen w-full`}>
      <MarketingNav />

      <main className="mx-auto w-full max-w-[760px] px-5 pb-24 pt-32 min-[1024px]:px-10 min-[1024px]:pt-40">
        <span className="text-[11px] uppercase tracking-[0.14em]" style={{ fontFamily: "var(--font-marketing-data)", color: "var(--muted)" }}>
          About
        </span>
        <h1 className="mt-3 text-[32px] font-bold leading-tight min-[1024px]:text-[44px]" style={{ fontFamily: "var(--font-marketing-heading)", color: "var(--paper)" }}>
          About PEIC
        </h1>

        <div className="mt-10 flex flex-col gap-10 text-[16px] leading-relaxed min-[1024px]:text-[17px]" style={{ fontFamily: "var(--font-marketing-body)", color: "var(--paper)" }}>
          <section className="flex flex-col gap-3">
            <h2 className="text-[13px] font-medium uppercase tracking-[0.1em]" style={{ fontFamily: "var(--font-marketing-data)", color: "var(--muted)" }}>
              What it is
            </h2>
            <p>
              PEIC (Pakistan Economic Intelligence Center) is a dashboard that tracks Pakistan&apos;s key economic
              indicators — inflation, the rupee, foreign reserves, interest rates, the stock market, and federal and
              provincial budgets — pulled from the official sources that publish them: the State Bank of Pakistan,
              the Pakistan Bureau of Statistics, the Pakistan Stock Exchange, the IMF, and the World Bank.
            </p>
            <p>
              Alongside the dashboard sits the Decision Support Lab: a set of calculators that turn that same official
              data into an answer specific to one person&apos;s own numbers — what inflation is actually doing to
              their income, how much of their salary a rate change is worth, how their savings compare to a few
              months of expenses.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-[13px] font-medium uppercase tracking-[0.1em]" style={{ fontFamily: "var(--font-marketing-data)", color: "var(--muted)" }}>
              Why it exists
            </h2>
            <p>
              Pakistan&apos;s official economic data is real and published on a regular schedule, but it&apos;s spread
              across several institutions&apos; own sites, in formats built for analysts, not for a person trying to
              work out what a headline inflation number means for their own budget. PEIC exists to close that gap: pull
              the numbers into one place on the schedule they&apos;re actually released, and build the tools that turn
              a national statistic into a personal one.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-[13px] font-medium uppercase tracking-[0.1em]" style={{ fontFamily: "var(--font-marketing-data)", color: "var(--muted)" }}>
              Who it&apos;s for
            </h2>
            <p>
              Anyone trying to make a decision that depends on Pakistan&apos;s economy — a household weighing a big
              purchase against inflation, a professional negotiating a raise, a small business owner pricing in the
              exchange rate, a student or journalist who needs a real number instead of a guess.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-[13px] font-medium uppercase tracking-[0.1em]" style={{ fontFamily: "var(--font-marketing-data)", color: "var(--muted)" }}>
              Who&apos;s behind it
            </h2>
            <p>
              PEIC is built by Farzam Arif.
            </p>
            <p className="flex flex-col gap-1 min-[480px]:flex-row min-[480px]:gap-6">
              <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-4" style={{ color: "var(--paper)" }}>
                LinkedIn ↗
              </a>
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline decoration-dotted underline-offset-4" style={{ color: "var(--paper)" }}>
                {CONTACT_EMAIL}
              </a>
            </p>
            {/* TODO: add founding date / origin story once there's a settled, verifiable account to publish. */}
          </section>

          <Link
            href="/overview"
            className="mt-4 flex min-h-[44px] w-fit items-center justify-center rounded-lg px-6 py-3 text-[15px] font-semibold"
            style={{ fontFamily: "var(--font-marketing-body)", background: "var(--indigo)", color: "var(--paper)" }}
          >
            Open the platform
          </Link>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
