"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { PortfolioAssetRow } from "@/components/portfolioPurchasingPower/PortfolioPurchasingPowerCalculator";
import type { PortfolioContribution } from "@/lib/decisionSupportLab/investmentEngine";

interface Props {
  rows: PortfolioAssetRow[];
  contributions: PortfolioContribution[];
  onWeightChange: (id: string, value: number) => void;
  onNominalReturnChange: (id: string, value: number) => void;
}

export default function PortfolioPurchasingPowerTable({ rows, contributions, onWeightChange, onNominalReturnChange }: Props) {
  const { t } = useLanguage();
  const totalWeight = rows.reduce((sum, r) => sum + r.weightPct, 0);
  const contributionById = new Map(contributions.map((c) => [c.assetId, c]));

  return (
    <div className="glass-card overflow-x-auto rounded-xl p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-headline text-white light:text-slate-900">{t("portfolioPurchasingPower.assetContributionTitle")}</h2>
        <span className={`text-mono-num text-sm font-semibold tabular-nums ${Math.abs(totalWeight - 100) < 0.5 ? "text-emerald-400" : "text-amber-400"}`}>{totalWeight.toFixed(0)}%</span>
      </div>
      <table className="text-mono-num w-full min-w-[560px] text-sm tabular-nums">
        <thead>
          <tr className="text-left text-xs text-white/40 light:text-slate-400">
            <th className="py-1.5 pr-4 font-medium">{t("assetComparisonLab.assetColumn")}</th>
            <th className="py-1.5 pr-4 font-medium">{t("portfolioPurchasingPower.allocationColumn")}</th>
            <th className="py-1.5 pr-4 font-medium">{t("portfolioPurchasingPower.returnColumn")}</th>
            <th className="py-1.5 font-medium">{t("portfolioPurchasingPower.contributionColumn")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const contribution = contributionById.get(row.id);
            return (
              <tr key={row.id} className="border-t border-[var(--border-subtle)]">
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                    <span className="font-semibold text-white light:text-slate-900">{row.name}</span>
                  </div>
                </td>
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2 py-1.5">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step={1}
                      value={row.weightPct === 0 ? "" : row.weightPct}
                      placeholder="0"
                      aria-label={`${row.name} allocation`}
                      onChange={(e) => {
                        const parsed = parseFloat(e.target.value);
                        onWeightChange(row.id, isNaN(parsed) ? 0 : Math.max(0, parsed));
                      }}
                      className="w-14 bg-transparent text-sm font-semibold text-white outline-none light:text-slate-900"
                    />
                    <span className="text-xs text-white/40 light:text-slate-400">%</span>
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
                        placeholder="0"
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
                <td className="py-2 text-white/70 light:text-slate-600">{contribution ? `${contribution.contributionPct.toFixed(1)}%` : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
