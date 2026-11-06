import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import MacroSnapshot from "@/components/MacroSnapshot";
import IntelligenceFeed, { type IntelligenceFeedItem } from "@/components/IntelligenceFeed";
import HealthScoreCard from "@/components/HealthScoreCard";
import RiskIntelligenceSection from "@/components/RiskIntelligenceSection";
import MacroIntelligenceSection from "@/components/MacroIntelligenceSection";
import MacroDecisionLayer from "@/components/MacroDecisionLayer";
import MacroHistoricalAnalytics from "@/components/MacroHistoricalAnalytics";
import MacroRegimeDashboard from "@/components/MacroRegimeDashboard";
import { buildMacroIntelligenceReport } from "@/lib/intelligence/macroIntelligence";
import { readRecentMacroIntelligenceSnapshots } from "@/lib/data/macroIntelligenceSnapshots";
import { buildHistoryByDimension } from "@/lib/macroIntelligenceHistory";
import { buildMacroDecisionReport } from "@/lib/macroIntelligenceDecision";
import { buildHistoricalAnalytics } from "@/lib/macroIntelligenceHistoricalAnalytics";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";
// Phase 4 relocation — the detailed macro dashboard (tiered KPI snapshot +
// "what changed" feed) moved here from /overview. Same components, same
// data sources, same calculations; only the host route changed.
import { getAllSbpIndicators } from "@/lib/data/sbpServer";
import { getNetLiquidReserves } from "@/lib/data/fxReserves";
import { getGdpKpi } from "@/lib/data/worldBank";
import { getHistoricalEvents, toEconomicEvent } from "@/lib/economicCalendar/economicEventsRepo";
import { formatMonthLabel } from "@/lib/formatMonthLabel";
import type { Kpi } from "@/data/kpiData";
// Weekly Intelligence (health score + recession/default risk), also
// relocated from /overview. The models themselves are untouched: this page
// reads the snapshot a Monday cron already computed, exactly as /overview did.
import { getLatestWeeklyIntelligenceSnapshot } from "@/lib/data/weeklyIntelligence";
import { computeDataConfidence, type DataConfidence, type IndicatorStatus, type RiskModelResult } from "@/lib/riskModels";
import { getHealthStatus, type HealthModelResult } from "@/lib/economicHealth";
import { getQuarterlyGdpKpi } from "@/lib/data/quarterlyGdp";
import type { AiEconomicAnalysis } from "@/lib/data/aiEconomicAnalysis";
import type { AiRiskIntelligence } from "@/lib/data/aiRiskIntelligence";

// Phase 10 — Macro Intelligence promoted from an /overview section to its
// own first-class top-nav destination (TopNav.tsx's MacroIntelligenceNavItem,
// positioned beside Decision Lab). This page performs NO computation of its
// own: it calls the same, unmodified buildMacroIntelligenceReport() and
// renders the same, unmodified MacroIntelligenceSection component — only
// the surrounding page shell/hero is new. The engine's methodology,
// evidence rules, freshness gating, and confidence math are untouched; see
// macroIntelligence.ts/evidence.ts for those.
//
// /overview's own macro-intelligence section was replaced with a compact
// teaser linking here (see overview/page.tsx) so the full seven-dimension
// experience exists in exactly one place on the site, not two.
//
// Phase 10 UI refinement: the hero's metadata row reuses DashboardSection's
// own "Bloomberg-register stat strip" pattern (hairline-divided row, no
// card shadows) rather than a plain divider line — same visual language
// already established elsewhere on this dashboard, not a new one. Every
// value shown is a fact already true of the certified engine (7 dimensions,
// deterministic, evidence-gated, its three real data sources) — nothing
// invented, no "real-time"/"AI-powered"/"predictive" language.

