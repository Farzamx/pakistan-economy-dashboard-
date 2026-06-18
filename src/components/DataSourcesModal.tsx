"use client";

import { useEffect, useRef, useState } from "react";
import type { Kpi } from "@/data/kpiData";
import {
  formatLatestDate,
  getFreshnessStatus,
  FRESHNESS_DOT,
  FRESHNESS_LABEL,
} from "@/lib/dataFreshness";
import { useTheme } from "@/components/ThemeProvider";

interface Props {
  kpis: Kpi[];
}

// Static entries for sources that don't produce Kpi objects
const STATIC_ENTRIES = [
  { indicator: "News Feed (GNews)", source: "GNews API", seriesId: "pakistan economy", latestDate: undefined, frequency: undefined },
  { indicator: "News Feed (RSS)", source: "Dawn / Reuters", seriesId: "RSS", latestDate: undefined, frequency: undefined },
  { indicator: "AI Sentiment", source: "Claude (Haiku)", seriesId: "claude-haiku", latestDate: undefined, frequency: undefined },
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

            {/* Legend */}
            <div className="flex shrink-0 items-center gap-4 border-b border-white/5 light:border-slate-200 px-6 py-2.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/30 light:text-slate-400">Legend</span>
              <span className="flex items-center gap-1 text-xs text-emerald-400 light:text-emerald-700">
                <span className="text-[8px]">●</span> Current
              </span>
              <span className="flex items-center gap-1 text-xs text-amber-400 light:text-amber-600">
                <span className="text-[8px]">●</span> Delayed
              </span>
              <span className="flex items-center gap-1 text-xs text-rose-400 light:text-rose-700">
                <span className="text-[8px]">●</span> Stale
              </span>
              <span className="ml-auto text-[10px] text-white/25 light:text-slate-400">
                Thresholds vary by frequency · Monthly: current ≤60d, delayed ≤90d
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
                    <th className="px-4 py-3">Series ID</th>
                    <th className="px-4 py-3">Last Updated</th>
                    <th className="px-4 py-3">Frequency</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] light:divide-slate-100">
                  {kpis.map((kpi, i) => {
                    const status = getFreshnessStatus(kpi.latestDate, kpi.frequency);
                    const dotClass = FRESHNESS_DOT[status];
                    const label = FRESHNESS_LABEL[status];
                    return (
                      <tr key={`${i}-${kpi.title}`} className="transition hover:bg-white/[0.02] light:hover:bg-slate-50">
                        <td className="px-6 py-3 font-medium text-white/80 light:text-slate-800">{kpi.title}</td>
                        <td className="px-4 py-3 text-white/50 light:text-slate-500">{kpi.source ?? "—"}</td>
                        <td className="px-4 py-3 font-mono text-white/35 light:text-slate-400">{kpi.seriesId ?? "—"}</td>
                        <td className="px-4 py-3 text-white/50 light:text-slate-500" suppressHydrationWarning>
                          {kpi.latestDate ? formatLatestDate(kpi.latestDate, kpi.frequency) : "—"}
                        </td>
                        <td className="px-4 py-3 text-white/50 light:text-slate-500">{kpi.frequency ?? "—"}</td>
                        <td className="px-4 py-3">
                          {kpi.latestDate ? (
                            <span className={`flex items-center gap-1 ${dotClass}`}>
                              <span className="text-[8px]">●</span>
                              {label}
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
                      <td className="px-4 py-3 font-mono text-white/35 light:text-slate-400">{entry.seriesId}</td>
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
