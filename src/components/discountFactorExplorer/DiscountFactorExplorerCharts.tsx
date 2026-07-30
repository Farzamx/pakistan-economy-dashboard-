"use client";

import dynamic from "next/dynamic";
import type { DiscountSeriesPoint } from "@/lib/decisionSupportLab/timeValueEngine";

const DiscountFactorExplorerChartsInner = dynamic(() => import("@/components/discountFactorExplorer/DiscountFactorExplorerChartsInner"), {
  ssr: false,
  loading: () => <div className="flex h-[260px] items-center justify-center text-sm text-white/30 light:text-slate-400">…</div>,
});

interface Props {
  series: DiscountSeriesPoint[];
  selectedYears: number;
}

export default function DiscountFactorExplorerCharts({ series, selectedYears }: Props) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <DiscountFactorExplorerChartsInner series={series} selectedYears={selectedYears} />
    </div>
  );
}
