"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import type { CategoryContribution } from "@/lib/personalInflation/engine";
import { CPI_GROUP_BY_NO } from "@/lib/personalInflation/cpiGroups";

type SortKey = "groupName" | "yourWeightPct" | "officialWeightPct" | "categoryInflationPct" | "yourContributionPct";

interface Props {
  contributions: CategoryContribution[];
  monthlyBudget: number;
}

const COLUMNS: { key: SortKey; labelKey: string }[] = [
  { key: "groupName", labelKey: "personalInflation.colCategory" },
  { key: "yourWeightPct", labelKey: "personalInflation.colYourWeight" },
  { key: "officialWeightPct", labelKey: "personalInflation.colOfficialWeight" },
  { key: "categoryInflationPct", labelKey: "personalInflation.colCategoryInflation" },
  { key: "yourContributionPct", labelKey: "personalInflation.colContribution" },
];

export default function ContributionTable({ contributions, monthlyBudget }: Props) {
  const { t } = useLanguage();
  const [sortKey, setSortKey] = useState<SortKey>("yourContributionPct");
  const [sortDesc, setSortDesc] = useState(true);

  const sorted = useMemo(() => {
    const rows = [...contributions];
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDesc ? -cmp : cmp;
    });
    return rows;
  }, [contributions, sortKey, sortDesc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDesc((d) => !d);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  return (
    <div className="glass-card overflow-hidden rounded-xl">
      <h3 className="px-4 pt-4 text-sm font-semibold text-white sm:px-5 light:text-slate-900">{t("personalInflation.breakdownTitle")}</h3>
      <div className="overflow-x-auto">
        <table className="mt-3 w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="section-divider">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="px-4 py-2 text-left sm:px-5"
                  aria-sort={sortKey === col.key ? (sortDesc ? "descending" : "ascending") : "none"}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className="text-label inline-flex items-center gap-1 text-white/40 hover:text-white/70 light:text-slate-400 light:hover:text-slate-700"
                  >
                    {t(col.labelKey)}
                    {sortKey === col.key && <span aria-hidden="true">{sortDesc ? "↓" : "↑"}</span>}
                  </button>
                </th>
              ))}
              <th scope="col" className="px-4 py-2 text-left sm:px-5">
                <span className="text-label text-white/40 light:text-slate-400">{t("personalInflation.colAmount")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const color = CPI_GROUP_BY_NO.get(c.groupNo)?.color ?? "#828282";
              const amount = (c.yourWeightPct / 100) * monthlyBudget;
              return (
                <tr key={c.groupNo} className="panel-row">
                  <td className="px-4 py-2.5 sm:px-5">
                    <span className="flex items-center gap-2 text-white/85 light:text-slate-800">
                      <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      {c.groupName}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 sm:px-5">
                    <div className="flex items-center gap-2">
                      <span className="text-mono-num w-12 shrink-0 tabular-nums text-white/70 light:text-slate-600">{c.yourWeightPct.toFixed(1)}%</span>
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--surface-3)]" aria-hidden="true">
                        <span className="block h-full rounded-full transition-all" style={{ width: `${Math.min(100, c.yourWeightPct)}%`, backgroundColor: color }} />
                      </span>
                    </div>
                  </td>
                  <td className="text-mono-num px-4 py-2.5 tabular-nums text-white/50 sm:px-5 light:text-slate-500">{c.officialWeightPct.toFixed(1)}%</td>
                  <td className="text-mono-num px-4 py-2.5 tabular-nums text-white/70 sm:px-5 light:text-slate-600">{c.categoryInflationPct.toFixed(1)}%</td>
                  <td className="text-mono-num px-4 py-2.5 tabular-nums text-white light:text-slate-900">{c.yourContributionPct.toFixed(2)} pp</td>
                  <td className="text-mono-num px-4 py-2.5 tabular-nums text-white/70 sm:px-5 light:text-slate-600">Rs {Math.round(amount).toLocaleString("en-US")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
