"use client";

import { useEffect, useRef, useState } from "react";
import type { Kpi } from "@/data/kpiData";
import { formatLatestDate } from "@/lib/dataFreshness";
import { getDataQuality, DATA_QUALITY_DOT } from "@/lib/dataQuality";
import { getRetrievalMethod } from "@/lib/retrievalMethod";
import { SOURCE_CHAINS, getActiveTier } from "@/lib/marketDataSources";
import { useTheme } from "@/components/ThemeProvider";

interface Props {
  kpis: Kpi[];
}

// Static entries for sources that don't produce Kpi objects. Corrected per
// Production Audit Part 9 — these previously named GNews API (removed from
// the codebase) and Claude/Haiku (never the actual provider), both stale
// and factually wrong. See src/lib/data/news.ts for the full source list
// (6 Google News RSS queries + BBC/Dawn/Express Tribune direct feeds) and
// src/lib/openRouterClient.ts for the actual AI chain.
const STATIC_ENTRIES = [
  { indicator: "News Feed (Aggregated)", source: "Google News RSS", seriesId: "6 targeted queries", latestDate: undefined, frequency: undefined },
  { indicator: "News Feed (Direct)", source: "BBC / Dawn / Express Tribune RSS", seriesId: "3 outlet feeds", latestDate: undefined, frequency: undefined },
  { indicator: "AI Sentiment", source: "OpenRouter (free-tier models) + Groq", seriesId: "gpt-oss-20b/120b, Hermes 3 405B, Groq gpt-oss-120b", latestDate: undefined, frequency: undefined },
] as const;

