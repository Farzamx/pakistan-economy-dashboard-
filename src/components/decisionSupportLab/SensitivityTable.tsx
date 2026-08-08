"use client";

import type { SensitivityRow } from "@/lib/decisionSupportLab/goalProbabilityEngine";

interface Props {
  rows: SensitivityRow[];
}

/** The shared sensitivity-analysis table — how the funding gap moves if one assumption (return, contribution, inflation) shifts, holding everything else fixed. Deterministic, not Monte Carlo — complements the probability gauge rather than duplicating it. */
export default function SensitivityTable({ rows }: Props) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <h3 className="mb-1 text-sm font-semibold text-white light:text-slate-900">Sensitivity Analysis</h3>
      <p className="mb-3 text-xs text-white/50 light:text-slate-500">How your funding gap changes if one assumption shifts, holding everything else fixed.</p>
      <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] text-left text-xs text-white/40 light:text-slate-400">
              <th className="px-3 py-2 font-medium">Assumption Shift</th>
              <th className="px-3 py-2 text-right font-medium">Funding Gap</th>
              <th className="px-3 py-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i > 0 ? "border-t border-[var(--border-subtle)]" : ""}>
                <td className="px-3 py-2 text-white/70 light:text-slate-600">{row.label}</td>
                <td className={`text-mono-num px-3 py-2 text-right tabular-nums ${row.fundingGapPct > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {row.fundingGapPct > 0 ? "+" : ""}{row.fundingGapPct.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${row.isOnTrack ? "bg-emerald-400/10 text-emerald-400" : "bg-rose-400/10 text-rose-400"}`}>
                    {row.isOnTrack ? "On Track" : "Behind"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
