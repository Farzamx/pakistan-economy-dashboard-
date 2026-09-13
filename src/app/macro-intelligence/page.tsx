import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import MacroIntelligenceSection from "@/components/MacroIntelligenceSection";
import MacroDecisionLayer from "@/components/MacroDecisionLayer";
import MacroHistoricalAnalytics from "@/components/MacroHistoricalAnalytics";
import { buildMacroIntelligenceReport } from "@/lib/intelligence/macroIntelligence";
import { readRecentMacroIntelligenceSnapshots } from "@/lib/data/macroIntelligenceSnapshots";
import { buildHistoryByDimension } from "@/lib/macroIntelligenceHistory";
import { buildMacroDecisionReport } from "@/lib/macroIntelligenceDecision";
import { buildHistoricalAnalytics } from "@/lib/macroIntelligenceHistoricalAnalytics";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

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
  const [report, recentSnapshots] = await Promise.all([
    buildMacroIntelligenceReport(new Date()),
    readRecentMacroIntelligenceSnapshots(HISTORY_WINDOW),
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

          <MacroDecisionLayer report={decision} />

          <MacroHistoricalAnalytics report={historicalAnalytics} />

          <MacroIntelligenceSection report={report} historyByDimension={historyByDimension} />
        </div>
      </main>
    </div>
  );
}