const PAGE_URL = `${SITE_URL}/macro-intelligence`;
const TITLE = "Macro Intelligence — Pakistan's Economic Regime Across Seven Dimensions | PEIC";
const DESCRIPTION =
  "Deterministic, evidence-based classification of Pakistan's economy across seven independent dimensions — Inflation, Monetary Policy, External Sector, Liquidity & Credit, Fiscal Conditions, Growth, and Market Stress. Not a forecast, not a score.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const HERO_STATS: { label: string; value: string }[] = [
  { label: "Dimensions", value: "7" },
  { label: "Methodology", value: "Deterministic" },
  { label: "Confidence Model", value: "Evidence-Gated" },
  { label: "Sources", value: "SBP · World Bank · Yahoo Finance" },
];

// Phase 10.1 — how many recent daily snapshots to fetch for history. One
// query (readRecentMacroIntelligenceSnapshots -> get_recent_macro_intelligence_snapshots),
// never one per dimension (no N+1). 30 days is generous enough that a
// genuinely long-running regime's consecutive-count rarely hits the window
// boundary, while staying a small, bounded read — not an export.
const HISTORY_WINDOW = 30;

export default async function MacroIntelligencePage() {
  // Independent fetches: a history-read failure must never affect the
  // current report, and vice versa. readRecentMacroIntelligenceSnapshots()
  // already catches every error internally and resolves to [] rather than
  // rejecting (see its own header) — so this Promise.all cannot reject on
  // history's account, and the current signals always render even if
  // history genuinely cannot be read.
  // The four reads added for the relocated macro dashboard run inside this
  // same Promise.all, and every one of them is a call the Macro Intelligence
  // engine already makes internally — so they land in the same in-flight
  // dedupe / 10-minute L1 cache window (see sbp.ts's getSbpIndicator) rather
  // than adding a round of canonical-DB reads.
  const [report, recentSnapshots, sbp, netLiquidReserves, gdpKpi, historicalCalendarEvents, quarterlyGdp, weeklySnapshot] = await Promise.all([
    buildMacroIntelligenceReport(new Date()),
    readRecentMacroIntelligenceSnapshots(HISTORY_WINDOW),
    getAllSbpIndicators(),
    getNetLiquidReserves(),
    getGdpKpi(),
    getHistoricalEvents(),
    getQuarterlyGdpKpi(),
    getLatestWeeklyIntelligenceSnapshot(),
  ]);
  const historyByDimension = buildHistoryByDimension(recentSnapshots);
  // Phase 12 — pure derivation from the two values already in hand. No
  // second fetch, no second history store, no schema change: the decision
  // layer is a function of the engine's own signals plus the snapshots this
  // page already read.
  const decision = buildMacroDecisionReport({
    signals: report.signals,
    historyByDimension,
    snapshotCount: recentSnapshots.length,
    historyWindow: HISTORY_WINDOW,
  });
  // Phase 13 — a second pure derivation from the SAME already-fetched
  // snapshots. No additional query, no per-dimension or per-snapshot read,
  // and no schema change: everything the historical analytics needs (state,
  // confidence, dates, per-dimension coverage) is already persisted by
  // migration 0053.
  const historicalAnalytics = buildHistoricalAnalytics({
    snapshotsNewestFirst: recentSnapshots,
    historyWindow: HISTORY_WINDOW,
  });

  // ── Relocated macro dashboard (Phase 4) ──────────────────────────────────
  // Lifted verbatim from /overview: the same tiered KPI selection, the same
  // "what changed" feed, the same already-fetched values. No calculation
  // here is new or altered.
  const pktTimestamp = (() => {
    const d = new Date();
    const opts: Intl.DateTimeFormatOptions = { timeZone: "Asia/Karachi", hour12: false };
    const day = d.toLocaleString("en-GB", { ...opts, day: "numeric" });
    const month = d.toLocaleString("en-GB", { ...opts, month: "short" });
    const year = d.toLocaleString("en-GB", { ...opts, year: "numeric" });
    const time = d.toLocaleString("en-GB", { ...opts, hour: "2-digit", minute: "2-digit" });
    return `${day} ${month} ${year} · ${time} PKT`;
  })();

  const macroTier1: Kpi[] = [
    gdpKpi,
    { ...sbp.cpiInflation.kpi, sparkline: sbp.cpiInflation.trend.slice(-12).map((p) => p.value) },
    { ...sbp.policyRate.kpi, sparkline: sbp.policyRate.trend.slice(-12).map((p) => p.value) },
    { ...netLiquidReserves.kpi, sparkline: netLiquidReserves.trend.slice(-12).map((p) => p.value) },
  ];

  // asOf is each driver's own observation period (meta.observationDate) —
  // never a fetch time.
  const macroTier2 = [
    { label: "Current Account", value: sbp.currentAccount.kpi.value, unit: sbp.currentAccount.kpi.unit, change: sbp.currentAccount.kpi.change, trend: sbp.currentAccount.kpi.trend, asOf: formatMonthLabel(sbp.currentAccount.meta.observationDate) },
    { label: "Trade Balance", value: sbp.tradeBalance.kpi.value, unit: sbp.tradeBalance.kpi.unit, change: sbp.tradeBalance.kpi.change, trend: sbp.tradeBalance.kpi.trend, asOf: formatMonthLabel(sbp.tradeBalance.meta.observationDate) },
    { label: "Remittances", value: sbp.remittances.kpi.value, unit: sbp.remittances.kpi.unit, change: sbp.remittances.kpi.change, trend: sbp.remittances.kpi.trend, asOf: formatMonthLabel(sbp.remittances.meta.observationDate) },
    { label: "Exports", value: sbp.exports.kpi.value, unit: sbp.exports.kpi.unit, change: sbp.exports.kpi.change, trend: sbp.exports.kpi.trend, asOf: formatMonthLabel(sbp.exports.meta.observationDate) },
    { label: "Imports", value: sbp.imports.kpi.value, unit: sbp.imports.kpi.unit, change: sbp.imports.kpi.change, trend: sbp.imports.kpi.trend, asOf: formatMonthLabel(sbp.imports.meta.observationDate) },
    { label: "Fiscal Balance", value: sbp.fiscalBalance.kpi.value, unit: sbp.fiscalBalance.kpi.unit, change: sbp.fiscalBalance.kpi.change, trend: sbp.fiscalBalance.kpi.trend, asOf: formatMonthLabel(sbp.fiscalBalance.meta.observationDate) },
    { label: "Money Supply (M2)", value: sbp.moneySupplyM2.kpi.value, unit: sbp.moneySupplyM2.kpi.unit, change: sbp.moneySupplyM2.kpi.change, trend: sbp.moneySupplyM2.kpi.trend, asOf: formatMonthLabel(sbp.moneySupplyM2.meta.observationDate) },
  ];

  // "increased"/"decreased" comes from the change string's own sign, not
  // kpi.trend — trend means "the level is positive/negative", which can
  // disagree with the direction of the latest move.
  function deltaDirection(change: string): "increased" | "decreased" {
    return change.trim().startsWith("-") ? "decreased" : "increased";
  }

  const recentReleasedEvents = [...historicalCalendarEvents]
    .map(toEconomicEvent)
    .filter((e) => e.status === "released")
    .sort((a, b) => b.date.localeCompare(a.date));

  // ── Weekly Intelligence (relocated from /overview) ───────────────────────
  // Read-only projection of the snapshot the Monday cron computed. Every
  // threshold, factor and probability is the cron's; nothing is recomputed.
  function formatPktDate(d: Date): string {
    const opts: Intl.DateTimeFormatOptions = { timeZone: "Asia/Karachi", hour12: false };
    const day = d.toLocaleString("en-GB", { ...opts, day: "numeric" });
    const month = d.toLocaleString("en-GB", { ...opts, month: "short" });
    const time = d.toLocaleString("en-GB", { ...opts, hour: "2-digit", minute: "2-digit" });
    return `${day} ${month} · ${time} PKT`;
  }

  const health: HealthModelResult | null = weeklySnapshot
    ? (() => {
        const factors = weeklySnapshot.health.factors;
        const sorted = [...factors].sort((a, b) => b.score - a.score);
        return {
          score: weeklySnapshot.health.score,
          status: getHealthStatus(weeklySnapshot.health.score),
          factors,
          topStrengthFactors: sorted.slice(0, 3),
          topWeaknessFactors: sorted.slice(-3).reverse(),
        };
      })()
    : null;
  const recessionResult: RiskModelResult | null = weeklySnapshot
    ? {
        probability: weeklySnapshot.recession.probability,
        modelScore: weeklySnapshot.recession.modelScore,
        riskCategory: weeklySnapshot.recession.category,
        topRiskFactors: weeklySnapshot.recession.factors.topRiskFactors,
        topCushionFactors: weeklySnapshot.recession.factors.topCushionFactors,
      }
    : null;
  const defaultResult: RiskModelResult | null = weeklySnapshot
    ? {
        probability: weeklySnapshot.default.probability,
        modelScore: weeklySnapshot.default.modelScore,
        riskCategory: weeklySnapshot.default.category,
        topRiskFactors: weeklySnapshot.default.factors.topRiskFactors,
        topCushionFactors: weeklySnapshot.default.factors.topCushionFactors,
      }
    : null;
  const aiAnalysis: AiEconomicAnalysis | null = weeklySnapshot
    ? {
        sentiment: weeklySnapshot.ai.sentiment,
        summary: weeklySnapshot.ai.summary,
        topDrivers: weeklySnapshot.ai.topDrivers,
        modelUsed: weeklySnapshot.ai.modelUsed,
        modelDisplayName: weeklySnapshot.ai.modelDisplayName,
      }
    : null;
  const aiRisk: AiRiskIntelligence | null = weeklySnapshot
    ? {
        recession: weeklySnapshot.ai.recessionExplanation,
        default: weeklySnapshot.ai.defaultExplanation,
        modelUsed: weeklySnapshot.ai.modelUsed,
        modelDisplayName: weeklySnapshot.ai.modelDisplayName,
      }
    : null;
  const intelligenceComputedAt = weeklySnapshot ? formatPktDate(new Date(weeklySnapshot.computedAt)) : null;
  const intelligenceNextUpdateAt = weeklySnapshot
    ? formatPktDate(new Date(new Date(weeklySnapshot.computedAt).getTime() + 7 * 24 * 60 * 60 * 1000))
    : null;

  // Data-confidence inputs — the same indicator lists and the same
  // fallback/stale rules /overview applied, moved with the components that
  // display their result.
  function daysSince(dateStr: string): number {
    const d = dateStr.length === 4 ? new Date(`${dateStr}-07-01`) : new Date(dateStr);
    return (new Date().getTime() - d.getTime()) / 86_400_000;
  }
  function isFallback(meta: { source: string }): boolean {
    return meta.source.includes("fallback");
  }
  function isStale(meta: { observationDate: string; frequency: string }, isFb: boolean): boolean {
    if (isFb) return false;
    const days = daysSince(meta.observationDate);
    if (meta.frequency === "Annual") return days > 730;
    if (meta.frequency === "As-Needed") return days > 45;
    if (meta.frequency === "Weekly") return days > 14;
    return days > 50;
  }

  const recessionIndicators: IndicatorStatus[] = [
    { label: "GDP Growth (Annual)", isFallback: false, isStale: daysSince(gdpKpi.latestDate ?? "2024") > 730 },
    { label: "GDP Growth (Quarterly)", isFallback: quarterlyGdp.isFallback, isStale: !quarterlyGdp.isFallback && daysSince(quarterlyGdp.kpi.latestDate ?? "2026-03-31") > 130 },
    { label: "CPI Inflation", isFallback: isFallback(sbp.cpiInflation.meta), isStale: isStale(sbp.cpiInflation.meta, isFallback(sbp.cpiInflation.meta)) },
    { label: "Policy Rate", isFallback: isFallback(sbp.policyRate.meta), isStale: isStale(sbp.policyRate.meta, isFallback(sbp.policyRate.meta)) },
    { label: "SBP Reserves", isFallback: isFallback(netLiquidReserves.meta), isStale: isStale(netLiquidReserves.meta, isFallback(netLiquidReserves.meta)) },
    { label: "Bank Reserves", isFallback: isFallback(sbp.netBankReserves.meta), isStale: isStale(sbp.netBankReserves.meta, isFallback(sbp.netBankReserves.meta)) },
    { label: "Monthly Imports", isFallback: isFallback(sbp.imports.meta), isStale: isStale(sbp.imports.meta, isFallback(sbp.imports.meta)) },
    { label: "Current Account", isFallback: isFallback(sbp.currentAccount.meta), isStale: isStale(sbp.currentAccount.meta, isFallback(sbp.currentAccount.meta)) },
    { label: "USD/PKR Rate", isFallback: isFallback(sbp.usdPkr.meta), isStale: isStale(sbp.usdPkr.meta, isFallback(sbp.usdPkr.meta)) },
    { label: "LSM Output", isFallback: isFallback(sbp.lsm.meta), isStale: isStale(sbp.lsm.meta, isFallback(sbp.lsm.meta)) },
    { label: "Private Credit", isFallback: isFallback(sbp.privateCreditGrowth.meta), isStale: isStale(sbp.privateCreditGrowth.meta, isFallback(sbp.privateCreditGrowth.meta)) },
  ];

  const defaultIndicators: IndicatorStatus[] = [
    { label: "SBP Reserves", isFallback: isFallback(netLiquidReserves.meta), isStale: isStale(netLiquidReserves.meta, isFallback(netLiquidReserves.meta)) },
    { label: "Bank Reserves", isFallback: isFallback(sbp.netBankReserves.meta), isStale: isStale(sbp.netBankReserves.meta, isFallback(sbp.netBankReserves.meta)) },
    { label: "Monthly Imports", isFallback: isFallback(sbp.imports.meta), isStale: isStale(sbp.imports.meta, isFallback(sbp.imports.meta)) },
    { label: "Fiscal Balance", isFallback: isFallback(sbp.fiscalBalance.meta), isStale: isStale(sbp.fiscalBalance.meta, isFallback(sbp.fiscalBalance.meta)) },
    { label: "Current Account", isFallback: isFallback(sbp.currentAccount.meta), isStale: isStale(sbp.currentAccount.meta, isFallback(sbp.currentAccount.meta)) },
    { label: "USD/PKR Rate", isFallback: isFallback(sbp.usdPkr.meta), isStale: isStale(sbp.usdPkr.meta, isFallback(sbp.usdPkr.meta)) },
    { label: "Policy Rate", isFallback: isFallback(sbp.policyRate.meta), isStale: isStale(sbp.policyRate.meta, isFallback(sbp.policyRate.meta)) },
  ];

  const recessionConfidence: DataConfidence = computeDataConfidence(recessionIndicators, pktTimestamp);
  const defaultConfidence: DataConfidence = computeDataConfidence(defaultIndicators, pktTimestamp);

  const intelligenceFeedItems: IntelligenceFeedItem[] = [
    ...recentReleasedEvents.slice(0, 5).map((e): IntelligenceFeedItem => ({
      kind: "release",
      date: e.date,
      text: e.actual ? `${e.title} released — ${e.actual}` : `${e.title} released`,
    })),
    ...[netLiquidReserves.kpi, sbp.tradeBalance.kpi, sbp.moneySupplyM2.kpi, sbp.lsm.kpi].map((kpi): IntelligenceFeedItem => ({
      kind: "signal",
      text: `${kpi.title} ${deltaDirection(kpi.change)} — ${kpi.change}`,
    })),
  ];

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="min-w-0 flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4 pb-2">
            <span className="text-label text-neon-blue">Institutional Macro Analysis</span>
            <h1 className="text-display max-w-3xl text-white light:text-slate-900">Macro Intelligence</h1>
            <p className="max-w-2xl text-base leading-relaxed text-white/60 light:text-slate-500">
              Pakistan&rsquo;s macroeconomic regime, interpreted across seven dimensions.
            </p>

            {/* Bloomberg-register stat strip — identical pattern to
                DashboardSection's own stats grid (hairline-divided,
                tabular, no card shadows) rather than a new component. */}
            <div className="section-divider mt-3 grid grid-cols-2 divide-x divide-[var(--border-subtle)] pt-4 sm:grid-cols-4">
              {HERO_STATS.map((stat) => (
                <div key={stat.label} className="px-3 py-1 first:pl-0">
                  <p className="text-label text-white/45 light:text-slate-400">{stat.label}</p>
                  <p className="text-mono-num mt-1 text-sm font-semibold text-white light:text-slate-900">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Relocated from /overview (Phase 4): the detailed macro
              dashboard. The compact Pakistan snapshot stays on /overview;
              this is the tiered view with sparklines and driver
              breakdown, which belongs with the rest of the macro analysis. */}
          <section id="macro-snapshot" aria-label="Pakistan macro snapshot">
            <MacroSnapshot updatedAt={pktTimestamp} tier1={macroTier1} tier2={macroTier2} />
          </section>

          {/* Health score + risk intelligence, relocated from /overview
              (Phase 4). Rendered only when the weekly snapshot exists —
              the same gate /overview applied, so a missing snapshot shows
              the same explanatory fallback rather than empty cards. */}
          {health && aiAnalysis && recessionResult && defaultResult && aiRisk && intelligenceComputedAt && intelligenceNextUpdateAt ? (
            <>
              <section id="health-score" aria-label="Economic health score">
                <HealthScoreCard health={health} ai={aiAnalysis} computedAt={intelligenceComputedAt} nextUpdateAt={intelligenceNextUpdateAt} />
              </section>
              <section id="risk-intelligence" aria-label="Risk intelligence">
                <RiskIntelligenceSection
                  recession={recessionResult}
                  defaultRisk={defaultResult}
                  ai={aiRisk}
                  recessionConfidence={recessionConfidence}
                  defaultConfidence={defaultConfidence}
                  computedAt={intelligenceComputedAt}
                  nextUpdateAt={intelligenceNextUpdateAt}
                />
              </section>
            </>
          ) : (
            <p className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface p-4 text-[13px] text-pe-text-2">
              The weekly intelligence snapshot is not available yet. Health score and risk analysis will appear once the next weekly run completes.
            </p>
          )}

          <MacroDecisionLayer report={decision} />

          {/* Phase C — a third pure derivation from the values already in
              hand (report.signals + the same historicalAnalytics object
              below). No additional query and no new data source: the
              view-models in lib/macroIntelligenceViews.ts only re-shape
              engine output for presentation. */}
          <MacroRegimeDashboard report={report} analytics={historicalAnalytics} />

          <MacroHistoricalAnalytics report={historicalAnalytics} />

          <MacroIntelligenceSection report={report} historyByDimension={historyByDimension} />

          {/* Also relocated from /overview: the "what changed" feed —
              recent releases with their outcomes plus per-indicator
              movement, built from this page's own already-fetched data. */}
          <section id="intelligence-feed" aria-label="Intelligence feed">
            <IntelligenceFeed items={intelligenceFeedItems} />
          </section>
        </div>
      </main>
    </div>
  );
}
