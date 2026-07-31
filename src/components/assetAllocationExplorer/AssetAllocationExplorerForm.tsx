"use client";

import { useLanguage } from "@/components/LanguageProvider";

export interface AllocationBucket {
  id: string;
  name: string;
  weightPct: number;
  nominalReturnPct: number;
  color: string;
}

interface Props {
  buckets: AllocationBucket[];
  onWeightChange: (id: string, value: number) => void;
}

export default function AssetAllocationExplorerForm({ buckets, onWeightChange }: Props) {
  const { t } = useLanguage();
  const totalWeight = buckets.reduce((sum, b) => sum + b.weightPct, 0);

  return (
    <div className="glass-card flex flex-col gap-5 rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-label text-white/40 light:text-slate-400">Allocation</span>
        <span className={`text-mono-num text-sm font-semibold tabular-nums ${Math.abs(totalWeight - 100) < 0.5 ? "text-emerald-400" : "text-amber-400"}`}>{totalWeight.toFixed(0)}%</span>
      </div>
      {buckets.map((bucket) => (
        <div key={bucket.id}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: bucket.color }} />
              <label htmlFor={`aae-${bucket.id}`} className="text-sm text-white/70 light:text-slate-600">
                {bucket.name}
              </label>
            </div>
            <span className="text-mono-num text-sm font-semibold tabular-nums text-white light:text-slate-900">{bucket.weightPct.toFixed(0)}%</span>
          </div>
          <input
            id={`aae-${bucket.id}`}
            type="range"
            min={0}
            max={100}
            step={1}
            value={bucket.weightPct}
            onChange={(e) => onWeightChange(bucket.id, parseFloat(e.target.value))}
            className="mt-2 w-full accent-[var(--neon-blue,#4d8df7)]"
          />
        </div>
      ))}
      <p className="text-xs text-white/35 light:text-slate-400">{t("assetComparisonLab.liveDataNote")}: {t("decisionSupportLab.assetGold")}, {t("decisionSupportLab.assetPib")}, {t("decisionSupportLab.assetPsxIndex")}.</p>
    </div>
  );
}
