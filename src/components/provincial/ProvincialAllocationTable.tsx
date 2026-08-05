"use client";

import type { ProvincialAllocationSlice } from "@/lib/provincial/provincialBudgetData";
import { useLanguage } from "@/components/LanguageProvider";

interface ProvincialAllocationTableProps {
  data: ProvincialAllocationSlice[];
}

export default function ProvincialAllocationTable({ data }: ProvincialAllocationTableProps) {
  const { t } = useLanguage();
  const sorted = [...data].sort((a, b) => b.value - a.value);

  return (
    <>
      {/* Phase M1 §9 — stacked cards on mobile instead of a horizontally-
          scrolled table; the desktop table below is completely unchanged,
          just gated to min-[800px] so it never renders both at once. */}
      <div className="flex flex-col gap-2 min-[800px]:hidden">
        {sorted.map((s) => (
          <div key={s.label} className="glass-card-raised flex items-center justify-between gap-3 rounded-xl p-3">
            <span className="flex min-w-0 items-center gap-2.5 text-sm text-white/80 light:text-slate-700">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="flex shrink-0 items-baseline gap-2 text-right">
              <span className="text-mono-num text-sm font-semibold tabular-nums text-white light:text-slate-800">{s.value.toFixed(1)}</span>
              <span className="text-mono-num text-xs tabular-nums text-white/50 light:text-slate-500">{s.pct.toFixed(1)}%</span>
            </span>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-white/5 light:border-slate-200 min-[800px]:block">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="border-b border-white/5 light:border-slate-200 text-left text-xs text-white/40 light:text-slate-500">
            <th className="px-4 py-3 font-medium">{t("provincial.category")}</th>
            <th className="px-4 py-3 font-medium text-right">{t("provincial.rsBillion")}</th>
            <th className="px-4 py-3 font-medium text-right">{t("provincial.share")}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr key={s.label} className="border-b border-white/5 light:border-slate-100 last:border-0">
              <td className="px-4 py-3">
                <span className="flex items-center gap-2.5 text-white/80 light:text-slate-700">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
                  {s.label}
                </span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-white/80 light:text-slate-700">{s.value.toFixed(1)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-white/60 light:text-slate-500">{s.pct.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}
