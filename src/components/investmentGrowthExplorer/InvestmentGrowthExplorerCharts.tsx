"use client";

import dynamic from "next/dynamic";
import type { InvestmentGrowthResult } from "@/components/investmentGrowthExplorer/InvestmentGrowthExplorerResults";

const InvestmentGrowthExplorerChartsInner = dynamic(() => import("@/components/investmentGrowthExplorer/InvestmentGrowthExplorerChartsInner"), {
  ssr: false,
  loading: () => <div className="flex h-[260px] items-center justify-center text-sm text-white/30 light:text-slate-400">…</div>,
});

interface Props {
  results: InvestmentGrowthResult[];
  startingAmount: number;
  inflationPct: number;
  years: number;
}

export default function InvestmentGrowthExplorerCharts(props: Props) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <InvestmentGrowthExplorerChartsInner {...props} />
    </div>
  );
}
