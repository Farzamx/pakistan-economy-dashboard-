"use client";

import { useLanguage } from "@/components/LanguageProvider";

interface Props {
  blendedReturnPct: number;
  blendedRealReturnPct: number;
  inflationProtectionScore: number;
  diversificationScore: number;
}

function ScoreTile({ label, value, tone }: { label: string; value: string; tone: "good" | "warning" | "poor" }) {
  const toneColor = tone === "good" ? "text-emerald-400" : tone === "warning" ? "text-amber-400" : "text-rose-400";
  return (
    <div className="glass-card-raised flex flex-col gap-1.5 rounded-xl p-4 sm:p-5">
      <span className="text-label text-white/40 light:text-slate-400">{label}</span>
      <span className={`text-metric text-mono-num tabular-nums ${toneColor}`}>{value}</span>
    </div>
  );
}

function scoreTone(score: number): "good" | "warning" | "poor" {
  if (score >= 70) return "good";
  if (score >= 40) return "warning";
  return "poor";
}

export default function AssetAllocationExplorerResults({ blendedReturnPct, blendedRealReturnPct, inflationProtectionScore, diversificationScore }: Props) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-headline text-white light:text-slate-900">{t("assetAllocationExplorer.resultsTitle")}</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card-raised flex flex-col gap-1.5 rounded-xl p-4 sm:p-5">
          <span className="text-label text-white/40 light:text-slate-400">{t("assetAllocationExplorer.blendedReturnLabel")}</span>
          <span className="text-metric text-mono-num tabular-nums text-white light:text-slate-900">{blendedReturnPct.toFixed(1)}%</span>
        </div>
        <div className="glass-card-raised flex flex-col gap-1.5 rounded-xl p-4 sm:p-5">
          <span className="text-label text-white/40 light:text-slate-400">{t("assetAllocationExplorer.blendedRealReturnLabel")}</span>
          <span className={`text-metric text-mono-num tabular-nums ${blendedRealReturnPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {blendedRealReturnPct >= 0 ? "+" : ""}
            {blendedRealReturnPct.toFixed(1)}%
          </span>
        </div>
        <ScoreTile label={t("assetAllocationExplorer.inflationProtectionLabel")} value={`${inflationProtectionScore.toFixed(0)}/100`} tone={scoreTone(inflationProtectionScore)} />
        <ScoreTile label={t("assetAllocationExplorer.diversificationScoreLabel")} value={`${diversificationScore.toFixed(0)}/100`} tone={scoreTone(diversificationScore)} />
      </div>
    </div>
  );
}
