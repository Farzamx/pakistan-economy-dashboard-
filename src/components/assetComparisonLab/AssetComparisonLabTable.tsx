"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { ComparisonAssetRow } from "@/components/assetComparisonLab/AssetComparisonLabCalculator";
import type { AssetComparisonResult } from "@/lib/decisionSupportLab/investmentEngine";

interface Props {
  rows: ComparisonAssetRow[];
  results: AssetComparisonResult[];
  onNominalReturnChange: (id: string, value: number) => void;
}

export default function AssetComparisonLabTable({ rows, results, onNominalReturnChange }: Props) {
  const { t } = useLanguage();

  return (
    <div className="glass-card overflow-x-auto rounded-xl p-4 sm:p-5">
      <h2 className="mb-3 text-headline text-white light:text-slate-900">{t("assetComparisonLab.resultsTitle")}</h2>
      <table className="text-mono-num w-full min-w-[640px] text-sm tabular-nums">
        <thead>
          <tr className="text-left text-xs text-white/40 light:text-slate-400">
            <th className="py-1.5 pr-4 font-medium">{t("assetComparisonLab.rankColumn")}</th>
            <th className="py-1.5 pr-4 font-medium">{t("assetComparisonLab.assetColumn")}</th>
            <th className="py-1.5 pr-4 font-medium">{t("assetComparisonLab.nominalReturnColumn")}</th>
            <th className="py-1.5 pr-4 font-medium">{t("assetComparisonLab.realReturnColumn")}</th>
            <th className="py-1.5 pr-4 font-medium">{t("assetComparisonLab.riskColumn")}</th>
          </tr>
        </thead>
        <tbody>
          {[...results]
            .sort((a, b) => a.rank - b.rank)
            .map((result) => {
              const row = rows.find((r) => r.id === result.id);
              if (!row) return null;
              return (
                <tr key={result.id} className="border-t border-[var(--border-subtle)]">
                  <td className="py-2 pr-4 font-semibold text-neon-blue">#{result.rank}</td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-white light:text-slate-900">{row.name}</span>
                      <span className={`text-xs ${row.isEstimate ? "text-amber-400" : "text-emerald-400"}`}>
                        {row.isEstimate ? t("assetComparisonLab.manualInputNote") : t("assetComparisonLab.liveDataNote")}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    {row.isEstimate ? (
                      <div className="flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2 py-1.5">
                        <input
                          type="number"
                          inputMode="decimal"
                          step={0.1}
                          value={row.nominalReturnPct === 0 ? "" : row.nominalReturnPct}
                          placeholder="Enter return"
                          aria-label={`${row.name} nominal return`}
                          onChange={(e) => {
                            const parsed = parseFloat(e.target.value);
                            onNominalReturnChange(row.id, isNaN(parsed) ? 0 : parsed);
                          }}
                          className="w-16 bg-transparent text-sm font-semibold text-white outline-none light:text-slate-900"
                        />
                        <span className="text-xs text-white/40 light:text-slate-400">%</span>
                      </div>
                    ) : (
                      <span className="text-white light:text-slate-900">{row.nominalReturnPct.toFixed(1)}%</span>
                    )}
                  </td>
                  <td className={`py-2 pr-4 font-semibold ${result.realReturnPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {result.realReturnPct >= 0 ? "+" : ""}
                    {result.realReturnPct.toFixed(1)}%
                  </td>
                  <td className="py-2 pr-4 text-white/60 light:text-slate-500">{result.volatilityPct !== undefined && result.volatilityPct !== null ? `${result.volatilityPct.toFixed(1)}%` : "—"}</td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
