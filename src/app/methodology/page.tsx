import type { Metadata } from "next";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { marketingFontVariables } from "@/lib/marketingFonts";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const TITLE = `Methodology | ${SITE_NAME}`;
const DESCRIPTION = "How PEIC sources its data and calculates the Personal Inflation Calculator and Economic Health Score.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/methodology` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/methodology`, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] uppercase tracking-[0.14em]" style={{ fontFamily: "var(--font-marketing-data)", color: "var(--muted)" }}>
        {eyebrow}
      </span>
      <h2 className="text-[22px] font-bold leading-tight min-[1024px]:text-[26px]" style={{ fontFamily: "var(--font-marketing-heading)", color: "var(--paper)" }}>
        {title}
      </h2>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] uppercase tracking-[0.08em]" style={{ fontFamily: "var(--font-marketing-data)", color: "var(--muted)" }}>
        {label}
      </span>
      <p className="text-[15px] leading-relaxed" style={{ fontFamily: "var(--font-marketing-body)", color: "var(--paper)" }}>
        {children}
      </p>
    </div>
  );
}

function SourceCard({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border p-6" style={{ borderColor: "var(--ink-raised)" }}>
      <p className="text-[13px] font-medium" style={{ fontFamily: "var(--font-marketing-data)", color: "var(--paper)" }}>
        {name}
      </p>
      {children}
    </div>
  );
}

function Todo({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="rounded-md border border-dashed px-3 py-2 text-[13px] leading-relaxed"
      style={{ borderColor: "var(--muted)", color: "var(--muted)", fontFamily: "var(--font-marketing-data)" }}
    >
      TODO: {children}
    </p>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="block whitespace-pre-wrap rounded-md px-3 py-2 text-[13px] leading-relaxed"
      style={{ background: "var(--ink)", color: "var(--paper)", fontFamily: "var(--font-marketing-data)" }}
    >
      {children}
    </code>
  );
}

