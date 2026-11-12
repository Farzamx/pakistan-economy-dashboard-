import type { Metadata } from "next";
import Link from "next/link";
import { Disclosure, FaqAccordion } from "@/components/shell/Disclosure";
import Section from "@/components/shell/Section";
import SectorShareAreaChart from "@/components/gdp/SectorShareAreaChart";
import GrowthBarChart from "@/components/gdp/GrowthBarChart";
import PeerClusteredBarChart from "@/components/gdp/PeerClusteredBarChart";
import { getGdpKpi, getGdpGrowthHistory, getGdpSectorComposition } from "@/lib/data/worldBank";
import { getQuarterlyGdpKpi } from "@/lib/data/quarterlyGdp";
import {
  GDP_DATA_LIMITATIONS,
  availablePeers,
  buildPeerComparison,
  buildSectorShares,
  latestN,
  periodLabel,
  quarterPeriodLabel,
  sectorShareNote,
  toAnnualPoints,
} from "@/lib/gdpWorkshop";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

// GDP Breakdown Workshop.
//
// Built entirely from the GDP functions the data audit verified:
// getGdpSectorComposition (30y of value-added shares), getGdpGrowthHistory
// (30y of annual real growth for PAK/IND/BGD) and getQuarterlyGdpKpi (40
// quarters of real GVA growth). No new provider, no new series, and no
// economic figure is computed or hardcoded here — the page only arranges
// values those functions return.
//
// What the workshop deliberately does NOT claim is as important as what it
// shows: there is no nominal or real GDP level, no expenditure split, no
// per-sector growth rate and no contribution-to-growth decomposition in any
// audited source, so none is displayed or inferred. GDP_DATA_LIMITATIONS is
// rendered verbatim at the foot of the page.

const PAGE_URL = `${SITE_URL}/gdp-breakdown-workshop`;
const TITLE = "Pakistan GDP Breakdown Workshop";
const DESCRIPTION =
  "Explore Pakistan's GDP: sector value-added shares over 30 years, annual real GDP growth, quarterly real GVA growth, and a like-for-like growth comparison with India and Bangladesh.";