export default function DataSourcesModal({ kpis }: Props) {
  const [open, setOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isLight = theme === "light";

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Prevent body scroll while modal open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Trigger button — rendered inline in the hero right slot */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-[#38bdf8]/20 px-3 py-1.5 text-[11px] font-medium text-[#38bdf8]/55 transition-all hover:border-[#38bdf8]/45 hover:text-[#38bdf8]/90 hover:bg-[#38bdf8]/5"
        aria-label="Open data sources audit table"
      >
        <span className="text-[9px] opacity-70">⬡</span>
        Data Sources
      </button>

      {/* Modal overlay — backdrop stays the same dim/blur in both themes,
          matching SettingsModal and PsxComingSoonModal conventions. */}
      {open && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0, 0, 4, 0.75)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === overlayRef.current) setOpen(false); }}
          role="dialog"
          aria-modal="true"
          aria-label="Data Sources Audit"
        >
          <div
            className="relative flex max-h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 light:border-slate-200 shadow-2xl"
            style={{
              background: isLight ? "#FFFFFF" : "rgba(8, 10, 26, 0.96)",
              backdropFilter: isLight ? "none" : "blur(24px)",
            }}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-white/5 light:border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-white light:text-slate-900">Data Sources</h2>
                <p className="mt-0.5 text-xs text-white/40 light:text-slate-500">
                  All {kpis.length} indicators audited · freshness computed server-side
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-white/10 light:border-slate-300 px-3 py-1.5 text-xs text-white/50 light:text-slate-600 transition hover:border-white/20 light:hover:border-slate-400 hover:text-white/80 light:hover:text-slate-900 light:hover:bg-slate-100"
                aria-label="Close"
              >
                Close ✕
              </button>
            </div>

            {/* Legend — the same 5-state Data Quality vocabulary used everywhere else on the dashboard (KpiCard, SEO pages, MarketTicker) */}
            <div className="flex shrink-0 flex-wrap items-center gap-4 border-b border-white/5 light:border-slate-200 px-6 py-2.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/30 light:text-slate-400">Legend</span>
              <span className="flex items-center gap-1 text-xs text-emerald-400 light:text-emerald-700">
                <span className="text-[8px]">●</span> Verified
              </span>
              <span className="flex items-center gap-1 text-xs text-amber-400 light:text-amber-600">
                <span className="text-[8px]">●</span> Delayed
              </span>
              <span className="flex items-center gap-1 text-xs text-sky-400 light:text-sky-700">
                <span className="text-[8px]">●</span> Cached
              </span>
              <span className="flex items-center gap-1 text-xs text-orange-400 light:text-orange-600">
                <span className="text-[8px]">●</span> Fallback
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <span className="text-[8px]">●</span> Unavailable
              </span>
              <span className="ml-auto text-[10px] text-white/25 light:text-slate-400">
                Hover any Status cell for the exact reason · weekends/holidays never count as Delayed for market data
              </span>
            </div>

            {/* Table — scrollable */}
            <div className="overflow-y-auto themed-scrollbar">
              <table className="w-full text-xs">
                <thead
                  className="sticky top-0 border-b border-white/5 light:border-slate-200"
                  style={{ background: isLight ? "#F8FAFC" : "rgba(8, 10, 26, 0.98)" }}
                >
                  <tr className="text-left text-[10px] font-medium uppercase tracking-wider text-white/30 light:text-slate-600">
                    <th className="px-6 py-3">Indicator</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Retrieval Method</th>
                    <th className="px-4 py-3">Series ID</th>
                    <th className="px-4 py-3">Primary / Secondary / Fallback</th>
                    <th className="px-4 py-3">Last Updated</th>
                    <th className="px-4 py-3">Frequency</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] light:divide-slate-100">
                  {kpis.map((kpi, i) => {
                    // Production Audit Part 3/4 fix: this previously called
                    // getFreshnessStatus() directly — an age-only check that
                    // never looked at sourceStatus, so a fallback value with
                    // a recent-looking hardcoded date (e.g. the FX fallback
                    // snapshot) could read "Current" here even while serving
                    // a static snapshot. getDataQuality() is the same
                    // function every other surface (KpiCard, SEO pages,
                    // MarketTicker) uses — one source of truth, not a
                    // parallel check that can silently drift out of sync.
                    const quality = getDataQuality({
                      sourceStatus: kpi.sourceStatus ?? "live",
                      latestDate: kpi.latestDate,
                      frequency: kpi.frequency,
                      marketType: kpi.marketType,
                      expectedReleaseDate: kpi.expectedReleaseDate,
                      releaseAlreadyReflected: kpi.releaseAlreadyReflected,
                      snapshotDate: kpi.snapshotDate,
                    });
                    const dotClass = DATA_QUALITY_DOT[quality.state];
                    // Gated on marketType, not just title — see KpiCard.tsx's
                    // comment: some SBP EasyData indicators share a display
                    // title with an unrelated Yahoo/FRED/Twelve-Data one.
                    const chain = kpi.marketType ? SOURCE_CHAINS[kpi.title] : undefined;
                    const activeTier = chain ? getActiveTier(kpi.title, kpi.source) : "unknown";
                    return (
                      <tr key={`${i}-${kpi.title}`} className="transition hover:bg-white/[0.02] light:hover:bg-slate-50">
                        <td className="px-6 py-3 font-medium text-white/80 light:text-slate-800">{kpi.title}</td>
                        <td className="px-4 py-3 text-white/50 light:text-slate-500">{kpi.source ?? "—"}</td>
                        <td className="px-4 py-3 text-white/40 light:text-slate-400">{getRetrievalMethod(kpi.source)}</td>
                        <td className="px-4 py-3 font-mono text-white/35 light:text-slate-400">{kpi.seriesId ?? "—"}</td>
                        <td className="px-4 py-3 text-white/40 light:text-slate-400">
                          {chain ? (
                            <span className="flex items-center gap-1 whitespace-nowrap">
                              <span className={activeTier === "primary" ? "font-semibold text-white light:text-slate-900" : ""}>{chain.primary}</span>
                              <span className="text-white/20 light:text-slate-300">→</span>
                              <span className={activeTier === "secondary" ? "font-semibold text-white light:text-slate-900" : ""}>{chain.secondary ?? "—"}</span>
                              <span className="text-white/20 light:text-slate-300">→</span>
                              <span className={activeTier === "fallback" ? "font-semibold text-white light:text-slate-900" : ""}>{chain.fallback}</span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-white/50 light:text-slate-500" suppressHydrationWarning>
                          {kpi.latestDate ? formatLatestDate(kpi.latestDate, kpi.frequency) : "—"}
                        </td>
                        <td className="px-4 py-3 text-white/50 light:text-slate-500">{kpi.frequency ?? "—"}</td>
                        <td className="px-4 py-3" title={quality.description}>
                          {kpi.latestDate ? (
                            <span className={`flex items-center gap-1 whitespace-nowrap ${dotClass}`}>
                              <span className="text-[8px]">●</span>
                              {quality.state}
                            </span>
                          ) : (
                            <span className="text-white/25 light:text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {STATIC_ENTRIES.map((entry) => (
                    <tr key={entry.indicator} className="transition hover:bg-white/[0.02] light:hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-white/60 light:text-slate-700">{entry.indicator}</td>
                      <td className="px-4 py-3 text-white/50 light:text-slate-500">{entry.source}</td>
                      <td className="px-4 py-3 text-white/40 light:text-slate-400">{getRetrievalMethod(entry.source)}</td>
                      <td className="px-4 py-3 font-mono text-white/35 light:text-slate-400">{entry.seriesId}</td>
                      <td className="px-4 py-3 text-white/25 light:text-slate-400">—</td>
                      <td className="px-4 py-3 text-white/30 light:text-slate-400">live</td>
                      <td className="px-4 py-3 text-white/30 light:text-slate-400">As Needed</td>
                      <td className="px-4 py-3 text-white/25 light:text-slate-400">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