export default function MethodologyPage() {
  const body = "var(--font-marketing-body)";
  const paper = "var(--paper)";
  const muted = "var(--muted)";

  return (
    <div className={`${marketingFontVariables} marketing-theme min-h-screen w-full`}>
      <MarketingNav />

      <main className="mx-auto w-full max-w-[820px] px-5 pb-24 pt-32 min-[1024px]:px-10 min-[1024px]:pt-40">
        <span className="text-[11px] uppercase tracking-[0.14em]" style={{ fontFamily: "var(--font-marketing-data)", color: muted }}>
          Methodology
        </span>
        <h1 className="mt-3 text-[32px] font-bold leading-tight min-[1024px]:text-[44px]" style={{ fontFamily: "var(--font-marketing-heading)", color: paper }}>
          How the numbers are produced
        </h1>
        <p className="mt-5 max-w-[65ch] text-[16px] leading-relaxed min-[1024px]:text-[17px]" style={{ fontFamily: body, color: muted }}>
          Every figure on PEIC traces back to a named official source and a stated update schedule. Where a source
          doesn&apos;t actually back a number — or only informs it indirectly — this page says so, rather than
          implying a live feed that doesn&apos;t exist.
        </p>

        {/* Data sources */}
        <div className="mt-16 flex flex-col gap-8">
          <SectionHeading eyebrow="Data sources" title="What's taken, how often, how it's transformed" />

          <div className="flex flex-col gap-5">
            <SourceCard name="SBP — State Bank of Pakistan">
              <Field label="What's taken">
                20 indicators via the SBP EasyData API: foreign reserves, bank reserves, USD/PKR, policy rate, CPI
                inflation, core inflation, WPI inflation, 3-month T-bill and 3-year PIB yields, remittances, current
                account, trade balance, money supply (M2), exports, imports, FDI inflows, REER, large-scale
                manufacturing (LSM), private credit growth, and the fiscal balance.
              </Field>
              <Field label="How often">
                Monthly-release series (CPI, reserves, balance of payments, etc.) are revalidated every 24 hours;
                series that can move on any business day (the policy rate, T-bill/PIB auction yields, weekly M2,
                private credit growth) revalidate every 6 hours.
              </Field>
              <Field label="How it's transformed">
                Raw units are converted for readability (e.g. millions to billions of USD for reserves, trade, and
                remittances). LSM is published as a quantum index, so its year-on-year growth rate is computed here as{" "}
                <Code>(latest / same_month_last_year − 1) × 100</Code>. For six indicators where PBS publishes first
                (CPI, core inflation, LSM, trade balance, exports, imports), a newer PBS figure overrides SBP&apos;s
                own value once it lands, since PBS releases these 1–30 days ahead of SBP&apos;s own EasyData update
                depending on the series.
              </Field>
              <Field label="If the source is unreachable">
                The dashboard falls back, in order: the most recent successfully-ingested value, then a last-known-good
                cached value regardless of age, then a static snapshot as a final resort — each state is visibly
                labeled on the indicator, never presented as live when it isn&apos;t.
              </Field>
            </SourceCard>

            <SourceCard name="PBS — Pakistan Bureau of Statistics">
              <Field label="What's taken">
                The monthly CPI release (headline, core/NFNE, and the 12-group category breakdown that powers the
                Personal Inflation Calculator), the weekly Sensitive Price Indicator (SPI), and advance releases of
                LSM, trade balance, exports and imports.
              </Field>
              <Field label="How often">
                PBS publishes CPI on the 1st of each month and SPI every Friday. PEIC checks for new releases every
                15 minutes, with tighter 5-minute polling in the windows around known publication times.
              </Field>
              <Field label="How it's transformed">
                CPI figures are extracted directly from PBS&apos;s published Monthly Inflation Report PDF and SPI from
                its published spreadsheet — never scraped from a rendered web page. The extraction explicitly checks
                that a matched figure is labeled year-on-year rather than month-on-month before accepting it, and the
                12-group category breakdown is validated (all groups present, weights summing to roughly 100,
                plausible YoY range) before being stored.
              </Field>
              <Field label="If the source is unreachable">
                The weekly SPI figure has no static fallback — it simply doesn&apos;t update rather than show a stale
                or invented number. The monthly CPI figures fall back to whatever SBP EasyData is separately reporting
                for the same period.
              </Field>
            </SourceCard>

            <SourceCard name="PSX — Pakistan Stock Exchange">
              <Field label="What's actually shown">
                There is no direct PSX/KSE-100 feed on PEIC today — a live KSE-100 index feed requires a commercial
                PSX data license. In its place, the platform shows the Global X MSCI Pakistan ETF (NYSE: PAK), a
                US-listed fund that tracks Pakistani equities and correlates with KSE-100 performance, sourced free
                from Yahoo Finance.
              </Field>
              <Field label="How often">Revalidated hourly.</Field>
              <Field label="How it's transformed">
                Shown as-is (price and change); no index-level conversion is applied since it isn&apos;t standing in
                for a specific KSE-100 value, only its general direction. If the ETF&apos;s price data goes more than
                30 days without updating — a sign it may have been delisted — it&apos;s dropped rather than shown
                stale.
              </Field>
              <Field label="If the source is unreachable">
                Falls back to the last successfully-fetched value, then a static snapshot.
              </Field>
            </SourceCard>

            <SourceCard name="IMF — International Monetary Fund">
              <Field label="What's actually shown">
                There is currently no automated IMF data feed anywhere in the platform. Where IMF figures appear —
                for example, reserve-adequacy benchmarks referenced in the Lab&apos;s explanatory copy — they are
                manually transcribed from IMF publications, not fetched live.
              </Field>
              <Todo>decide whether to build a live IMF data connection (e.g. IMF SDMX/IFS) or keep IMF as a manually-curated reference source only, and update this section — and the homepage&apos;s data-sources list — once that&apos;s settled.</Todo>
            </SourceCard>

            <SourceCard name="World Bank">
              <Field label="What's taken">
                GDP growth (annual %) as a headline indicator; population, and the agriculture/industry/services shares
                of GDP are also fetched but only the latter three are currently surfaced, in the cross-country
                Comparisons tool, as a substitute for stock-market sector data that has no available source for
                Pakistan.
              </Field>
              <Field label="How often">Revalidated every 24 hours — the underlying indicators are themselves only updated by the World Bank a few times a year.</Field>
              <Field label="How it's transformed">Used as published, with no unit conversion.</Field>
              <Field label="If the source is unreachable">
                GDP growth falls back to a last-known-good cached value regardless of age, then a static snapshot.
                Population and the sector-composition series have no static fallback and simply don&apos;t render if
                the live fetch fails.
              </Field>
            </SourceCard>
          </div>
        </div>

        {/* Personal Inflation Calculator */}
        <div className="mt-16 flex flex-col gap-5">
          <SectionHeading eyebrow="Decision Support Lab" title="Personal Inflation Calculator" />
          <p className="max-w-[65ch] text-[15px] leading-relaxed" style={{ fontFamily: body, color: muted }}>
            Uses PBS&apos;s own official 12-group CPI basket (Food & Non-Alcoholic Beverages, Alcoholic Beverages &
            Tobacco, Clothing & Footwear, Housing/Water/Electricity/Gas & Fuels, Furnishing & Household Equipment,
            Health, Transport, Communication, Recreation & Culture, Education, Restaurants & Hotels, Miscellaneous) —
            the same groups and year-on-year rates PBS publishes each month, never a custom or invented basket.
          </p>
          <p className="max-w-[65ch] text-[15px] leading-relaxed" style={{ fontFamily: body, color: muted }}>
            You enter how your own spending splits across those 12 groups (as percentages, or as PKR amounts that are
            converted to percentages of your total). Your rate and the official rate are both computed the same way —
            each group&apos;s year-on-year inflation rate, weighted by a spending distribution:
          </p>
          <Code>{"personal or official rate = Σ (group's weight% ÷ 100) × (group's YoY inflation%)"}</Code>
          <p className="max-w-[65ch] text-[15px] leading-relaxed" style={{ fontFamily: body, color: muted }}>
            Your result uses your entered weights; the official CPI benchmark uses PBS&apos;s own published weights
            for the average household — same formula, different weights. The gap between the two is broken down by
            category, and the categories responsible for the largest share of that gap are surfaced as the
            &quot;top drivers.&quot; A difference smaller than 0.3 percentage points is treated as &quot;in line with&quot;
            the national average rather than meaningfully higher or lower, to avoid reading too much into
            rounding-level noise.
          </p>
        </div>

        {/* Economic Health Score */}
        <div className="mt-16 flex flex-col gap-5">
          <SectionHeading eyebrow="Decision Support Lab" title="Personal Economic Health Score" />
          <p className="max-w-[65ch] text-[15px] leading-relaxed" style={{ fontFamily: body, color: muted }}>
            A deterministic 0–100 score — not an AI estimate — averaged across up to six categories, each a plain
            formula over numbers you&apos;ve already entered into the Lab&apos;s other calculators. A category is only
            included once you&apos;ve given it enough to work with, so using one tool still produces an honest partial
            score rather than a padded one.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[14px]" style={{ fontFamily: body, color: paper }}>
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--ink-raised)" }}>
                  <th className="py-2 pr-4 text-left font-medium" style={{ color: muted }}>Category</th>
                  <th className="py-2 pr-4 text-left font-medium" style={{ color: muted }}>Formula</th>
                  <th className="py-2 text-left font-medium" style={{ color: muted }}>Needs</th>
                </tr>
              </thead>
              <tbody className="align-top">
                {[
                  ["Personal Inflation", "100 − max(0, your rate − 5) × 6", "Your personal inflation rate"],
                  ["Inflation Exposure", "75 − (your rate − official rate) × 8", "A real household allocation (not just the CPI default)"],
                  ["Budget Balance", "50 + savings rate% × 2, where savings rate = (income − spending) ÷ income", "Monthly income and spending"],
                  ["Purchasing Power", "100 − income erosion% × 8", "Recent real-income erosion"],
                  ["Salary Growth", "50 + real raise change% × 10", "A recorded raise above 0%"],
                  ["Savings Protection", "min(100, months of spending covered ÷ 6 × 100), minus a penalty above 10% projected erosion", "Savings amount and monthly spending"],
                ].map(([cat, formula, needs]) => (
                  <tr key={cat} className="border-b" style={{ borderColor: "var(--ink-raised)" }}>
                    <td className="py-3 pr-4 font-medium">{cat}</td>
                    <td className="py-3 pr-4" style={{ fontFamily: "var(--font-marketing-data)", color: muted }}>{formula}</td>
                    <td className="py-3" style={{ color: muted }}>{needs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="max-w-[65ch] text-[15px] leading-relaxed" style={{ fontFamily: body, color: muted }}>
            Every category score is clamped to 0–100. The overall score is the plain average of whichever categories
            have enough data, rounded to the nearest whole number. Categories scoring 70 or above are called out as
            strengths; categories below 50 are called out as weaknesses.
          </p>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