export const metadata: Metadata = {
  title: `${TITLE} — ${SITE_NAME}`,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// Both underlying sources cache for 24h (worldBank.ts / quarterlyGdp.ts) and
// the data is annual/quarterly, so a daily window matches the cadence rather
// than imposing a tighter one this page cannot benefit from.
export const revalidate = 86400;

/** How many of the most recent observations each bar chart draws, for legibility. */
const ANNUAL_BARS = 20;
const QUARTER_BARS = 20;
const PEER_YEARS = 12;

function SourceLine({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 font-mono text-[11px] leading-relaxed text-pe-text-3">{children}</p>;
}

export default async function GdpBreakdownWorkshopPage() {
  const [sector, gdpKpi, pakHistory, indHistory, bgdHistory, quarterly] = await Promise.all([
    getGdpSectorComposition(),
    getGdpKpi(),
    getGdpGrowthHistory("PAK"),
    getGdpGrowthHistory("IND"),
    getGdpGrowthHistory("BGD"),
    getQuarterlyGdpKpi(),
  ]);

  const sectorPoints = sector
    ? buildSectorShares(sector.agriculture.history, sector.industry.history, sector.services.history)
    : [];
  const shareNote = sectorShareNote(sectorPoints);

  const annualPoints = pakHistory ? toAnnualPoints(pakHistory.history) : [];
  const annualBars = latestN(annualPoints, ANNUAL_BARS).map((p) => ({ period: p.year, value: p.value }));

  const quarterBars = latestN(quarterly.trend, QUARTER_BARS).map((p) => ({ period: p.month, value: p.value }));

  const peerPoints = buildPeerComparison(
    { PAK: pakHistory?.history, IND: indHistory?.history, BGD: bgdHistory?.history },
    PEER_YEARS,
  );
  const peers = availablePeers(peerPoints);

  return (
    <div className="min-h-screen w-full bg-pe-bg">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-3 py-4 sm:px-4 lg:px-6">
        <header className="border-b border-pe-border pb-4">
          <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-pe-text-3">Workshop</p>
          <h1 className="mt-1 text-[24px] font-semibold leading-tight tracking-[-0.01em] text-pe-text [text-wrap:balance] sm:text-[28px]">
            {TITLE}
          </h1>
          <p className="mt-1.5 max-w-3xl text-[14px] leading-relaxed text-pe-text-2">
            How Pakistan&rsquo;s economy is structured, and how fast it has grown. Every figure below is a{" "}
            <strong className="font-medium text-pe-text">share</strong> or a{" "}
            <strong className="font-medium text-pe-text">growth rate</strong> — this page carries no GDP level, and says so
            explicitly where that matters.
          </p>
        </header>

        {/* 1. Composition ------------------------------------------------- */}
        <Section
          id="gdp-composition"
          title="GDP composition by sector"
          description="Value added by agriculture, industry and services, each as a share of GDP."
        >
          <SectorShareAreaChart data={sectorPoints} />

          {shareNote.latestTotal !== null && (
            <div className="mt-3 rounded-[var(--pe-radius)] border border-[var(--pe-warn-border)] bg-[var(--pe-warn-bg)] p-3">
              <p className="text-[13px] font-medium text-[var(--pe-warn-text)]">
                These three shares total about {shareNote.latestTotal}% — not 100%.
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-pe-text-2">
                The World Bank&rsquo;s value-added measure excludes net taxes on products (taxes such as GST and import
                duties, less subsidies). That excluded portion is roughly {shareNote.latestResidual}% of GDP in{" "}
                {shareNote.latestYear}, which is why the stack stops short of the 100% line. The shares are shown exactly as
                reported and are <strong className="font-medium text-pe-text">not</strong> rescaled to sum to 100, because
                doing so would present three sectors as a complete breakdown of the economy when they are not.
              </p>
            </div>
          )}

          <p className="mt-3 text-[13px] leading-relaxed text-pe-text-2">
            <strong className="font-medium text-pe-text">How to read it:</strong>{" "}
            a rising band means that sector&rsquo;s
            value added grew faster than the rest of the economy, not that the sector grew in absolute terms.
          </p>
          <Disclosure summary="Why one band can rise because another fell">
            Shares move relative to one another, so one band can rise purely because another fell.
          </Disclosure>
          <SourceLine>
            Source: World Bank (NV.AGR.TOTL.ZS / NV.IND.TOTL.ZS / NV.SRV.TOTL.ZS) · % of GDP, annual ·{" "}
            {periodLabel(sectorPoints) ?? "period unavailable"}
          </SourceLine>
        </Section>

        {/* 2. Annual real growth ------------------------------------------ */}
        <Section
          id="gdp-annual-growth"
          title="Annual real GDP growth"
          description="Year-on-year change in real (inflation-adjusted) GDP."
        >
          {gdpKpi && (
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-pe-border pb-3">
              <span className="text-[28px] font-semibold leading-none tabular-nums text-pe-text">
                {gdpKpi.value}
                {gdpKpi.unit}
              </span>
              <span className="text-[13px] text-pe-text-2">{gdpKpi.change}</span>
              <span className="font-mono text-[11px] text-pe-text-3">
                latest · {gdpKpi.latestDate ?? "—"}
              </span>
            </div>
          )}
          <GrowthBarChart data={annualBars} metric="Annual real GDP growth (%)" />
          <p className="mt-3 text-[13px] leading-relaxed text-pe-text-2">
            <strong className="font-medium text-pe-text">This is a rate, not a size.</strong> A bar shows how much the
            economy grew that year, not how large it is. Two countries can show the same growth rate at very different
            economic sizes.
          </p>
          {/* Two different windows, deliberately both stated: the series this
              page received (depth varies — the canonical store returns up to
              100 years, the live-API fallback 30) and the narrower window the
              bars actually draw. */}
          <SourceLine>
            Source: World Bank (NY.GDP.MKTP.KD.ZG) · annual % change, real · available{" "}
            {periodLabel(annualPoints) ?? "unavailable"} · charted{" "}
            {periodLabel(latestN(annualPoints, ANNUAL_BARS)) ?? "—"} ({annualBars.length} years)
          </SourceLine>
        </Section>

        {/* 3. Quarterly real GVA ------------------------------------------ */}
        <Section
          id="gdp-quarterly-gva"
          title="Quarterly real GVA growth"
          description="Year-on-year change in real gross value added, by fiscal quarter."
        >
          <GrowthBarChart data={quarterBars} metric="Quarterly real GVA growth, YoY (%)" />
          <div className="mt-3 rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface-2 p-3">
            <p className="text-[13px] leading-relaxed text-pe-text-2">
              <strong className="font-medium text-pe-text">Not the same measure as the annual series above.</strong>{" "}
              This
              is gross value added, reported by Pakistan&rsquo;s fiscal quarter; the annual series is GDP on a calendar-year
              basis. They are kept in separate charts and never plotted on one axis.
            </p>
            <Disclosure summary="What gross value added is, and which quarters these are" className="mt-1">
              Gross value added is output less intermediate consumption, before net taxes on products. Pakistan&rsquo;s
              fiscal quarters run from July: FY26 runs July 2025 to June 2026. The two series answer related questions but
              are not interchangeable.
            </Disclosure>
          </div>
          <SourceLine>
            Source: {quarterly.kpi.source ?? "SBP / PBS"} · real GVA, YoY %, fiscal quarters · available{" "}
            {quarterPeriodLabel(quarterly.trend) ?? "period unavailable"} · charted{" "}
            {quarterPeriodLabel(latestN(quarterly.trend, QUARTER_BARS)) ?? "—"} ({quarterBars.length} quarters)
            {quarterly.isFallback ? " · showing a stored snapshot, live fetch unavailable" : ""}
          </SourceLine>
        </Section>

        {/* 4. Peer comparison --------------------------------------------- */}
        <Section
          id="gdp-peers"
          title="Peer comparison"
          description="Annual real GDP growth, same indicator and same periods for every country shown."
        >
          <PeerClusteredBarChart data={peerPoints} countries={peers} />
          <p className="mt-3 text-[13px] leading-relaxed text-pe-text-2">
            <strong className="font-medium text-pe-text">Why these can share one scale:</strong> all three bars are the
            same World Bank indicator (annual % change in real GDP) over the same years, so they are directly comparable.
            A missing year for a country is drawn as a gap, never as a zero bar.
            {peers.length < 3 && (
              <>
                {" "}
                Only {peers.length === 1 ? "one country has" : `${peers.length} countries have`} data for this metric right
                now, so the comparison is incomplete.
              </>
            )}
          </p>
          <SourceLine>
            Source: World Bank (NY.GDP.MKTP.KD.ZG) · annual % change, real ·{" "}
            {periodLabel(peerPoints) ?? "period unavailable"} · countries shown:{" "}
            {peers.length > 0 ? peers.join(", ") : "none"}
          </SourceLine>
        </Section>

        {/* 5. Limitations -------------------------------------------------- */}
        <Section
          id="gdp-limitations"
          title="What this workshop cannot show"
          description="Gaps in the underlying sources, stated plainly rather than filled in."
        >
          <FaqAccordion items={GDP_DATA_LIMITATIONS.map((item) => ({ question: item.title, answer: item.detail }))} className="-mx-4 -mt-1" />
          <p className="mt-3 border-t border-pe-border pt-3 text-[13px] text-pe-text-2">
            For the series this page does cover in more depth, see{" "}
            <Link href="/gdp-growth-pakistan" className="text-pe-accent hover:underline">
              Pakistan GDP Growth
            </Link>{" "}
            and{" "}
            <Link href="/comparisons/gdp-sector-composition" className="text-pe-accent hover:underline">
              GDP Composition by Sector
            </Link>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}
