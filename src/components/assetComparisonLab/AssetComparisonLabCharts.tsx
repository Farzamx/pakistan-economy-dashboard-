"use client";

import dynamic from "next/dynamic";
import type { AssetComparisonResult } from "@/lib/decisionSupportLab/investmentEngine";

const AssetComparisonLabChartsInner = dynamic(() => import("@/components/assetComparisonLab/AssetComparisonLabChartsInner"), {
  ssr: false,
  loading: () => <div className="flex h-[300px] items-center justify-center text-sm text-white/30 light:text-slate-400">…</div>,
});

interface Props {
  results: AssetComparisonResult[];
}

export default function AssetComparisonLabCharts({ results }: Props) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <AssetComparisonLabChartsInner results={results} />
    </div>
  );
}
