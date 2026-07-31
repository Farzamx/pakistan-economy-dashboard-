"use client";

import dynamic from "next/dynamic";
import type { PortfolioContribution } from "@/lib/decisionSupportLab/investmentEngine";
import type { PortfolioAssetRow } from "@/components/portfolioPurchasingPower/PortfolioPurchasingPowerCalculator";

const PortfolioPurchasingPowerChartsInner = dynamic(() => import("@/components/portfolioPurchasingPower/PortfolioPurchasingPowerChartsInner"), {
  ssr: false,
  loading: () => <div className="flex h-[320px] items-center justify-center text-sm text-white/30 light:text-slate-400">…</div>,
});

interface Props {
  rows: PortfolioAssetRow[];
  contributions: PortfolioContribution[];
}

export default function PortfolioPurchasingPowerCharts(props: Props) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <PortfolioPurchasingPowerChartsInner {...props} />
    </div>
  );
}
