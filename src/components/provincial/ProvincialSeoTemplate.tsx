import Link from "next/link";
import type { ProvincialSeoPageDef } from "@/lib/provincial/provincialSeoPages";
import { getLatestProvinceYear } from "@/lib/provincial/provincialBudgetData";
import { rankProvincesByField } from "@/lib/provincial/provincialComparison";
import { getProvinceMeta } from "@/lib/provincial/provincialBudgetRegistry";

interface ProvincialSeoTemplateProps {
  page: ProvincialSeoPageDef;
}

/** Renders /provincial-budget/[slug] pages that aren't a plain province workspace — content is generated from the live dataset (never hand-typed numbers) so it can't drift from the interactive workspace pages. */
export default function ProvincialSeoTemplate({ page }: ProvincialSeoTemplateProps) {
  if (page.type === "province-overview" && page.province) {
    const meta = getProvinceMeta(page.province);
    const year = getLatestProvinceYear(page.province);
    const rows: { label: string; value: number | null }[] = [
      { label: "Total Budget Outlay", value: year.totalOutlay },
      { label: "Development Budget", value: year.developmentBudget },
      { label: "Current Expenditure", value: year.currentExpenditure },
      { label: "Education", value: year.education },
      { label: "Health", value: year.health },
      { label: "Debt Servicing", value: year.debtServicing },
      { label: "Federal Transfers", value: year.federalTransfers },
      { label: "Own Revenue", value: year.ownRevenue },
    ];
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-white light:text-slate-900 break-words">{page.title}</h1>
        <p className="text-sm leading-relaxed text-white/60 light:text-slate-600">{page.description}</p>
        <div className="glass-card overflow-x-auto rounded-2xl p-6">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-white/5 light:border-slate-100 last:border-0">
                  <td className="py-3 text-white/70 light:text-slate-600">{r.label}</td>
                  <td className="py-3 text-right font-semibold tabular-nums text-white light:text-slate-900">
                    {r.value === null ? "Not available" : `Rs ${r.value.toFixed(1)}bn`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] text-white/40 light:text-slate-400">
            Source: {meta.name} {year.citations.summary.document}, FY{year.fiscalYear} Budget Estimate.
          </p>
        </div>
        <Link href={`/provincial-budget/${meta.slug}`} className="text-sm font-medium text-neon-blue hover:underline">
          View the full {meta.name} Budget Workshop →
        </Link>
      </div>
    );
  }

  if (page.type === "province-category" && page.province && page.field) {
    const meta = getProvinceMeta(page.province);
    const year = getLatestProvinceYear(page.province);
    const value = year[page.field];
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-white light:text-slate-900 break-words">{page.title}</h1>
        <p className="text-sm leading-relaxed text-white/60 light:text-slate-600">{page.description}</p>
        <div className="glass-card flex flex-col gap-2 rounded-2xl p-8">
          <span className="text-sm text-white/50 light:text-slate-500">{meta.name} — {page.fieldLabel}</span>
          <span className="text-4xl font-bold text-white light:text-slate-900">
            {typeof value === "number" ? `Rs ${value.toFixed(1)}bn` : "Not available for this year"}
          </span>
          <span className="text-xs text-white/40 light:text-slate-400">
            FY{year.fiscalYear} Budget Estimate · {year.citations.summary.document}
          </span>
        </div>
        <Link href={`/provincial-budget/${meta.slug}`} className="text-sm font-medium text-neon-blue hover:underline">
          View the full {meta.name} Budget Workshop →
        </Link>
      </div>
    );
  }

  if (page.type === "cross-comparison" && page.field) {
    const ranked = rankProvincesByField(page.field);
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-white light:text-slate-900 break-words">{page.title}</h1>
        <p className="text-sm leading-relaxed text-white/60 light:text-slate-600">{page.description}</p>
        <div className="glass-card flex flex-col gap-3 rounded-2xl p-6">
          {ranked.map((entry, i) => (
            <Link
              key={entry.province}
              href={`/provincial-budget/${entry.province}`}
              className="flex items-center justify-between rounded-xl border border-white/5 light:border-slate-100 p-4 transition-colors hover:bg-white/[0.03] light:hover:bg-slate-50"
            >
              <span className="flex items-center gap-3 font-medium text-white/85 light:text-slate-800">
                <span className="text-white/30 light:text-slate-400">#{i + 1}</span>
                {entry.name}
              </span>
              <span className="font-semibold text-white light:text-slate-900">
                {entry.value === null ? "Not available" : `Rs ${entry.value.toFixed(1)}bn`}
              </span>
            </Link>
          ))}
        </div>
        <Link href="/provincial-budget/compare" className="text-sm font-medium text-neon-blue hover:underline">
          Compare on other metrics →
        </Link>
      </div>
    );
  }

  return null;
}
