"use client";

import { useState } from "react";
import Link from "next/link";
import { COMPARISON_METRICS, rankProvincesByField, type ProvincialComparisonMetric } from "@/lib/provincial/provincialComparison";
import { getProvinceBySlug } from "@/lib/provincial/provincialBudgetRegistry";
import { useLanguage } from "@/components/LanguageProvider";

export default function ProvinceCompareTable() {
  const { t } = useLanguage();
  const [activeMetric, setActiveMetric] = useState<ProvincialComparisonMetric>(COMPARISON_METRICS[0]);
  const ranked = rankProvincesByField(activeMetric.field);
  const maxValue = Math.max(...ranked.map((r) => r.value ?? 0), 1);

  return (
    <section className="glass-card flex flex-col gap-5 rounded-2xl p-6 sm:p-8">
      <div>
        <h2 className="text-xl font-semibold text-white light:text-slate-900">{t("provincial.compareTableTitle")}</h2>
        <p className="mt-1 text-sm text-white/60 light:text-slate-500">
          {t("provincial.compareTableDesc")}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {COMPARISON_METRICS.map((m) => (
          <button
            key={m.field}
            type="button"
            onClick={() => setActiveMetric(m)}
            aria-pressed={activeMetric.field === m.field}
            className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
              activeMetric.field === m.field
                ? "border-neon-blue/40 bg-neon-blue/15 text-neon-blue"
                : "border-white/10 light:border-slate-200 text-white/50 light:text-slate-500 hover:text-white light:hover:text-slate-900"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {ranked.map((entry, i) => {
          const meta = getProvinceBySlug(entry.province);
          const widthPct = entry.value === null ? 0 : (entry.value / maxValue) * 100;
          return (
            <Link
              key={entry.province}
              href={`/provincial-budget/${meta?.slug ?? entry.province}`}
              className="group flex flex-col gap-1.5 rounded-xl border border-white/5 light:border-slate-100 p-3 transition-colors hover:bg-white/[0.03] light:hover:bg-slate-50"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-white/85 light:text-slate-800">
                  <span className="text-xs text-white/30 light:text-slate-400">#{i + 1}</span>
                  {entry.name}
                </span>
                <span className="font-semibold text-white light:text-slate-900">
                  {entry.value === null ? t("provincial.notAvailable") : `Rs ${entry.value.toFixed(1)}bn`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/5 light:bg-slate-100">
                <div className="h-full rounded-full transition-all" style={{ width: `${widthPct}%`, backgroundColor: entry.color }} />
              </div>
              <span className="text-[10px] text-white/30 light:text-slate-400">FY{entry.fiscalYear} {t("provincial.budgetEstimate")}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
