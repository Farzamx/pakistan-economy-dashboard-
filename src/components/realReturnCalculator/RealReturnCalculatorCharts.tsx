"use client";

import dynamic from "next/dynamic";
import type { ReturnSeriesPoint } from "@/lib/decisionSupportLab/investmentEngine";

const RealReturnCalculatorChartsInner = dynamic(() => import("@/components/realReturnCalculator/RealReturnCalculatorChartsInner"), {
  ssr: false,
  loading: () => <div className="flex h-[280px] items-center justify-center text-sm text-white/30 light:text-slate-400">…</div>,
});

interface Props {
  series: ReturnSeriesPoint[];
}

export default function RealReturnCalculatorCharts({ series }: Props) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <RealReturnCalculatorChartsInner series={series} />
    </div>
  );
}
